import { describe, expect, it } from 'vitest'
import * as CFI from 'foliate-js/epubcfi.js'
import { cfiIgnoreNode } from './cfiIgnore'

describe('cfiIgnoreNode', () => {
  it('round-trips a CFI through an annotation wrapper', () => {
    const doc = document.implementation.createHTMLDocument('t')
    doc.body.innerHTML = '<p id="p">Hello world</p>'
    const p = doc.getElementById('p')!
    const before = doc.createRange()
    before.setStart(p.firstChild!, 0)
    before.setEnd(p.firstChild!, 5)
    const cfi = CFI.fromRange(before, cfiIgnoreNode)

    const span = doc.createElement('span')
    span.dataset.lgAnn = 'abc'
    span.textContent = 'Hello'
    p.firstChild!.parentNode!.replaceChild(span, p.firstChild!)
    const rest = doc.createTextNode(' world')
    p.append(rest)

    const parsed = CFI.parse(cfi)
    const restored = CFI.toRange(doc, parsed, cfiIgnoreNode)
    expect(restored.toString()).toBe('Hello')
  })

  it('ignores paragraph bookmark buttons', () => {
    const doc = document.implementation.createHTMLDocument('t')
    doc.body.innerHTML = '<p id="p">Marked line</p>'
    const p = doc.getElementById('p')!
    const text = p.firstChild!
    const before = doc.createRange()
    before.setStart(text, 0)
    before.setEnd(text, text.textContent!.length)
    const cfi = CFI.fromRange(before, cfiIgnoreNode)

    const btn = doc.createElement('button')
    btn.className = 'lg-pmark'
    p.prepend(btn)

    const restored = CFI.toRange(doc, CFI.parse(cfi), cfiIgnoreNode)
    expect(restored.toString()).toContain('Marked line')
  })
})
