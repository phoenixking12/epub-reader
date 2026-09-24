import { isHTMLElement } from './inlineMark'

export function annotationWrapFromNode(node: Node | null | undefined): HTMLElement | null {
  const el = isHTMLElement(node) ? node : node?.parentElement ?? null
  const wrap = el?.closest?.('[data-lg-ann]')
  return isHTMLElement(wrap) && wrap.dataset.lgAnn ? wrap : null
}

export function annotationWrapFromRange(range: Range): HTMLElement | null {
  const start = annotationWrapFromNode(range.startContainer)
  const end = annotationWrapFromNode(range.endContainer)
  if (start && start === end) return start
  if (start && start.contains(range.startContainer) && start.contains(range.endContainer)) return start
  if (end && end.contains(range.startContainer) && end.contains(range.endContainer)) return end
  const root = range.commonAncestorContainer
  const host = root instanceof Element ? root : root.parentElement
  if (!host) return start ?? end
  const hits: HTMLElement[] = []
  for (const node of host.querySelectorAll('[data-lg-ann]')) {
    if (!isHTMLElement(node)) continue
    try {
      if (range.intersectsNode(node)) hits.push(node)
    } catch {
      /* detached */
    }
  }
  if (hits.length === 1) return hits[0]
  return hits.find((span) => span.contains(range.startContainer) && span.contains(range.endContainer)) ?? start ?? end
}

export function annotationWrapFromPoint(doc: Document, x: number, y: number, caret?: Range | null): HTMLElement | null {
  const fromCaret = annotationWrapFromNode(caret?.startContainer)
  if (fromCaret) return fromCaret
  const hit = typeof doc.elementFromPoint === 'function' ? doc.elementFromPoint(x, y) : null
  const fromEl = annotationWrapFromNode(hit)
  if (fromEl) return fromEl
  for (const node of doc.querySelectorAll('[data-lg-ann]')) {
    if (!isHTMLElement(node)) continue
    for (const box of node.getClientRects()) {
      if (x >= box.left && x <= box.right && y >= box.top && y <= box.bottom) return node
    }
  }
  return null
}
