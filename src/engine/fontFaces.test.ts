import { describe, expect, it } from 'vitest'
import { absolutizeFontFace } from './fontFaces'

describe('absolutizeFontFace', () => {
  it('resolves relative font urls against the stylesheet', () => {
    const css = `@font-face { font-family: 'Source Serif 4'; src: url(./files/latin.woff2) format('woff2'); }`
    const out = absolutizeFontFace(css, 'https://app.local/fonts/serif.css')
    expect(out).toContain('https://app.local/fonts/files/latin.woff2')
  })
})
