import { describe, expect, it } from 'vitest'
import { formatCornerProgress } from './progress'

describe('formatCornerProgress', () => {
  it('shows book and chapter percent while scrolling', () => {
    expect(formatCornerProgress({ bookFraction: 0.42, chapterFraction: 0.18, page: 1, pages: 1, scrolled: true })).toEqual({
      primary: '42%',
      secondary: '18% chapter',
    })
  })

  it('shows chapter pages in paginated mode', () => {
    expect(formatCornerProgress({ bookFraction: 0.5, chapterFraction: 0.25, page: 3, pages: 12, scrolled: false })).toEqual({
      primary: '3 / 12',
      secondary: '50%',
    })
  })
})
