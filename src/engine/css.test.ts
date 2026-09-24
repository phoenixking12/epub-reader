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
    expect(css).toMatch(/data-lg-kind="textColor"\] \*/)
    expect(css).toMatch(/background-color: transparent !important/)
    expect(css).not.toMatch(/color:\s*var\(--lg-mark-color\)/)
    expect(css).not.toMatch(/-webkit-text-fill-color:\s*var/)
    expect(css).toMatch(/::highlight\(lg-sel\)\s*\{[^}]*color:\s*inherit/)
    expect(css).not.toMatch(/data-lg-kind="textColor"[\s\S]{0,400}background-color: color-mix/)
  })

  it('keeps chapter panning available while text is selected', () => {
    expect(css).toMatch(/html\.lg-selecting/)
    expect(css).not.toMatch(/html\.lg-selecting\s*\{[^}]*touch-action:\s*none/)
  })

  it('keeps arrived and selection-handle rules valid', () => {
    expect(css).toMatch(/\.lg-arrived \{/)
    expect(css).toMatch(/\.lg-sel-handle \{/)
  })

  it('lets the compositor pan the chapter in scroll mode', () => {
    const scrolled = buildReaderCSS({ ...DEFAULT_DISPLAY, pageTurnMode: 'scroll', flow: 'scrolled' })
    expect(scrolled).toMatch(/touch-action: pan-y/)
    expect(scrolled).not.toMatch(/overscroll-behavior-y: contain/)
    expect(css).toMatch(/touch-action: pan-x pan-y/)
  })

  it('fills short chapters so a swipe on empty space still turns the page', () => {
    expect(css).toMatch(/min-height: 100%/)
    expect(css).not.toMatch(/min-height: 100vh/)
  })

  it('does not override the book typeface or sizes when Book default is selected', () => {
    expect(css).not.toMatch(/font-family: publisher/)
    expect(css).not.toMatch(/font-family: "Source Serif 4"/)
    expect(css).not.toMatch(/h1 \{ font-size: 1\.85em/)
    expect(css).not.toMatch(/JetBrains Mono/)
    expect(css).toMatch(/p, li, blockquote, dd \{[\s\S]*text-align: justify/)
    expect(css).toMatch(/line-height: 1\.55 !important/)
    expect(css).not.toMatch(/p, li, blockquote, dd, div, section, article/)
    expect(css).not.toMatch(/body \{[\s\S]*font-size: 1em !important/)
    expect(css).not.toMatch(/font-size: 18px/)
    expect(css).not.toMatch(/margin: 0 !important; padding: 0 !important;/)
    expect(css).not.toMatch(/height: auto !important/)
    expect(css).not.toMatch(/text-indent: 1\.5em/)
    expect(css).toMatch(/user-select: none/)
  })

  it('uses a novel layout only when Reasily formatting is on', () => {
    const reasily = buildReaderCSS({ ...DEFAULT_DISPLAY, formatting: 'reasily' })
    expect(reasily).toMatch(/\.lg-reasily-body \{[\s\S]*text-indent: 1\.5em !important/)
    expect(reasily).toMatch(/\.lg-reasily-chapter, \.lg-reasily-scene \{[\s\S]*text-align: center !important/)
    expect(reasily).toMatch(/\.lg-reasily-chapter, \.lg-reasily-scene \{[\s\S]*font-weight: 700 !important/)
    expect(reasily).toMatch(/\.lg-reasily-chapter, \.lg-reasily-scene \{[\s\S]*margin: 0 !important/)
    expect(reasily).toMatch(/font-family: inherit !important/)
    expect(reasily).not.toMatch(/0\.85em/)
    expect(reasily).not.toMatch(/0\.95em/)
    expect(reasily).toMatch(/word-spacing: normal !important/)
    expect(reasily).not.toMatch(/font-family: Literata/)
    expect(reasily).not.toMatch(/h1 \{ font-size: 1\.35em/)
    const chosen = buildReaderCSS({
      ...DEFAULT_DISPLAY,
      formatting: 'reasily',
      fontFamily: '"Source Serif 4", Georgia, serif',
    })
    expect(chosen).toMatch(/font-family: "Source Serif 4", Georgia, serif !important/)
  })

  it('applies a chosen typeface on html and body only', () => {
    expect(styled).toMatch(/html \{[\s\S]*font-family: "Source Serif 4"/)
    expect(styled).toMatch(/body \{[\s\S]*font-family: "Source Serif 4"/)
    expect(styled).not.toMatch(/span, a \{\s*font-family/)
    expect(styled).toMatch(/p, li, blockquote, dd \{[\s\S]*text-align: justify/)
    expect(styled).not.toMatch(/p, li, blockquote, dd, div, section, article/)
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
