import { describe, expect, it } from 'vitest'
import { formatAuthors, formatLanguageMap, formatTitle } from './metadata'

describe('metadata helpers', () => {
  it('reads language maps', () => {
    expect(formatLanguageMap({ en: 'Hello', ja: 'こんにちは' })).toBe('Hello')
    expect(formatLanguageMap('Plain')).toBe('Plain')
  })

  it('formats authors arrays and objects', () => {
    expect(formatAuthors(['A', 'B'])).toEqual(['A', 'B'])
    expect(formatAuthors({ name: { en: 'Ada Lovelace' } })).toEqual(['Ada Lovelace'])
  })

  it('falls back to untitled', () => {
    expect(formatTitle(undefined)).toBe('Untitled book')
  })
})
