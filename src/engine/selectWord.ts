const WORD_CHAR = /[\p{L}\p{N}\p{M}'’\u2011-]/u

export function wordBounds(text: string, offset: number): { start: number; end: number } {
  const len = text.length
  if (!len) return { start: 0, end: 0 }
  let i = Math.max(0, Math.min(offset, len))
  if (i === len) i -= 1

  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    try {
      const seg = new Intl.Segmenter(undefined, { granularity: 'word' })
      let fallback: { start: number; end: number } | null = null
      for (const part of seg.segment(text)) {
        const start = part.index
        const rawEnd = start + part.segment.length
        if (i >= start && i < rawEnd) {
          if (part.isWordLike) return { start, end: rawEnd }
          fallback = { start, end: rawEnd }
        }
      }
      if (fallback && /[\p{L}\p{N}]/u.test(text.slice(fallback.start, fallback.end))) return fallback
    } catch {
      /* fall through */
    }
  }

  if (!WORD_CHAR.test(text[i]!)) {
    if (i > 0 && WORD_CHAR.test(text[i - 1]!)) i -= 1
    else {
      let j = i
      while (j < len && !WORD_CHAR.test(text[j]!)) j += 1
      if (j < len) i = j
    }
  }

  let start = i
  let end = i
  while (start > 0 && WORD_CHAR.test(text[start - 1]!)) start -= 1
  while (end < len && WORD_CHAR.test(text[end]!)) end += 1
  if (start === end) {
    if (i < len) return { start: i, end: i + 1 }
    if (i > 0) return { start: i - 1, end: i }
  }
  return { start, end }
}

export function caretIsTextual(node: Node): boolean {
  if (node.nodeType === Node.TEXT_NODE) return Boolean(node.textContent)
  if (!(node instanceof Element)) return false
  const tag = node.tagName
  return tag !== 'HTML' && tag !== 'BODY'
}

const BLOCK_SEL = 'p, h1, h2, h3, h4, h5, h6, li, blockquote, dd, td, th'

export function wordRangeFromCaret(caret: Range): Range | null {
  let node: Node | null = caret.startContainer
  let offset = caret.startOffset
  if (!node) return null
  if (node.nodeType !== Node.TEXT_NODE) {
    if (!caretIsTextual(node)) return null
    const root = node instanceof Element ? node : node.parentElement
    if (!root) return null
    const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    const textNode = walker.nextNode()
    if (!textNode?.textContent) return null
    node = textNode
    offset = 0
  }
  const text = node.textContent ?? ''
  const { start, end } = wordBounds(text, offset)
  if (start === end) return null
  const range = node.ownerDocument!.createRange()
  range.setStart(node, start)
  range.setEnd(node, end)
  return range
}

export function wordRangeFromHit(caret: Range | null, hit: Element | null): Range | null {
  if (caret) {
    const word = wordRangeFromCaret(caret)
    if (word) return word
  }
  const block = hit?.closest(BLOCK_SEL)
  if (!block) return null
  const doc = block.ownerDocument
  const walker = doc.createTreeWalker(block, NodeFilter.SHOW_TEXT)
  const textNode = walker.nextNode()
  if (!textNode?.textContent) return null
  const next = doc.createRange()
  next.setStart(textNode, 0)
  next.collapse(true)
  return wordRangeFromCaret(next)
}

export function nearestBookmarkBlock(hit: Element | null): HTMLElement | null {
  if (!hit) return null
  const exact = hit.closest('p, h1, h2, h3, h4, h5, h6, li, blockquote, dd, dt, pre, figcaption')
  if (exact instanceof HTMLElement) return exact
  let el: Element | null = hit
  let best: HTMLElement | null = null
  while (el && el.tagName !== 'BODY' && el.tagName !== 'HTML') {
    if (el instanceof HTMLElement) {
      const quote = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim()
      if (quote.length >= 8 && quote.length <= 800) best = el
    }
    el = el.parentElement
  }
  return best
}

export function isHugeNativeSelection(text: string, savedLen = 0): boolean {
  const trimmed = text.replace(/\s+/g, ' ').trim()
  if (trimmed.length > 400) return true
  if (savedLen > 0 && trimmed.length > Math.max(80, savedLen * 6) && /[\n\r]/.test(text)) return true
  if (savedLen > 0 && savedLen < 40 && trimmed.length > 120) return true
  return false
}
