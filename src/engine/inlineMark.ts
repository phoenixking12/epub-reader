import type { AnnotationRecord, AnnotationStyle } from '../types/models'

function cssEscape(value: string) {
  const escape = globalThis.CSS?.escape
  if (escape) return escape(value)
  return value.replace(/(["\\])/g, '\\$1')
}

export function annSelector(id: string) {
  return `[data-lg-ann="${cssEscape(id)}"]`
}

export function isInlineMark(style: AnnotationStyle) {
  return style === 'textColor' || style === 'bold' || style === 'italic'
}

function unwrapElement(el: Element) {
  const parent = el.parentNode
  if (!parent) return
  while (el.firstChild) parent.insertBefore(el.firstChild, el)
  parent.removeChild(el)
  if ('normalize' in parent) parent.normalize()
}

export function unwrapAnnSpans(doc: Document, id: string) {
  doc.querySelectorAll(annSelector(id)).forEach((el) => unwrapElement(el))
}

function unwrapNestedMarks(host: HTMLElement) {
  for (const el of [...host.querySelectorAll('[data-lg-kind="textColor"]')]) unwrapElement(el)
}

/** The colored wrapper that actually paints these letters, including one nested around them. */
export function outermostTextColor(range: Range): HTMLElement | null {
  const start = range.commonAncestorContainer
  let cur: Element | null = start instanceof Element ? start : start.parentElement
  let found: HTMLElement | null = null
  while (cur) {
    if (cur instanceof HTMLElement && cur.dataset.lgKind === 'textColor' && cur.dataset.lgAnn) found = cur
    cur = cur.parentElement
  }
  return found
}

export function styleInlineSpan(span: HTMLElement, rec: Pick<AnnotationRecord, 'id' | 'style' | 'color'>) {
  span.dataset.lgAnn = rec.id
  span.dataset.lgKind = rec.style
  span.removeAttribute('style')
  if (rec.style === 'textColor') {
    span.style.setProperty('--lg-mark-color', rec.color)
    span.style.setProperty('color', rec.color, 'important')
    span.style.setProperty('-webkit-text-fill-color', rec.color, 'important')
    for (const child of span.querySelectorAll('*')) {
      if (!(child instanceof HTMLElement) || child.hasAttribute('data-lg-ann')) continue
      child.style.setProperty('color', rec.color, 'important')
      child.style.setProperty('-webkit-text-fill-color', rec.color, 'important')
    }
  }
  if (rec.style === 'bold') span.style.setProperty('font-weight', '700', 'important')
  if (rec.style === 'italic') span.style.setProperty('font-style', 'italic', 'important')
}

function retargetRange(range: Range, node: Node) {
  try {
    range.selectNode(node)
  } catch {
    try {
      range.selectNodeContents(node)
    } catch {
      /* detached */
    }
  }
}

export function applyInlineMark(doc: Document, range: Range, rec: AnnotationRecord) {
  if (!isInlineMark(rec.style)) {
    unwrapAnnSpans(doc, rec.id)
    return
  }
  const own = [...doc.querySelectorAll(annSelector(rec.id))].filter(
    (el): el is HTMLElement => el instanceof HTMLElement,
  )
  let host = rec.style === 'textColor' ? (own[0] ?? outermostTextColor(range)) : own[0]
  if (host && rec.style === 'textColor') {
    let cur: Element | null = host.parentElement
    while (cur) {
      if (cur instanceof HTMLElement && cur.dataset.lgKind === 'textColor' && cur.dataset.lgAnn) host = cur
      cur = cur.parentElement
    }
  }
  if (host) {
    styleInlineSpan(host, rec)
    if (rec.style === 'textColor') unwrapNestedMarks(host)
    for (const extra of own) {
      if (extra !== host) unwrapElement(extra)
    }
    retargetRange(range, host)
    return
  }
  const span = doc.createElement('span')
  styleInlineSpan(span, rec)
  try {
    range.surroundContents(span)
  } catch {
    span.append(range.extractContents())
    range.insertNode(span)
  }
  if (rec.style === 'textColor') unwrapNestedMarks(span)
  retargetRange(range, span)
}

export function inlineSpanPainted(docs: Array<Document | undefined>, id: string) {
  const sel = annSelector(id)
  return docs.some((doc) => Boolean(doc?.querySelector(sel)))
}
