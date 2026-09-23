import { describe, expect, it } from 'vitest'
import type { AnnotationRecord } from '../types/models'
import { applyInlineMark } from './inlineMark'

function rec(patch: Partial<AnnotationRecord> = {}): AnnotationRecord {
  return {
    id: 'mark-1',
    bookId: 'book',
    cfiRange: 'epubcfi(/6/4!/2/4,/1:0,/1:5)',
    quote: 'Hello',
    style: 'textColor',
    color: '#facc15',
    note: '',
    createdAt: 1,
    ...patch,
  }
}

function markColor(el: HTMLElement) {
  return el.style.getPropertyValue('--lg-mark-color')
}

describe('applyInlineMark', () => {
  it('replaces the font color when the same letters are colored again', () => {
    const doc = document.implementation.createHTMLDocument('t')
    doc.body.innerHTML = '<p id="p">Hello world</p>'
    const p = doc.getElementById('p')!
    const range = doc.createRange()
    range.setStart(p.firstChild!, 0)
    range.setEnd(p.firstChild!, 5)

    applyInlineMark(doc, range, rec({ color: '#facc15' }))
    applyInlineMark(doc, range, rec({ color: '#86efac' }))

    const spans = [...p.querySelectorAll<HTMLElement>('[data-lg-ann]')]
    expect(spans).toHaveLength(1)
    expect(spans[0]!.dataset.lgKind).toBe('textColor')
    expect(markColor(spans[0]!)).toBe('#86efac')
    expect(spans[0]!.style.getPropertyPriority('color')).toBe('important')
    expect(spans[0]!.textContent).toBe('Hello')
  })

  it('updates an inner colored element instead of leaving the first color on top', () => {
    const doc = document.implementation.createHTMLDocument('t')
    doc.body.innerHTML = '<p id="p"><em style="color:#111111">Hello</em> world</p>'
    const em = doc.querySelector('em')!
    const range = doc.createRange()
    range.selectNode(em)

    applyInlineMark(doc, range, rec({ color: '#facc15' }))
    applyInlineMark(doc, range, rec({ color: '#7dd3fc' }))

    const spans = [...doc.querySelectorAll<HTMLElement>('[data-lg-kind="textColor"]')]
    expect(spans).toHaveLength(1)
    expect(markColor(spans[0]!)).toBe('#7dd3fc')
    expect(em.style.getPropertyValue('-webkit-text-fill-color')).not.toBe('#111111')
    expect(em.style.getPropertyPriority('color')).toBe('important')
  })

  it('restyles an older font-color wrapper instead of nesting a second one', () => {
    const doc = document.implementation.createHTMLDocument('t')
    doc.body.innerHTML = '<p id="p">Hello world</p>'
    const p = doc.getElementById('p')!
    const range = doc.createRange()
    range.setStart(p.firstChild!, 0)
    range.setEnd(p.firstChild!, 5)
    applyInlineMark(doc, range, rec({ id: 'old', color: '#facc15' }))

    const again = doc.createRange()
    again.selectNodeContents(p.querySelector('[data-lg-ann]')!)
    applyInlineMark(doc, again, rec({ id: 'new', color: '#f9a8d4' }))

    const spans = [...p.querySelectorAll<HTMLElement>('[data-lg-ann]')]
    expect(spans).toHaveLength(1)
    expect(spans[0]!.dataset.lgAnn).toBe('new')
    expect(markColor(spans[0]!)).toBe('#f9a8d4')
  })
})
