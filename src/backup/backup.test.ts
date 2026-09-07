import { describe, expect, it } from 'vitest'
import { isBackupPayload } from './backup'

describe('backup payload', () => {
  it('accepts version 1 snapshots', () => {
    expect(
      isBackupPayload({
        version: 1,
        exportedAt: 1,
        books: [],
        bookmarks: [],
        annotations: [],
        display: {},
      }),
    ).toBe(true)
  })

  it('rejects unknown versions', () => {
    expect(isBackupPayload({ version: 2, books: [], bookmarks: [], annotations: [] })).toBe(false)
    expect(isBackupPayload(null)).toBe(false)
  })
})
