import { describe, expect, it } from 'vitest'
import { isElement, isHtmlElement, isHtmlImage } from './crossRealm'

describe('cross-realm DOM checks', () => {
  it('accepts a same-document element', () => {
    const el = document.createElement('p')
    expect(isElement(el)).toBe(true)
    expect(isHtmlElement(el)).toBe(true)
    expect(isHtmlImage(el)).toBe(false)
  })

  it('accepts an iframe-like node that fails instanceof', () => {
    const fake = {
      nodeType: 1,
      tagName: 'P',
      style: {},
      closest() {
        return this
      },
    }
    expect(fake instanceof Element).toBe(false)
    expect(isElement(fake)).toBe(true)
    expect(isHtmlElement(fake)).toBe(true)
    expect(isHtmlImage(fake)).toBe(false)
  })

  it('recognizes images by tag name', () => {
    const fake = { nodeType: 1, tagName: 'IMG', style: {} }
    expect(isHtmlImage(fake)).toBe(true)
  })

  it('rejects text nodes and null', () => {
    expect(isElement(null)).toBe(false)
    expect(isElement(document.createTextNode('x'))).toBe(false)
  })
})
