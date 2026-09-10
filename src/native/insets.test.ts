import { describe, expect, it } from 'vitest'
import { cssPxFromDevicePixels } from './insets'

describe('cssPxFromDevicePixels', () => {
  it('converts a 24dp status bar on a 3x phone to 24 CSS px, not 72', () => {
    expect(cssPxFromDevicePixels(72, 3)).toBe(24)
  })

  it('converts a 48dp nav bar on a 2.75x phone to CSS px', () => {
    expect(cssPxFromDevicePixels(132, 2.75)).toBeCloseTo(48, 5)
  })

  it('falls back when devicePixelRatio is missing', () => {
    expect(cssPxFromDevicePixels(24, 0)).toBe(24)
  })
})
