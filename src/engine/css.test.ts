import { describe, expect, it } from 'vitest'
import { applyRendererLayout, buildReaderCSS } from './css'
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

  it('keeps paragraph bookmark marks small', () => {
    expect(css).toMatch(/\.lg-pmark::after[\s\S]*width: 10px/)
    expect(css).toMatch(/\.lg-pmark \{[\s\S]*width: 28px/)
  })

  it('groups font-color marks as a tinted span', () => {
    expect(css).toMatch(/data-lg-kind="textColor"/)
    expect(css).toMatch(/box-decoration-break: clone/)
  })

  it('keeps arrived and selection-handle rules valid', () => {
    expect(css).toMatch(/\.lg-arrived \{/)
    expect(css).toMatch(/\.lg-sel-handle \{/)
  })

  it('disables native iframe pan in scroll mode so chapter pan can run', () => {
    const scrolled = buildReaderCSS({ ...DEFAULT_DISPLAY, pageTurnMode: 'scroll', flow: 'scrolled' })
    expect(scrolled).toMatch(/touch-action: none/)
    expect(css).toMatch(/touch-action: pan-x pan-y/)
  })

  it('does not override the book typeface when Book default is selected', () => {
    expect(css).not.toMatch(/font-family: publisher/)
    expect(css).not.toMatch(/font-family: "Source Serif 4"/)
  })

  it('allows text selection so long-press can highlight a word', () => {
    expect(css).toMatch(/user-select: text/)
    expect(css).not.toMatch(/user-select: none/)
  })
})

describe('applyRendererLayout', () => {
  it('does not add extra page chrome so only the system bars inset the page', () => {
    const el = document.createElement('div')
    applyRendererLayout(el, { ...DEFAULT_DISPLAY, margin: 36 })
    expect(el.getAttribute('margin')).toBe('0px')
    expect(el.getAttribute('flow')).toBe('paginated')
  })

  it('still uses scroll flow when page-turn is scroll', () => {
    const el = document.createElement('div')
    applyRendererLayout(el, { ...DEFAULT_DISPLAY, pageTurnMode: 'scroll', flow: 'scrolled' })
    expect(el.getAttribute('flow')).toBe('scrolled')
    expect(el.getAttribute('margin')).toBe('0px')
  })
})
