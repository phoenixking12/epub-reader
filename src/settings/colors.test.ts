import { describe, expect, it } from 'vitest'
import { rememberCustomColor } from './colors'

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

  it('caps the list at twelve', () => {
    const list = Array.from({ length: 12 }, (_, i) => `#${i.toString(16).padStart(6, '0')}`)
    const next = rememberCustomColor(list, '#fedcba')
    expect(next).toHaveLength(12)
    expect(next[0]).toBe('#fedcba')
    expect(next).not.toContain('#00000b')
  })
})
