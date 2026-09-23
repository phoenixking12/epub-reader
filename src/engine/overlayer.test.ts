import { describe, expect, it } from 'vitest'
import { Overlayer } from 'foliate-js/overlayer.js'

const rects = [
  { left: 4, top: 8, right: 40, bottom: 24, width: 36, height: 16 },
] as unknown as DOMRectList

function pointers(el: Element) {
  return [el, ...el.querySelectorAll('*')].map((node) => node.getAttribute('pointer-events'))
}

describe('Overlayer marks', () => {
  it('does not capture touches on highlight, underline, or font-color rects', () => {
    for (const draw of [Overlayer.highlight, Overlayer.underline, Overlayer.strikethrough, Overlayer.squiggly]) {
      const el = draw(rects, { color: '#facc15' })
      expect(pointers(el).every((value) => value === 'none')).toBe(true)
    }
  })
})
