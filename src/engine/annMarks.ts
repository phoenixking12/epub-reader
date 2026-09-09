import type { AnnotationRecord } from '../types/models'

export const ANN_MARK_CLASS = 'lg-ann'

export function needsInlineMark(style: AnnotationRecord['style']) {
  return style === 'textColor' || style === 'bold' || style === 'italic'
}

export function unwrapAnnotation(doc: Document, id: string) {
  const nodes = [...doc.querySelectorAll(`span.${ANN_MARK_CLASS}[data-ann-id="${id}"]`)]
  for (const el of nodes) {
    const parent = el.parentNode
    if (!parent) continue
    while (el.firstChild) parent.insertBefore(el.firstChild, el)
    parent.removeChild(el)
    parent.normalize()
  }
}

export function applyInlineMark(el: HTMLElement, rec: Pick<AnnotationRecord, 'id' | 'style' | 'color'>) {
  el.className = ANN_MARK_CLASS
  el.dataset.annId = rec.id
  el.dataset.annStyle = rec.style
  el.removeAttribute('style')
  if (rec.style === 'textColor') {
    el.style.color = rec.color
    el.style.setProperty('-webkit-text-fill-color', rec.color)
  } else if (rec.style === 'bold') {
    el.style.fontWeight = '700'
  } else if (rec.style === 'italic') {
    el.style.fontStyle = 'italic'
  }
}

export function textPiecesInRange(range: Range): Array<{ node: Text; start: number; end: number }> {
  const doc = range.startContainer.ownerDocument
  if (!doc || range.collapsed) return []
  const root = range.commonAncestorContainer
  if (root.nodeType === Node.TEXT_NODE) {
    return [
      {
        node: root as Text,
        start: range.startOffset,
        end: range.endOffset,
      },
    ]
  }
  const pieces: Array<{ node: Text; start: number; end: number }> = []
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let current = walker.nextNode()
  while (current) {
    const text = current as Text
    if (text.nodeValue && range.intersectsNode(text)) {
      const start = text === range.startContainer ? range.startOffset : 0
      const end = text === range.endContainer ? range.endOffset : text.length
      if (end > start) pieces.push({ node: text, start, end })
    }
    current = walker.nextNode()
  }
  return pieces
}

export function wrapRange(range: Range, rec: Pick<AnnotationRecord, 'id' | 'style' | 'color'>) {
  const doc = range.startContainer.ownerDocument
  if (!doc) return
  unwrapAnnotation(doc, rec.id)
  if (!needsInlineMark(rec.style)) return
  const pieces = textPiecesInRange(range)
  for (const piece of pieces) {
    let { node, start, end } = piece
    if (!node.nodeValue || end <= start) continue
    if (start > 0) {
      node = node.splitText(start)
      end -= start
    }
    if (end < node.length) node.splitText(end)
    const span = doc.createElement('span')
    applyInlineMark(span, rec)
    node.parentNode?.insertBefore(span, node)
    span.append(node)
  }
}

export function selectWordAtPoint(doc: Document, x: number, y: number) {
  const caret = doc.caretRangeFromPoint?.(x, y)
  let point = caret
  if (!point) {
    const pos = (
      doc as Document & {
        caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null
      }
    ).caretPositionFromPoint?.(x, y)
    if (pos) {
      point = doc.createRange()
      point.setStart(pos.offsetNode, pos.offset)
      point.collapse(true)
    }
  }
  const sel = doc.getSelection()
  if (!point || !sel) return
  const node = point.startContainer
  if (node.nodeType === Node.TEXT_NODE && node.nodeValue) {
    const text = node.nodeValue
    let start = point.startOffset
    let end = point.startOffset
    const isWord = (ch: string) => /[\p{L}\p{N}'’\-]/u.test(ch)
    while (start > 0 && isWord(text[start - 1] ?? '')) start -= 1
    while (end < text.length && isWord(text[end] ?? '')) end += 1
    if (end > start) {
      const range = doc.createRange()
      range.setStart(node, start)
      range.setEnd(node, end)
      sel.removeAllRanges()
      sel.addRange(range)
      return
    }
  }
  sel.removeAllRanges()
  sel.addRange(point)
  const win = doc.defaultView
  try {
    win?.getSelection()?.modify('move', 'backward', 'word')
    win?.getSelection()?.modify('extend', 'forward', 'word')
  } catch {
    /* modify() missing */
  }
}
