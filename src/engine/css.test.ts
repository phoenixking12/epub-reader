import { describe, expect, it } from 'vitest'
import { applyRendererLayout, buildReaderCSS } from './css'
import { DEFAULT_DISPLAY } from '../settings/defaults'

describe('buildReaderCSS', () => {
  const css = buildReaderCSS(DEFAULT_DISPLAY)
  const styled = buildReaderCSS({ ...DEFAULT_DISPLAY, fontFamily: '"Source Serif 4", Georgia, serif' })

  it('makes headings larger and bold only when a reader typeface is chosen', () => {
    expect(styled).toMatch(/h1, h2, h3, h4, h5, h6 \{[\s\S]*font-weight: 700/)
    expect(styled).toMatch(/h2 \{ font-size: 1\.55em/)
    expect(styled).toMatch(/h3 \{ font-size: 1\.38em/)
    expect(styled).toMatch(/h1 \*, h2 \*, h3 \*, h4 \*, h5 \*, h6 \* \{[\s\S]*font-weight: inherit/)
    expect(styled).toMatch(/p\.subtitle[\s\S]*font-weight: 700/)
    expect(styled).toMatch(/h1:first-child[\s\S]*margin-top: 0/)
  })

  it('keeps paragraph bookmark marks small', () => {
    expect(css).toMatch(/\.lg-pmark::after[\s\S]*width: 10px/)
    expect(css).toMatch(/\.lg-pmark \{[\s\S]*width: 28px/)
  })

  it('recolors font-color marks without a highlight wash', () => {
    expect(css).toMatch(/data-lg-kind="textColor"/)
    expect(css).toMatch(/box-decoration-break: clone/)
    expect(css).toMatch(/data-lg-kind="textColor"[\s\S]{0,180}background-color: transparent/)
    expect(css).not.toMatch(/data-lg-kind="textColor"[\s\S]{0,180}background-color: color-mix/)
  })

  it('keeps arrived and selection-handle rules valid', () => {
    expect(css).toMatch(/\.lg-arrived \{/)
    expect(css).toMatch(/\.lg-sel-handle \{/)
  })

  it('lets the compositor pan the chapter in scroll mode', () => {
    const scrolled = buildReaderCSS({ ...DEFAULT_DISPLAY, pageTurnMode: 'scroll', flow: 'scrolled' })
    expect(scrolled).toMatch(/touch-action: pan-y/)
    expect(css).toMatch(/touch-action: pan-x pan-y/)
  })

  it('does not override the book typeface or sizes when Book default is selected', () => {
    expect(css).not.toMatch(/font-family: publisher/)
    expect(css).not.toMatch(/font-family: "Source Serif 4"/)
    expect(css).not.toMatch(/h1 \{ font-size: 1\.85em/)
    expect(css).not.toMatch(/JetBrains Mono/)
    expect(css).toMatch(/user-select: none/)
  })

  it('applies a chosen typeface on html and body only', () => {
    expect(styled).toMatch(/html \{[\s\S]*font-family: "Source Serif 4"/)
    expect(styled).toMatch(/body \{[\s\S]*font-family: "Source Serif 4"/)
    expect(styled).not.toMatch(/span, a \{\s*font-family/)
  })

  it('keeps text unselected until a long-press opts in', () => {
    expect(css).toMatch(/html\.lg-selecting/)
    expect(css).toMatch(/user-select: none/)
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
