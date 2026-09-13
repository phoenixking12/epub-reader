import { describe, expect, it } from 'vitest'
import { shouldHorizontalTurn, turnDirection } from './pageTurn'

describe('shouldHorizontalTurn', () => {
  it('turns the page on a clear sideways flick', () => {
    expect(shouldHorizontalTurn(-90, 8)).toBe(true)
    expect(turnDirection(-90)).toBe('next')
    expect(shouldHorizontalTurn(90, -6)).toBe(true)
    expect(turnDirection(90)).toBe('prev')
  })

  it('does not turn from a fast vertical scroll with a little sideways drift', () => {
    expect(shouldHorizontalTurn(-40, 180)).toBe(false)
    expect(shouldHorizontalTurn(-90, 80, { farthestDy: 140 })).toBe(false)
    expect(shouldHorizontalTurn(-100, 20, { scrolled: true, farthestDy: 90 })).toBe(false)
  })

  it('needs a flatter swipe to change chapter while scrolling', () => {
    expect(shouldHorizontalTurn(-100, 10, { scrolled: true })).toBe(true)
    expect(shouldHorizontalTurn(-70, 10, { scrolled: true })).toBe(false)
  })
})
