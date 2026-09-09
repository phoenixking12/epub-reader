import { describe, expect, it } from 'vitest'
import { isHugeNativeSelection, wordBounds, wordRangeFromCaret, wordRangeFromHit, nearestBookmarkBlock } from './selectWord'

describe('wordBounds', () => {
  it('selects the word under the caret', () => {
    expect(wordBounds('Hello world', 1)).toEqual({ start: 0, end: 5 })
    expect(wordBounds('Hello world', 7)).toEqual({ start: 6, end: 11 })
  })

  it('does not expand from punctuation to the whole sentence', () => {
    expect(wordBounds('Hello, world.', 5)).toEqual({ start: 0, end: 5 })
    expect(wordBounds('Hello, world.', 6)).toEqual({ start: 7, end: 12 })
  })

  it('stays on a single word when the caret is at the end', () => {
    expect(wordBounds('page', 4)).toEqual({ start: 0, end: 4 })
  })
})

describe('wordRangeFromCaret', () => {
  it('builds a range for one word inside a paragraph', () => {
    const doc = document.implementation.createHTMLDocument('t')
    doc.body.innerHTML = '<p>The quick brown fox</p>'
    const text = doc.querySelector('p')!.firstChild as Text
    const caret = doc.createRange()
    caret.setStart(text, 6)
    caret.collapse(true)
    const range = wordRangeFromCaret(caret)
    expect(range?.toString()).toBe('quick')
  })

  it('ignores a caret on the body so a long-press cannot select the page', () => {
    const doc = document.implementation.createHTMLDocument('t')
    doc.body.innerHTML = '<p>One paragraph.</p><p>Another paragraph.</p>'
    const caret = doc.createRange()
    caret.setStart(doc.body, 0)
    caret.collapse(true)
    expect(wordRangeFromCaret(caret)).toBeNull()
  })

  it('falls back to the paragraph under the finger when the caret is on the body', () => {
    const doc = document.implementation.createHTMLDocument('t')
    doc.body.innerHTML = '<p>Hello world</p>'
    const p = doc.querySelector('p')!
    const caret = doc.createRange()
    caret.setStart(doc.body, 0)
    caret.collapse(true)
    expect(wordRangeFromHit(caret, p)?.toString()).toBe('Hello')
  })
})

describe('nearestBookmarkBlock', () => {
  it('finds a paragraph from a nested span', () => {
    const doc = document.implementation.createHTMLDocument('t')
    doc.body.innerHTML = '<p><span>The river widened</span></p>'
    const span = doc.querySelector('span')!
    expect(nearestBookmarkBlock(span)?.tagName).toBe('P')
  })

  it('finds a div that holds the paragraph text when there is no p', () => {
    const doc = document.implementation.createHTMLDocument('t')
    doc.body.innerHTML = '<div class="text">The river widened and the road followed it.</div>'
    const div = doc.querySelector('div')!
    expect(nearestBookmarkBlock(div)?.textContent).toMatch(/river widened/)
  })
})

describe('isHugeNativeSelection', () => {
  it('treats a whole-page dump as native overshoot', () => {
    const page = Array.from({ length: 40 }, (_, i) => `Paragraph ${i} of filler text.`).join('\n')
    expect(isHugeNativeSelection(page, 5)).toBe(true)
  })

  it('keeps a normal multi-word drag', () => {
    expect(isHugeNativeSelection('quick brown fox', 5)).toBe(false)
  })
})
