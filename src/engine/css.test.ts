import { describe, expect, it } from 'vitest'
import { buildReaderCSS } from './css'
import { DEFAULT_DISPLAY } from '../settings/defaults'

describe('buildReaderCSS', () => {
  const css = buildReaderCSS(DEFAULT_DISPLAY)

  it('makes headings larger and bold, including nested spans', () => {
    expect(css).toMatch(/h1, h2, h3, h4, h5, h6 \{[\s\S]*font-weight: 700/)
    expect(css).toMatch(/h2 \{ font-size: 1\.55em/)
    expect(css).toMatch(/h3 \{ font-size: 1\.38em/)
    expect(css).toMatch(/h1 \*, h2 \*, h3 \*, h4 \*, h5 \*, h6 \* \{[\s\S]*font-weight: inherit/)
    expect(css).toMatch(/p\.subtitle[\s\S]*font-weight: 700/)
    expect(css).toMatch(/h1:first-child[\s\S]*margin-top: 0/)
  })

  it('keeps paragraph bookmark marks small and untappable', () => {
    expect(css).toMatch(/html\.lg-show-marks p::before[\s\S]*width: 8px/)
    expect(css).toMatch(/pointer-events: none/)
  })

  it('allows text selection so long-press can highlight a word', () => {
    expect(css).toMatch(/user-select: text/)
    expect(css).not.toMatch(/user-select: none/)
  })
})
