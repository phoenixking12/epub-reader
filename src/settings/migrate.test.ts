import { describe, expect, it } from 'vitest'
import { DEFAULT_DISPLAY, migrateDisplay } from './defaults'

describe('migrateDisplay', () => {
  it('keeps a saved page-turn mode', () => {
    expect(migrateDisplay({ ...DEFAULT_DISPLAY, pageTurnMode: 'volume' }).pageTurnMode).toBe('volume')
  })

  it('maps an old scrolled library to chapter scroll', () => {
    const next = migrateDisplay({ flow: 'scrolled' })
    expect(next.pageTurnMode).toBe('scroll')
    expect(next.flow).toBe('scrolled')
  })

  it('maps an old paginated library to swipe', () => {
    const next = migrateDisplay({ flow: 'paginated' })
    expect(next.pageTurnMode).toBe('swipe')
    expect(next.flow).toBe('paginated')
  })

  it('narrows the old 24px side gutter so text can run nearer the edge', () => {
    expect(migrateDisplay({ margin: 24 }).margin).toBe(8)
  })

  it('keeps a custom side margin', () => {
    expect(migrateDisplay({ ...DEFAULT_DISPLAY, margin: 36 }).margin).toBe(36)
  })

  it('moves the old default typeface to As printed so publisher CSS can show', () => {
    const next = migrateDisplay({ fontFamily: '"Source Serif 4", Georgia, serif', justify: true })
    expect(next.fontFamily).toBe('publisher')
    expect(next.justify).toBe(false)
  })

  it('keeps Source Serif after the reader has already moved to schema 1', () => {
    const next = migrateDisplay({
      fontFamily: '"Source Serif 4", Georgia, serif',
      textSchema: 1,
    })
    expect(next.fontFamily).toBe('"Source Serif 4", Georgia, serif')
  })
})
