import { describe, expect, it } from 'vitest'
import { annotationWrapFromPoint, annotationWrapFromRange } from './annHit'

function textRange(el: HTMLElement, from: number, to: number) {
  const node = el.firstChild as Text
  const range = el.ownerDocument.createRange()
  range.setStart(node, from)
  range.setEnd(node, to)
  return range
}

describe('annotation wrap hit testing', () => {
  it('finds a font-color span from a caret inside it', () => {
    const p = document.createElement('p')
    p.innerHTML = 'Hello <span data-lg-ann="a1" data-lg-kind="textColor">fleet</span> now'
    document.body.append(p)
    const span = p.querySelector('[data-lg-ann]') as HTMLElement
    const range = textRange(span, 0, 5)
    expect(annotationWrapFromRange(range)?.dataset.lgAnn).toBe('a1')
    p.remove()
  })

  it('finds the span when the common ancestor is the paragraph', () => {
    const p = document.createElement('p')
    p.innerHTML = 'Hello <span data-lg-ann="a1">fleet</span> now'
    document.body.append(p)
    const range = document.createRange()
    range.setStart(p.firstChild as Text, 0)
    range.setEnd((p.querySelector('[data-lg-ann]') as HTMLElement).firstChild as Text, 5)
    expect(annotationWrapFromRange(range)?.dataset.lgAnn).toBe('a1')
    p.remove()
  })

  it('hits a color span by its glyph box', () => {
    const p = document.createElement('p')
    p.innerHTML = '<span data-lg-ann="fg">word</span>'
    document.body.append(p)
    const span = p.querySelector('[data-lg-ann]') as HTMLElement
    Object.defineProperty(span, 'getClientRects', {
      value: () => [{ left: 10, right: 40, top: 10, bottom: 24 }],
    })
    const hit = annotationWrapFromPoint(document, 12, 12)
    expect(hit?.dataset.lgAnn).toBe('fg')
    p.remove()
  })
})
