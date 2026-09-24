import { isHTMLElement } from './inlineMark'

const CONTAINER = /^(DIV|SECTION|ARTICLE|MAIN|HEADER|BLOCKQUOTE|UL|OL|FIGURE|ASIDE)$/
const BLOCK = /^(P|H1|H2|H3|H4|H5|H6|LI|DIV|PRE)$/

/** XHTML documents keep lowercase tag names. HTML documents uppercase them. */
function tagOf(el: Element) {
  return el.localName.toUpperCase()
}
const ROLE = /(?:^|[\s_-])(title|subtitle|subhead|subheading|chapter|heading|bridgehead|scene)(?:$|[\s_-])/i

export function reasilyBlocks(root: ParentNode): HTMLElement[] {
  const out: HTMLElement[] = []
  const visit = (el: ParentNode) => {
    for (const child of Array.from(el.children)) {
      if (!isHTMLElement(child)) continue
      const tag = tagOf(child)
      if (CONTAINER.test(tag)) {
        const nested = Array.from(child.children).some(
          (node) => isHTMLElement(node) && (CONTAINER.test(tagOf(node)) || BLOCK.test(tagOf(node))),
        )
        if (nested) {
          visit(child)
          continue
        }
      }
      if (BLOCK.test(tag)) out.push(child)
    }
  }
  visit(root)
  return out
}

function visibleText(el: HTMLElement) {
  return (el.textContent || '').replace(/\s+/g, ' ').trim()
}

function isSceneBreak(text: string) {
  return text.length > 0 && text.length <= 24 && /^[\s*#~•·.\-–—]+$/.test(text) && /[*#~•·\-–—]/.test(text)
}

/** A short untitled line, such as "Home world", before the chapter's prose begins. */
function isOpeningTitle(text: string) {
  if (!text || text.length > 48) return false
  if (/[.!?…;:]/.test(text)) return false
  if (/^["“‘'「]/.test(text)) return false
  const words = text.split(' ').filter(Boolean)
  return words.length > 0 && words.length <= 6
}

function markedHeading(el: HTMLElement, text: string) {
  if (/^H[1-6]$/.test(tagOf(el))) return true
  const role = `${el.getAttribute('epub:type') || ''} ${typeof el.className === 'string' ? el.className : ''} ${el.id}`
  if (ROLE.test(role)) return true
  const align = `${el.getAttribute('align') || ''} ${el.style?.textAlign || ''}`
  return /center/i.test(align) && isOpeningTitle(text)
}

const PAINT = 'data-lg-reasily'
const SAVED_STYLE = 'data-lg-style'

function rememberStyle(el: HTMLElement) {
  if (!el.hasAttribute(SAVED_STYLE)) el.setAttribute(SAVED_STYLE, el.getAttribute('style') ?? '')
}

function restoreStyle(el: HTMLElement) {
  if (!el.hasAttribute(SAVED_STYLE)) return
  const prev = el.getAttribute(SAVED_STYLE) ?? ''
  if (prev) el.setAttribute('style', prev)
  else el.removeAttribute('style')
  el.removeAttribute(SAVED_STYLE)
  el.removeAttribute(PAINT)
}

function bookFace(el: HTMLElement, chosen?: string | null) {
  if (chosen) return chosen
  try {
    const family = getComputedStyle(el).fontFamily
    if (family && family !== 'inherit') return family
  } catch {
    /* jsdom */
  }
  return ''
}

function paint(el: HTMLElement, props: Record<string, string>, face: string) {
  rememberStyle(el)
  el.setAttribute(PAINT, '')
  if (face) el.style.setProperty('font-family', face, 'important')
  el.style.setProperty('font-synthesis', 'weight', 'important')
  for (const [name, value] of Object.entries(props)) el.style.setProperty(name, value, 'important')
  for (const child of Array.from(el.querySelectorAll('*'))) {
    if (!isHTMLElement(child)) continue
    rememberStyle(child)
    child.style.setProperty('letter-spacing', 'inherit', 'important')
    child.style.setProperty('word-spacing', 'inherit', 'important')
    child.style.setProperty('font-size', 'inherit', 'important')
    child.style.setProperty('font-family', 'inherit', 'important')
    child.style.setProperty('font-synthesis', 'weight', 'important')
  }
}

/**
 * Bold and center the chapter title and later headings, without extra gaps.
 * Prose keeps the reader's line height and alignment. The typeface stays the
 * book's own face unless the reader picked one.
 */
export function applyReasilyDocument(
  doc: Document,
  enabled: boolean,
  align: 'justify' | 'start' | 'center' | 'right' | 'left' = 'justify',
  lineHeight = 1.55,
  fontFamily?: string | null,
) {
  const body = doc.body
  if (!body) return
  const blocks = reasilyBlocks(body)
  const styled = Array.from(body.querySelectorAll(`[${SAVED_STYLE}]`)).filter(isHTMLElement)
  for (const el of styled) restoreStyle(el)
  for (const el of blocks) {
    el.classList.remove('lg-reasily-chapter', 'lg-reasily-scene', 'lg-reasily-body', 'lg-reasily-first')
  }
  if (!enabled) return

  let seenChapter = false
  let opening = true
  let afterHeading = false
  for (const el of blocks) {
    const text = visibleText(el)
    if (!text) continue
    const heading = markedHeading(el, text)
    const sceneBreak = isSceneBreak(text)
    const openingTitle = opening && isOpeningTitle(text)
    if (heading || sceneBreak || openingTitle) {
      const chapter = !seenChapter
      el.classList.add(chapter ? 'lg-reasily-chapter' : 'lg-reasily-scene')
      paint(
        el,
        {
          display: 'block',
          'text-align': 'center',
          'text-indent': '0',
          'font-size': chapter ? '1.35em' : '1.15em',
          'font-weight': '700',
          'line-height': String(lineHeight),
          'letter-spacing': 'normal',
          'word-spacing': 'normal',
          margin: '0',
          padding: '0',
          width: 'auto',
          'max-width': 'none',
        },
        bookFace(el, fontFamily),
      )
      seenChapter = true
      afterHeading = true
      continue
    }
    const first = afterHeading || !seenChapter
    el.classList.add('lg-reasily-body')
    if (first) el.classList.add('lg-reasily-first')
    paint(
      el,
      {
        display: 'block',
        'text-align': align === 'start' ? 'left' : align,
        'text-indent': first ? '0' : '1.5em',
        'font-size': '1em',
        'font-weight': '400',
        'line-height': String(lineHeight),
        'letter-spacing': 'normal',
        'word-spacing': 'normal',
        margin: '0',
        padding: '0',
      },
      bookFace(el, fontFamily),
    )
    afterHeading = false
    opening = false
    seenChapter = true
  }
}
