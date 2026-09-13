import { describe, expect, it } from 'vitest'
import { shouldSwipeClose } from './swipeClose'

describe('shouldSwipeClose', () => {
  it('closes a sheet on a downward flick from the top', () => {
    expect(shouldSwipeClose(4, 90, 0, 'sheet')).toBe(true)
    expect(shouldSwipeClose(4, 90, 40, 'sheet')).toBe(false)
    expect(shouldSwipeClose(80, 90, 0, 'sheet')).toBe(false)
  })

  it('closes a drawer when flicked left or down', () => {
    expect(shouldSwipeClose(-80, 10, 0, 'drawer')).toBe(true)
    expect(shouldSwipeClose(4, 90, 0, 'drawer')).toBe(true)
    expect(shouldSwipeClose(80, 10, 0, 'drawer')).toBe(false)
  })
})
