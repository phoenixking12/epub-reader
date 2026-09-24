import { describe, expect, it } from 'vitest'
import { formatImportSummary } from './addBooks'

describe('formatImportSummary', () => {
  it('explains a phone scan that needs all-files access', () => {
    expect(formatImportSummary({ added: 0, skipped: 0 }, true, { needsPermission: true })).toMatch(/all-files/)
  })

  it('says when a scan found no EPUBs', () => {
    expect(formatImportSummary({ added: 0, skipped: 0 }, true, { scanned: true })).toBe(
      'No books found on this phone',
    )
  })
})
