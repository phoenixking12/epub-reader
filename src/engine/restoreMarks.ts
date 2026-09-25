import type { AnnotationRecord } from '../types/models'
import { rangeFromCfi } from './cfiIgnore'
import { annSelector, applyInlineMark, isInlineMark, unwrapAnnSpans } from './inlineMark'

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

function sectionFor(rec: AnnotationRecord, sectionOf: (cfi: string) => number | null) {
  if (typeof rec.sectionIndex === 'number' && rec.sectionIndex >= 0) return rec.sectionIndex
  if (!rec.cfiRange) return null
  const section = sectionOf(rec.cfiRange)
  return section != null && section >= 0 ? section : null
}

function plain(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

/**
 * Put saved marks back on a chapter document.
 * The database keeps them; the chapter file does not, and each visit builds a new document.
 */
export function restoreChapterMarks(
  doc: Document,
  index: number,
  records: readonly AnnotationRecord[],
  sectionOf: (cfi: string) => number | null,
  paintOverlay?: (rec: AnnotationRecord, range: Range) => void,
) {
  const chosen = new Map<string, AnnotationRecord>()
  for (const rec of records) {
    const section = sectionFor(rec, sectionOf)
    if (section != null && section !== index) continue
    const key = rec.id
    const prior = chosen.get(key)
    if (!prior || rec.createdAt >= prior.createdAt) chosen.set(key, rec)
  }
  for (const rec of chosen.values()) {
    const section = sectionFor(rec, sectionOf)
    const range = rangeForRecord(doc, rec, section == null || section === index)
    if (!range) continue
    try {
      if (isInlineMark(rec.style)) {
        const want = plain(rec.quote)
        const stale = want
          ? [...doc.querySelectorAll(annSelector(rec.id))].some((el) => plain(el.textContent ?? '') !== want)
          : false
        if (stale) unwrapAnnSpans(doc, rec.id)
        applyInlineMark(doc, range, rec)
      } else {
        paintOverlay?.(rec, range)
      }
    } catch {
      /* detached */
    }
  }
}
