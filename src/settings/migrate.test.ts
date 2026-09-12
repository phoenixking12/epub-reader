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

  it('narrows the old 24px and 8px gutters so text can fill the screen', () => {
    expect(migrateDisplay({ margin: 24 }).margin).toBe(4)
    expect(migrateDisplay({ margin: 8 }).margin).toBe(4)
    expect(migrateDisplay({ gap: 7 }).gap).toBe(2)
    expect(migrateDisplay({ maxInlineSize: 720 }).maxInlineSize).toBe(1200)
  })

  it('keeps a custom side margin', () => {
    expect(migrateDisplay({ ...DEFAULT_DISPLAY, margin: 36 }).margin).toBe(36)
    expect(migrateDisplay({ ...DEFAULT_DISPLAY, gap: 9 }).gap).toBe(9)
  })

  it('uses the book typeface by default and keeps a chosen face', () => {
    expect(migrateDisplay({}).fontFamily).toBe('publisher')
    expect(migrateDisplay({ fontFamily: '"Source Serif 4", Georgia, serif' }).fontFamily).toBe('publisher')
    expect(migrateDisplay({ fontFamily: 'Literata, Georgia, serif' }).fontFamily).toBe('Literata, Georgia, serif')
  })

  it('keeps the progress slider off unless the reader turned it on', () => {
    expect(migrateDisplay({}).progressSlider).toBe(false)
    expect(migrateDisplay({ progressSlider: true }).progressSlider).toBe(true)
  })
})
