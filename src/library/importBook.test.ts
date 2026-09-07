import { describe, expect, it } from 'vitest'
import { isEpubFilename } from './importBook'

describe('isEpubFilename', () => {
  it('accepts .epub in any case', () => {
    expect(isEpubFilename('Book.epub')).toBe(true)
    expect(isEpubFilename('Book.EPUB')).toBe(true)
  })

  it('rejects other files', () => {
    expect(isEpubFilename('notes.txt')).toBe(false)
    expect(isEpubFilename('book.epub.bak')).toBe(false)
  })
})
