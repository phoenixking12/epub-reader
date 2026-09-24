import type { AnnotationRecord } from '../types/models'
import { rangeFromCfi } from './cfiIgnore'
import { applyInlineMark, isInlineMark } from './inlineMark'

interface TextPiece {
  node: Text
  start: number
}

function collapsed(raw: string) {
  let text = ''
  const toRaw: number[] = []
  let i = 0
  while (i < raw.length && /\s/.test(raw[i]!)) i++
  let spaced = false
  for (; i < raw.length; i++) {
    if (/\s/.test(raw[i]!)) {
      spaced = text.length > 0
      continue
    }
    if (spaced) {
      toRaw.push(i)
      text += ' '
      spaced = false
    }
    toRaw.push(i)
    text += raw[i]
  }
  return { text, toRaw }
}

function pointAt(pieces: TextPiece[], raw: string, rawIndex: number) {
  if (!pieces.length) return null
  if (rawIndex >= raw.length) {
    const last = pieces[pieces.length - 1]!
    return { node: last.node, offset: last.node.nodeValue?.length ?? 0 }
  }
  for (let i = pieces.length - 1; i >= 0; i--) {
    const piece = pieces[i]!
    if (rawIndex >= piece.start) return { node: piece.node, offset: rawIndex - piece.start }
  }
  return null
}

/** Find the stored quote in a freshly loaded chapter, ignoring mark wrappers. */
export function rangeForQuote(doc: Document, quote: string): Range | null {
  const body = doc.body
  const needle = quote.replace(/\s+/g, ' ').trim()
  if (!body || !needle) return null
  const pieces: TextPiece[] = []
  let raw = ''
  const walker = doc.createTreeWalker(body, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const value = node.nodeValue ?? ''
    if (!value) continue
    pieces.push({ node: node as Text, start: raw.length })
    raw += value
  }
  const norm = collapsed(raw)
  const at = norm.text.indexOf(needle)
  if (at < 0 || !norm.toRaw.length) return null
  const rawStart = norm.toRaw[at]
  const rawEnd = norm.toRaw[at + needle.length - 1]! + 1
  if (rawStart == null) return null
  const start = pointAt(pieces, raw, rawStart)
  const end = pointAt(pieces, raw, rawEnd)
  if (!start || !end) return null
  const range = doc.createRange()
  try {
    range.setStart(start.node, start.offset)
    range.setEnd(end.node, end.offset)
  } catch {
    return null
  }
  return range.collapsed ? null : range
}

function sameText(range: Range, quote: string) {
  const want = quote.replace(/\s+/g, ' ').trim()
  if (!want) return !range.collapsed
  return range.toString().replace(/\s+/g, ' ').trim() === want
}

function rangeForRecord(doc: Document, rec: AnnotationRecord, allowQuote: boolean) {
  if (rec.cfiRange) {
    try {
      const range = rangeFromCfi(doc, rec.cfiRange)
      if (!range.collapsed && sameText(range, rec.quote)) return range
    } catch {
      /* The saved CFI named a wrapper that this fresh chapter does not have. */
    }
  }
  if (!allowQuote) return null
  return rangeForQuote(doc, rec.quote)
}

/**
 * Draw font color, bold, and italic back onto a chapter document.
 * Navigating away destroys the iframe, and foliate only emits create-overlay
 * before the overlayer exists, so these marks cannot wait for addAnnotation.
 */
export function restoreChapterMarks(
  doc: Document,
  index: number,
  records: readonly AnnotationRecord[],
  sectionOf: (cfi: string) => number | null,
) {
  const chosen = new Map<string, { rec: AnnotationRecord; allowQuote: boolean }>()
  for (const rec of records) {
    if (!isInlineMark(rec.style)) continue
    const section = rec.cfiRange ? sectionOf(rec.cfiRange) : index
    if (section != null && section !== index) continue
    const key = rec.cfiRange || rec.id
    const prior = chosen.get(key)
    if (!prior || rec.createdAt >= prior.rec.createdAt) chosen.set(key, { rec, allowQuote: section === index })
  }
  for (const { rec, allowQuote } of chosen.values()) {
    const range = rangeForRecord(doc, rec, allowQuote)
    if (!range) continue
    try {
      applyInlineMark(doc, range, rec)
    } catch {
      /* detached */
    }
  }
}
