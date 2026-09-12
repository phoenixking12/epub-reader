import { describe, expect, it } from 'vitest'
import { bookReadFraction, chapterReadFraction, formatCornerProgress, quoteLooksLike } from './progress'

describe('formatCornerProgress', () => {
  it('shows book and chapter percent while scrolling', () => {
    expect(formatCornerProgress({ bookFraction: 0.42, chapterFraction: 0.18, page: 1, pages: 1, scrolled: true })).toEqual({
      primary: '42%',
      secondary: '18%',
    })
  })

  it('shows chapter pages in paginated mode', () => {
    expect(formatCornerProgress({ bookFraction: 0.5, chapterFraction: 0.25, page: 3, pages: 12, scrolled: false })).toEqual({
      primary: '3 / 12',
      secondary: '50%',
    })
  })
})

describe('chapterReadFraction', () => {
  it('is 0 at the start of a long chapter', () => {
    expect(chapterReadFraction(0, 4000, 800)).toBe(0)
  })

  it('is 1 when the last screen is showing', () => {
    expect(chapterReadFraction(3200, 4000, 800)).toBe(1)
  })

  it('is 1 when the chapter fits on one screen', () => {
    expect(chapterReadFraction(0, 400, 800)).toBe(1)
  })
})

describe('bookReadFraction', () => {
  it('walks the current section instead of jumping to the next chapter mark', () => {
    expect(bookReadFraction([0, 0.4, 1], 0, 0.5)).toBeCloseTo(0.2)
    expect(bookReadFraction([0, 0.4, 1], 1, 0.25)).toBeCloseTo(0.55)
  })
})

describe('quoteLooksLike', () => {
  it('matches a paragraph to its saved bookmark quote', () => {
    expect(quoteLooksLike('The galaxy is in flames. The Emperor’s vision.', 'The galaxy is in flames. The Emperor’s vision.')).toBe(true)
    expect(quoteLooksLike('Unrelated paragraph.', 'The galaxy is in flames.')).toBe(false)
  })
})
