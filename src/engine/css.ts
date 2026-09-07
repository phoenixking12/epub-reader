import { THEMES } from '../settings/defaults'
import type { DisplaySettings } from '../types/models'

export function themeColors(settings: DisplaySettings) {
  if (settings.theme === 'custom') {
    return { bg: settings.customBg, fg: settings.customFg, link: settings.customLink }
  }
  return THEMES[settings.theme]
}

export function buildReaderCSS(settings: DisplaySettings): string {
  const { bg, fg, link } = themeColors(settings)
  const night = settings.theme === 'night'
  const writing =
    settings.writingMode === 'auto' ? '' : `writing-mode: ${settings.writingMode} !important;`
  const imgFilter = night && settings.invertImagesInNight ? 'filter: invert(1) hue-rotate(180deg);' : ''

  return `
    @namespace epub "http://www.idpf.org/2007/ops";
    html {
      background: ${bg} !important;
      color: ${fg} !important;
      font-size: ${settings.fontSize}px !important;
      touch-action: manipulation;
      -webkit-user-select: text;
      user-select: text;
      ${writing}
    }
    body {
      background: transparent !important;
      color: inherit !important;
      font-family: ${settings.fontFamily} !important;
      font-size: 1em !important;
      touch-action: manipulation;
      -webkit-user-select: text;
      user-select: text;
      -webkit-touch-callout: none;
    }
    p, li, blockquote, dd, div, section, article, aside, td, th, span {
      font-size: inherit !important;
    }
    h1 { font-size: 1.6em !important; }
    h2 { font-size: 1.35em !important; }
    h3 { font-size: 1.2em !important; }
    h4, h5, h6 { font-size: 1.1em !important; }
    a:link, a:visited { color: ${link} !important; }
    p, li, blockquote, dd, div, section, article {
      line-height: ${settings.lineHeight} !important;
      text-align: ${settings.justify ? 'justify' : 'start'};
      -webkit-hyphens: ${settings.hyphenate ? 'auto' : 'manual'};
      hyphens: ${settings.hyphenate ? 'auto' : 'manual'};
      hanging-punctuation: allow-end last;
      orphans: 2;
      widows: 2;
    }
    [align="left"] { text-align: left !important; }
    [align="right"] { text-align: right !important; }
    [align="center"] { text-align: center !important; }
    [align="justify"] { text-align: justify !important; }
    pre, code, kbd, samp {
      font-family: "JetBrains Mono", ui-monospace, monospace !important;
      white-space: pre-wrap !important;
    }
    img, svg, video {
      max-width: 100% !important;
      height: auto !important;
      ${imgFilter}
    }
    aside[epub|type~="endnote"],
    aside[epub|type~="footnote"],
    aside[epub|type~="note"],
    aside[epub|type~="rearnote"] {
      ${settings.footnotePosition === 'follow' ? '' : 'display: none;'}
    }
    math, mrow, mi, mo, mn { font-family: "Latin Modern Math", "STIX Two Math", math, serif; }
    ${settings.customCss}
  `
}

export function applyRendererLayout(
  renderer: HTMLElement | undefined,
  settings: DisplaySettings,
) {
  if (!renderer) return
  renderer.setAttribute('flow', settings.flow)
  renderer.setAttribute('margin', `${settings.margin}px`)
  renderer.setAttribute('max-inline-size', `${settings.maxInlineSize}px`)
  renderer.setAttribute('gap', `${settings.gap}%`)
  renderer.setAttribute('max-column-count', '1')
}
