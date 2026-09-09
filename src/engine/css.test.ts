import { describe, expect, it } from 'vitest'
import { DEFAULT_DISPLAY, PUBLISHER_FONT } from '../settings/defaults'
import { buildReaderCSS, usesPublisherFont } from './css'

describe('buildReaderCSS', () => {
  it('keeps publisher typeface and heading sizes when As printed is selected', () => {
    const css = buildReaderCSS({ ...DEFAULT_DISPLAY, fontFamily: PUBLISHER_FONT, justify: false })
    expect(usesPublisherFont(PUBLISHER_FONT)).toBe(true)
    expect(css).not.toContain('font-family: publisher')
    expect(css).not.toMatch(/h1 \{[^}]*font-size: 1\.75em/)
    expect(css).not.toMatch(/p, li, blockquote, dd \{ text-align: justify; \}/)
    expect(css).not.toContain('font-size: inherit !important')
  })

  it('applies a chosen typeface to body copy but still scales headings', () => {
    const css = buildReaderCSS({
      ...DEFAULT_DISPLAY,
      fontFamily: 'Literata, Georgia, serif',
      justify: true,
    })
    expect(css).toContain('font-family: Literata, Georgia, serif !important')
    expect(css).toMatch(/h1 \{ font-size: 1\.75em/)
    expect(css).toContain('text-align: justify')
  })
})
