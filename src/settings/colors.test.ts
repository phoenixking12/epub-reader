import { describe, expect, it } from 'vitest'
import { hexToHsv, hexToRgb, hsvToHex, rememberCustomColor, rgbToHex } from './colors'

describe('rememberCustomColor', () => {
  it('prepends a wheel color and keeps the newest first', () => {
    expect(rememberCustomColor(['#112233'], '#aabbcc')).toEqual(['#aabbcc', '#112233'])
  })

  it('moves a repeated color to the front', () => {
    expect(rememberCustomColor(['#112233', '#aabbcc'], '#AABBCC')).toEqual(['#aabbcc', '#112233'])
  })

  it('ignores bundled preset swatches', () => {
    expect(rememberCustomColor([], '#facc15')).toEqual([])
  })

  it('turns RGB into hex and back', () => {
    expect(rgbToHex(250, 204, 21)).toBe('#facc15')
    expect(hexToRgb('#facc15')).toEqual({ r: 250, g: 204, b: 21 })
    expect(hexToRgb('#abc')).toEqual({ r: 170, g: 187, b: 204 })
    expect(hexToRgb('nope')).toBeNull()
  })

  it('keeps full red, green, and blue on the wheel and darkens with intensity', () => {
    expect(hsvToHex(0, 1, 1)).toBe('#ff0000')
    expect(hsvToHex(120, 1, 1)).toBe('#00ff00')
    expect(hsvToHex(240, 1, 1)).toBe('#0000ff')
    expect(hsvToHex(0, 1, 0.5)).toBe('#800000')
    expect(hexToHsv('#ff0000')).toMatchObject({ h: 0, s: 1, v: 1 })
    expect(hexToHsv('#000000')).toMatchObject({ s: 0, v: 0 })
  })

  it('caps the list at twelve', () => {
    const list = Array.from({ length: 12 }, (_, i) => `#${i.toString(16).padStart(6, '0')}`)
    const next = rememberCustomColor(list, '#fedcba')
    expect(next).toHaveLength(12)
    expect(next[0]).toBe('#fedcba')
    expect(next).not.toContain('#00000b')
  })
})
