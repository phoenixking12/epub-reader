import { describe, expect, it } from 'vitest'
import { rememberCustomColor } from './colors'
import { colorForStyle } from './defaults'

describe('rememberCustomColor', () => {
  it('prepends a wheel color and keeps the newest first', () => {
    expect(rememberCustomColor(['#112233'], '#aabbcc')).toEqual(['#aabbcc', '#112233'])
  })

  it('moves a repeated color to the front', () => {
    expect(rememberCustomColor(['#112233', '#aabbcc'], '#AABBCC')).toEqual(['#aabbcc', '#112233'])
  })

  it('ignores bundled preset swatches', () => {
    expect(rememberCustomColor([], '#facc15')).toEqual([])
    expect(rememberCustomColor([], '#b91c1c')).toEqual([])
  })

  it('caps the list at twelve', () => {
    const list = Array.from({ length: 12 }, (_, i) => `#${i.toString(16).padStart(6, '0')}`)
    const next = rememberCustomColor(list, '#fedcba')
    expect(next).toHaveLength(12)
    expect(next[0]).toBe('#fedcba')
    expect(next).not.toContain('#00000b')
  })
})

describe('colorForStyle', () => {
  it('swaps pastel highlight ink for a readable font color', () => {
    expect(colorForStyle('textColor', '#facc15')).toBe('#b91c1c')
    expect(colorForStyle('highlight', '#facc15')).toBe('#facc15')
    expect(colorForStyle('textColor', '#1d4ed8')).toBe('#1d4ed8')
  })
})
