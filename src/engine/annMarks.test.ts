import { describe, expect, it } from 'vitest'
import { needsInlineMark, textPiecesInRange, unwrapAnnotation, wrapRange } from './annMarks'

describe('annMarks', () => {
  it('wraps font color, bold, and italic on a text range', () => {
    const doc = document.implementation.createHTMLDocument()
    doc.body.innerHTML = '<p>Paint this heading red.</p>'
    const p = doc.querySelector('p')!
    const text = p.firstChild as Text
    const range = doc.createRange()
    range.setStart(text, 6)
    range.setEnd(text, 10)
    wrapRange(range, { id: 'a1', style: 'textColor', color: '#dc2626' })
    const mark = doc.querySelector('span.lg-ann') as HTMLElement
    expect(mark.textContent).toBe('this')
    expect(mark.style.color).toBe('rgb(220, 38, 38)')
    expect(mark.dataset.annStyle).toBe('textColor')
  })

  it('unwraps a mark back to plain text', () => {
    const doc = document.implementation.createHTMLDocument()
    doc.body.innerHTML = '<p>Hello world</p>'
    const text = doc.querySelector('p')!.firstChild as Text
    const range = doc.createRange()
    range.setStart(text, 0)
    range.setEnd(text, 5)
    wrapRange(range, { id: 'b1', style: 'bold', color: '#000' })
    expect(doc.querySelectorAll('span.lg-ann')).toHaveLength(1)
    unwrapAnnotation(doc, 'b1')
    expect(doc.querySelectorAll('span.lg-ann')).toHaveLength(0)
    expect(doc.body.textContent).toBe('Hello world')
  })

  it('splits a range that spans two text nodes', () => {
    const doc = document.implementation.createHTMLDocument()
    doc.body.innerHTML = '<p>One <em>two</em> three</p>'
    const p = doc.querySelector('p')!
    const range = doc.createRange()
    range.setStart(p.firstChild as Text, 2)
    range.setEnd(p.lastChild as Text, 4)
    const pieces = textPiecesInRange(range)
    expect(pieces.map((p) => p.node.nodeValue?.slice(p.start, p.end)).join('')).toBe('e two thr')
  })

  it('only inline-marks color, bold, and italic', () => {
    expect(needsInlineMark('textColor')).toBe(true)
    expect(needsInlineMark('highlight')).toBe(false)
    expect(needsInlineMark('underline')).toBe(false)
  })
})
