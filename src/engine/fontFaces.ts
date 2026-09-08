/** Copy @font-face rules from the app document so book iframes can use bundled and imported fonts. */
export function collectDocumentFontFaces(): string {
  const chunks: string[] = []
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList
    try {
      rules = sheet.cssRules
    } catch {
      continue
    }
    const base = sheet.href
    for (const rule of Array.from(rules)) {
      if (!(rule instanceof CSSFontFaceRule)) continue
      chunks.push(absolutizeFontFace(rule.cssText, base))
    }
  }
  return chunks.join('\n')
}

export function absolutizeFontFace(cssText: string, baseHref: string | null): string {
  if (!baseHref) return cssText
  return cssText.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (_whole, quote: string, url: string) => {
    const trimmed = url.trim()
    if (
      trimmed.startsWith('data:') ||
      trimmed.startsWith('blob:') ||
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('/')
    ) {
      return `url(${quote}${trimmed}${quote})`
    }
    try {
      return `url(${quote}${new URL(trimmed, baseHref).href}${quote})`
    } catch {
      return `url(${quote}${trimmed}${quote})`
    }
  })
}
