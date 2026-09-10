import { THEMES, flowForPageTurn, usesPublisherFont } from '../settings/defaults'
import type { DisplaySettings } from '../types/models'
import { collectDocumentFontFaces } from './fontFaces'

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
  const faces = collectDocumentFontFaces()
  const publisher = usesPublisherFont(settings.fontFamily)
  const fontFamilyCss = publisher ? '' : `font-family: ${settings.fontFamily} !important;`

  return `
    @namespace epub "http://www.idpf.org/2007/ops";
    ${faces}
    html {
      background: ${bg} !important;
      color: ${fg} !important;
      font-size: ${settings.fontSize}px !important;
      ${fontFamilyCss}
      margin: 0 !important;
      padding: 0 !important;
      touch-action: ${settings.pageTurnMode === 'scroll' ? 'none' : 'pan-x pan-y'};
      -webkit-user-select: text !important;
      user-select: text !important;
      -webkit-touch-callout: none !important;
      -webkit-tap-highlight-color: transparent;
      overscroll-behavior: none;
      ${writing}
    }
    body {
      background: transparent !important;
      color: inherit !important;
      ${fontFamilyCss}
      font-size: 1em !important;
      margin: 0 !important;
      padding: 0 !important;
      touch-action: ${settings.pageTurnMode === 'scroll' ? 'none' : 'pan-x pan-y'};
      -webkit-user-select: text !important;
      user-select: text !important;
      -webkit-touch-callout: none !important;
      -webkit-tap-highlight-color: transparent;
      overscroll-behavior: none;
    }
    * {
      -webkit-touch-callout: none !important;
    }
    p, h1, h2, h3, h4, h5, h6, li, blockquote, dd, td, th, span, a {
      -webkit-user-select: text !important;
      user-select: text !important;
    }
    ${
      publisher
        ? ''
        : `body, p, h1, h2, h3, h4, h5, h6, li, blockquote, dd, div, section, article, aside, td, th, span, a {
      font-family: ${settings.fontFamily} !important;
    }`
    }
    p, h1, h2, h3, h4, h5, h6, li, blockquote, dd, dt, pre, figcaption {
      position: relative !important;
    }
    html.lg-show-marks p,
    html.lg-show-marks h1,
    html.lg-show-marks h2,
    html.lg-show-marks h3,
    html.lg-show-marks h4,
    html.lg-show-marks h5,
    html.lg-show-marks h6,
    html.lg-show-marks li,
    html.lg-show-marks blockquote,
    html.lg-show-marks dd,
    html.lg-show-marks dt,
    html.lg-show-marks pre,
    html.lg-show-marks figcaption,
    html.lg-show-marks div {
      overflow: visible !important;
    }
    ::highlight(lg-sel) {
      background-color: color-mix(in srgb, #ea580c 38%, transparent);
      color: inherit;
    }
    ::selection {
      background: color-mix(in srgb, #ea580c 38%, transparent);
      color: inherit;
    }
    html.lg-custom-sel ::selection {
      background: transparent;
      color: inherit;
    }
    .lg-pmark {
      position: absolute;
      left: 0;
      top: 0.15em;
      width: 28px;
      height: 28px;
      margin: 0;
      padding: 0;
      border: 0;
      background: transparent;
      z-index: 4;
      pointer-events: auto;
      -webkit-tap-highlight-color: transparent;
    }
    .lg-pmark::after {
      content: "";
      position: absolute;
      left: 2px;
      top: 6px;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: ${bg};
      box-shadow: inset 0 0 0 1.5px ${link};
    }
    .lg-pmark.on::after {
      background: ${link};
    }
    .lg-sel-handle {
      position: fixed;
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
    p:not(.subtitle):not(.subhead):not(.subheading):not(.heading):not(.title),
    li, blockquote, dd,
    div:not(.subtitle):not(.subhead):not(.subheading),
    section, article, aside, td, th, span {
      font-size: inherit !important;
    }
    h1, h2, h3, h4, h5, h6 {
      font-weight: 700 !important;
      line-height: 1.25 !important;
      margin-top: 0.55em !important;
      margin-bottom: 0.35em !important;
    }
    h1:first-child, h2:first-child, h3:first-child,
    h4:first-child, h5:first-child, h6:first-child {
      margin-top: 0 !important;
    }
    h1 { font-size: 1.85em !important; }
    h2 { font-size: 1.55em !important; }
    h3 { font-size: 1.38em !important; }
    h4 { font-size: 1.18em !important; }
    h5, h6 { font-size: 1.1em !important; }
    h1 *, h2 *, h3 *, h4 *, h5 *, h6 * {
      font-size: inherit !important;
      font-weight: inherit !important;
    }
    [epub|type~="subtitle"],
    p.subtitle, p.subhead, p.subheading, p.heading,
    div.subtitle, div.subhead, div.subheading {
      font-size: 1.38em !important;
      font-weight: 700 !important;
    }
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
    html body .subtitle,
    html body .subhead,
    html body p.subtitle,
    html body p.subhead,
    html body p.heading {
      font-size: 1.5em !important;
      font-weight: 700 !important;
      font-synthesis: weight !important;
    }
  `
}

export function applyRendererLayout(
  renderer: HTMLElement | undefined,
  settings: DisplaySettings,
) {
  if (!renderer) return
  renderer.setAttribute('flow', flowForPageTurn(settings.pageTurnMode))
  // Vertical inset is only the Android status / nav bars on the host.
  // The side-margin setting is applied as host padding-inline, not page chrome.
  renderer.setAttribute('margin', '0px')
  renderer.setAttribute('max-inline-size', `${settings.maxInlineSize}px`)
  renderer.setAttribute('gap', `${settings.gap}%`)
  renderer.setAttribute('max-column-count', '1')
}
