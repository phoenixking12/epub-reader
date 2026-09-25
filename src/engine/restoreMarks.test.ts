import { describe, expect, it } from 'vitest'
import * as CFI from 'foliate-js/epubcfi.js'
import type { AnnotationRecord } from '../types/models'
import { cfiIgnoreNode, rangeFromCfi } from './cfiIgnore'
import { rangeForQuote, restoreChapterMarks } from './restoreMarks'

function rec(patch: Partial<AnnotationRecord> = {}): AnnotationRecord {
  return {
    id: 'mark-1',
    bookId: 'book',
    cfiRange: 'epubcfi(/6/4!/99/2,/1:0,/1:4)',
    quote: 'fleet',
    style: 'textColor',
    color: '#facc15',
    note: '',
    createdAt: 1,
    ...patch,
  }
}

describe('rangeForQuote', () => {
  it('finds a phrase that crosses an inline element', () => {
    const doc = document.implementation.createHTMLDocument('t')
    doc.body.innerHTML = '<p>Hello <em>brave</em> fleet</p>'
    const range = rangeForQuote(doc, 'brave fleet')
    expect(range?.toString()).toBe('brave fleet')
  })

  it('matches a quote when the chapter breaks the line', () => {
    const doc = document.implementation.createHTMLDocument('t')
    doc.body.innerHTML = '<p>Hello\nworld</p>'
    const range = rangeForQuote(doc, 'Hello world')
    expect(range?.toString().replace(/\s+/g, ' ')).toBe('Hello world')
  })
})

describe('restoreChapterMarks', () => {
  it('paints a font color from the quote when the saved CFI no longer resolves', () => {
    const doc = document.implementation.createHTMLDocument('t')
    doc.body.innerHTML = '<p>The fleet sailed at dawn.</p>'
    restoreChapterMarks(doc, 3, [rec()], () => 3)
    const span = doc.querySelector('[data-lg-ann]') as HTMLElement
    expect(span?.textContent).toBe('fleet')
    expect(span?.dataset.lgKind).toBe('textColor')
    expect(span?.style.getPropertyValue('--lg-mark-color')).toBe('#facc15')
    expect(span?.style.getPropertyPriority('color')).toBe('important')
  })

  it('draws a highlight from the stored quote when the position no longer matches', () => {
    const doc = document.implementation.createHTMLDocument('t')
    doc.body.innerHTML = '<p>The fleet sailed at dawn.</p>'
    const painted: string[] = []
    restoreChapterMarks(
      doc,
      2,
      [rec({ style: 'highlight', sectionIndex: 2, cfiRange: 'epubcfi(/6/4!/99)' })],
      () => null,
      (mark, range) => painted.push(`${mark.style}:${range.toString()}`),
    )
    expect(painted).toEqual(['highlight:fleet'])
    expect(doc.querySelector('[data-lg-ann]')).toBeNull()
  })

  it('keeps a mark on the chapter where it was saved', () => {
    const doc = document.implementation.createHTMLDocument('t')
    doc.body.innerHTML = '<p>The fleet sailed at dawn.</p>'
    restoreChapterMarks(doc, 4, [rec({ sectionIndex: 2 })], () => 4)
    expect(doc.querySelector('[data-lg-ann]')).toBeNull()
  })

  it('replaces a wrapper that no longer covers the saved words', () => {
    const doc = document.implementation.createHTMLDocument('t')
    doc.body.innerHTML = '<p>The fleet sailed at <span data-lg-ann="mark-1" data-lg-kind="textColor">dawn</span>.</p>'
    restoreChapterMarks(doc, 2, [rec({ sectionIndex: 2, quote: 'fleet' })], () => null)
    const spans = [...doc.querySelectorAll('[data-lg-ann]')]
    expect(spans).toHaveLength(1)
    expect(spans[0]?.textContent).toBe('fleet')
  })

  it('does not paint a mark that belongs to another chapter', () => {
    const doc = document.implementation.createHTMLDocument('t')
    doc.body.innerHTML = '<p>The fleet sailed at dawn.</p>'
    restoreChapterMarks(doc, 3, [rec()], () => 1)
    expect(doc.querySelector('[data-lg-ann]')).toBeNull()
  })

  it('paints the saved CFI on a clean chapter document', () => {
    const source = document.implementation.createHTMLDocument('t')
    source.body.innerHTML = '<p id="p">Hello world</p>'
    const text = source.getElementById('p')!.firstChild!
    const picked = source.createRange()
    picked.setStart(text, 6)
    picked.setEnd(text, 11)
    const cfi = CFI.joinIndir('epubcfi(/6/4)', CFI.fromRange(picked, cfiIgnoreNode))

    const clean = document.implementation.createHTMLDocument('t')
    clean.body.innerHTML = '<p id="p">Hello world</p>'
    restoreChapterMarks(clean, 1, [rec({ cfiRange: cfi, quote: 'world', color: '#86efac' })], () => 1)
    const span = clean.querySelector('[data-lg-ann]') as HTMLElement
    expect(span?.textContent).toBe('world')
    expect(span?.style.getPropertyValue('--lg-mark-color')).toBe('#86efac')
    expect(rangeFromCfi(clean, cfi).toString()).toBe('world')
  })
})
