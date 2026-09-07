import { describe, expect, it } from 'vitest'
import { compileSearchPattern, excerptAround, findRegexInText } from '../search/regex'

describe('search', () => {
  it('escapes literal queries', () => {
    const re = compileSearchPattern('a+b', false)
    expect(re.test('a+b')).toBe(true)
    expect(re.test('ab')).toBe(false)
  })

  it('compiles regular expressions', () => {
    const re = compileSearchPattern('wh[io]ch', true)
    expect(findRegexInText('which and whoch', re).map((h) => h.match)).toEqual(['which', 'whoch'])
  })

  it('builds excerpts', () => {
    const ex = excerptAround('alpha bravo charlie', 6, 11, 4)
    expect(ex.match).toBe('bravo')
    expect(ex.pre.endsWith('a ')).toBe(true)
  })
})
