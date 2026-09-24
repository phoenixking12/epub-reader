import { describe, expect, it } from 'vitest'
import { formatImportSummary } from './addBooks'

describe('formatImportSummary', () => {
  it('explains a phone scan that needs all-files access', () => {
    expect(formatImportSummary({ added: 0, skipped: 0 }, true, { needsPermission: true })).toMatch(/all-files/)
  })

  it('says when a scan found no books', () => {
    expect(formatImportSummary({ added: 0, skipped: 0 }, true, { scanned: true })).toBe(
      'No books found on this phone',
    )
  })

  it('does not mention EPUB when the audiobook shelf is empty', () => {
    expect(formatImportSummary({ added: 0, skipped: 0 }, true, { scanned: true, shelf: 'audiobooks' })).toBe(
      'No audiobooks found on this phone',
    )
    expect(formatImportSummary({ added: 0, skipped: 0 }, false, { shelf: 'audiobooks' })).toBe(
      'No audiobooks were added',
    )
    expect(formatImportSummary({ added: 2, skipped: 0 }, false, { shelf: 'audiobooks' })).toBe(
      'Added 2 audiobooks',
    )
  })
})
