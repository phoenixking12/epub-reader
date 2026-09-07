import { describe, expect, it } from 'vitest'
import * as CFI from 'foliate-js/epubcfi.js'

describe('epubcfi', () => {
  it('round-trips a simple range CFI wrapper', () => {
    const cfi = 'epubcfi(/6/4[chap]!/4/2/1:1)'
    expect(CFI.isCFI.test(cfi)).toBe(true)
    const parsed = CFI.parse(cfi)
    expect(parsed).toBeTruthy()
  })

  it('compares CFI positions', () => {
    const a = 'epubcfi(/6/4!/4/2/1:1)'
    const b = 'epubcfi(/6/4!/4/2/1:8)'
    expect(CFI.compare(a, b)).toBeLessThan(0)
    expect(CFI.compare(b, a)).toBeGreaterThan(0)
  })

  it('builds a range from a live DOM', () => {
    const doc = document.implementation.createHTMLDocument('t')
    doc.body.innerHTML = '<p id="p">Hello world</p>'
    const p = doc.getElementById('p')!
    const range = doc.createRange()
    range.setStart(p.firstChild!, 0)
    range.setEnd(p.firstChild!, 5)
    const cfi = CFI.fromRange(range)
    expect(typeof cfi).toBe('string')
    expect(cfi.length).toBeGreaterThan(3)
  })
})
