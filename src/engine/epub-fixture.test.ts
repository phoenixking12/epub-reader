import { describe, expect, it } from 'vitest'
import { buildMinimalEpub } from './epub-bytes'

describe('minimal EPUB fixture', () => {
  it('is a zip with an OPF package document', () => {
    const bytes = buildMinimalEpub({ title: 'Fixture Book' })
    expect(bytes[0]).toBe(0x50)
    expect(bytes[1]).toBe(0x4b)
    const text = new TextDecoder().decode(bytes)
    expect(text.includes('application/oebps-package+xml')).toBe(true)
    expect(text.includes('Fixture Book')).toBe(true)
  })
})
