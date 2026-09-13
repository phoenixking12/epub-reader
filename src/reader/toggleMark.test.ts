import { describe, expect, it } from 'vitest'
import { shouldRemoveMark } from './toggleMark'

describe('shouldRemoveMark', () => {
  it('clears the same style on a second tap', () => {
    expect(shouldRemoveMark(true, 'highlight', 'highlight')).toBe(true)
    expect(shouldRemoveMark(true, 'italic', 'italic')).toBe(true)
    expect(shouldRemoveMark(true, 'bold', 'bold')).toBe(true)
  })

  it('replaces a different style instead of removing', () => {
    expect(shouldRemoveMark(true, 'highlight', 'italic')).toBe(false)
    expect(shouldRemoveMark(false, 'highlight', 'highlight')).toBe(false)
  })
})
