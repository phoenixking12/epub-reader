import { describe, expect, it } from 'vitest'
import { duplicateMarkIds, markTargetId, shouldRemoveColor, shouldRemoveMark } from './toggleMark'

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

describe('markTargetId', () => {
  const annotations = [
    { id: 'old', cfiRange: 'cfi-1', createdAt: 1 },
    { id: 'new', cfiRange: 'cfi-1', createdAt: 2 },
  ]

  it('keeps updating the mark created by the previous swatch', () => {
    expect(
      markTargetId({ pendingId: 'old', selectedId: undefined, cfi: 'cfi-1', annotations: [] }),
    ).toBe('old')
  })

  it('uses the open annotation before creating another one', () => {
    expect(markTargetId({ selectedId: 'new', cfi: 'cfi-1', annotations })).toBe('new')
    expect(duplicateMarkIds('new', 'cfi-1', annotations)).toEqual(['old'])
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
