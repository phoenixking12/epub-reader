import { PUBLISHER_FONT, THEMES } from '../settings/defaults'
import type { DisplaySettings } from '../types/models'
import { collectDocumentFontFaces } from './fontFaces'

export function themeColors(settings: DisplaySettings) {
  if (settings.theme === 'custom') {
    return { bg: settings.customBg, fg: settings.customFg, link: settings.customLink }
  }
  return THEMES[settings.theme]
}

export function usesPublisherFont(family: string) {
  return !family || family === PUBLISHER_FONT
}

export function buildReaderCSS(settings: DisplaySettings): string {
  const { bg, fg, link } = themeColors(settings)
  const night = settings.theme === 'night'
  const publisher = usesPublisherFont(settings.fontFamily)
  const writing =
    settings.writingMode === 'auto' ? '' : `writing-mode: ${settings.writingMode} !important;`
  const imgFilter = night && settings.invertImagesInNight ? 'filter: invert(1) hue-rotate(180deg);' : ''
  const faces = collectDocumentFontFaces()
  const headingFallback = publisher
    ? `
    :where(h1) { font-size: 1.75em; font-weight: 700; }
    :where(h2) { font-size: 1.45em; font-weight: 700; }
    :where(h3) { font-size: 1.25em; font-weight: 600; }
    :where(h4), :where(h5), :where(h6) { font-size: 1.12em; font-weight: 600; }
    `
    : ''
  const fontOverride = publisher
    ? headingFallback
    : `
    html, body {
      font-family: ${settings.fontFamily} !important;
    }
    p, li, blockquote, dd, div, section, article, aside, td, th, span, a {
      font-family: ${settings.fontFamily} !important;
    }
    h1, h2, h3, h4, h5, h6 {
      font-size: revert;
    }
    h1 { font-size: 1.75em !important; font-weight: 700; }
    h2 { font-size: 1.45em !important; font-weight: 700; }
    h3 { font-size: 1.25em !important; font-weight: 600; }
    h4, h5, h6 { font-size: 1.12em !important; font-weight: 600; }
    `
  const alignOverride = settings.justify
    ? `p, li, blockquote, dd { text-align: justify; }`
    : ''
  const hyphenate = settings.hyphenate
    ? `p, li, blockquote { -webkit-hyphens: auto; hyphens: auto; }`
    : ''
  const extra = settings.customCss?.trim() ? settings.customCss : ''

  return `
    @namespace epub "http://www.idpf.org/2007/ops";
    ${faces}
    html {
      background: ${bg} !important;
      color: ${fg} !important;
      font-size: ${settings.fontSize}px !important;
      touch-action: none;
      -webkit-user-select: text;
      user-select: text;
      -webkit-touch-callout: none !important;
      -webkit-tap-highlight-color: transparent;
      ${writing}
    }
    body {
      background: transparent !important;
      color: inherit !important;
      font-size: 1em;
      touch-action: none;
      -webkit-user-select: text;
      user-select: text;
      -webkit-touch-callout: none !important;
      -webkit-tap-highlight-color: transparent;
    }
    * {
      -webkit-touch-callout: none !important;
    }
    ${fontOverride}
    h1, h2, h3, h4, h5, h6 {
      line-height: 1.25;
      text-wrap: balance;
    }
    p, h1, h2, h3, h4, h5, h6, li, blockquote {
      position: relative;
    }
    html.lg-show-marks p,
    html.lg-show-marks h1,
    html.lg-show-marks h2,
    html.lg-show-marks h3,
    html.lg-show-marks h4,
    html.lg-show-marks h5,
    html.lg-show-marks h6,
    html.lg-show-marks li,
    html.lg-show-marks blockquote {
      overflow: visible !important;
      padding-left: 1.4em !important;
    }
    ::highlight(lg-sel) {
      background-color: color-mix(in srgb, #ea580c 38%, transparent);
      color: inherit;
    }
    .lg-sel-box {
      background: color-mix(in srgb, #ea580c 38%, transparent);
      pointer-events: none;
    }
    span.lg-ann[data-ann-style="textColor"] {
      font-style: inherit;
    }
    .lg-pmark {
      position: absolute;
      left: 0;
      top: 0.1em;
      width: 18px;
      height: 22px;
      transform: none;
      border: 0;
      padding: 0;
      background: ${link};
      clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 72%, 0 100%);
      cursor: pointer;
      z-index: 4;
      pointer-events: auto;
      opacity: 0.92;
    }
    .lg-pmark:not(.on) {
      background: color-mix(in srgb, ${link} 55%, ${bg});
    }
    .lg-pmark.on {
      background: ${link};
    }
    .lg-sel-handle {
      position: absolute;
      width: 28px;
      height: 44px;
      margin: 0;
      padding: 0;
      border: 0;
      background: transparent;
      z-index: 50;
      touch-action: none;
      pointer-events: auto;
    }
    .lg-sel-handle::before {
      content: "";
      position: absolute;
      left: 50%;
      width: 2px;
      background: #ea580c;
      transform: translateX(-50%);
    }
    .lg-sel-handle[data-edge="start"]::before {
      top: 14px;
      bottom: 0;
    }
    .lg-sel-handle[data-edge="end"]::before {
      top: 0;
      bottom: 14px;
    }
    .lg-sel-handle::after {
      content: "";
      position: absolute;
      left: 50%;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #ea580c;
      border: 2px solid #fff7ed;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
      transform: translateX(-50%);
    }
    .lg-sel-handle[data-edge="start"]::after { top: 0; }
    .lg-sel-handle[data-edge="end"]::after { bottom: 0; }
    a:link, a:visited { color: ${link} !important; }
    p, li, blockquote, dd {
      line-height: ${settings.lineHeight};
      hanging-punctuation: allow-end last;
      orphans: 2;
      widows: 2;
    }
    ${alignOverride}
    ${hyphenate}
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
    ${extra}
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
