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

  it('forces paginated flow when turning pages with buttons', () => {
    const next = migrateDisplay({ pageTurnMode: 'buttons', flow: 'scrolled' })
    expect(next.flow).toBe('paginated')
  })
})
