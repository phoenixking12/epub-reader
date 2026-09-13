import { describe, expect, it } from 'vitest'
import { shouldRemoveColor, shouldRemoveMark } from './toggleMark'

describe('shouldRemoveMark', () => {
  it('clears the same style on a second tap', () => {
    expect(shouldRemoveMark(true, 'highlight', 'highlight')).toBe(true)
    expect(shouldRemoveMark(true, 'italic', 'italic')).toBe(true)
    expect(shouldRemoveMark(true, 'bold', 'bold')).toBe(true)
    expect(shouldRemoveMark(true, 'textColor', 'textColor')).toBe(true)
  })

  it('replaces a different style instead of removing', () => {
    expect(shouldRemoveMark(true, 'highlight', 'italic')).toBe(false)
    expect(shouldRemoveMark(false, 'highlight', 'highlight')).toBe(false)
  })
})

describe('shouldRemoveColor', () => {
  it('clears font color when the same swatch is tapped again', () => {
    expect(shouldRemoveColor(true, 'textColor', '#facc15', '#FACC15')).toBe(true)
    expect(shouldRemoveColor(true, 'textColor', '#facc15', '#86efac')).toBe(false)
    expect(shouldRemoveColor(true, 'highlight', '#facc15', '#facc15')).toBe(false)
    expect(shouldRemoveColor(false, 'textColor', '#facc15', '#facc15')).toBe(false)
  })
})
