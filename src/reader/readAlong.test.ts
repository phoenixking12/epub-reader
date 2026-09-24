import { describe, expect, it } from 'vitest'
import { matchAudiobook } from './readAlong'

describe('matchAudiobook', () => {
  const shelf = [
    { id: 'a', title: 'The Left Hand of Darkness' },
    { id: 'b', title: 'Another Tale' },
  ]

  it('pairs a book with the audiobook of the same title', () => {
    expect(matchAudiobook('The Left Hand of Darkness', shelf)?.id).toBe('a')
    expect(matchAudiobook('the left hand of darkness', shelf)?.id).toBe('a')
  })

  it('pairs a shorter title that is contained in the audiobook name', () => {
    expect(matchAudiobook('Left Hand of Darkness', shelf)?.id).toBe('a')
  })

  it('returns nothing when no audiobook matches', () => {
    expect(matchAudiobook('Unrelated', shelf)).toBeNull()
  })
})
