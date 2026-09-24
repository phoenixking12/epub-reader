import { isHTMLElement } from './inlineMark'

const CONTAINER = /^(DIV|SECTION|ARTICLE|MAIN|HEADER|BLOCKQUOTE|UL|OL|FIGURE|ASIDE)$/
const BLOCK = /^(P|H1|H2|H3|H4|H5|H6|LI|DIV|PRE)$/
const ROLE = /(?:^|[\s_-])(title|subtitle|subhead|subheading|chapter|heading|bridgehead|scene)(?:$|[\s_-])/i

export function reasilyBlocks(root: ParentNode): HTMLElement[] {
  const out: HTMLElement[] = []
  const visit = (el: ParentNode) => {
    for (const child of Array.from(el.children)) {
      if (!isHTMLElement(child)) continue
      const tag = child.tagName
      if (CONTAINER.test(tag)) {
        const nested = Array.from(child.children).some(
          (node) => isHTMLElement(node) && (CONTAINER.test(node.tagName) || BLOCK.test(node.tagName)),
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
  if (/^H[1-6]$/.test(el.tagName)) return true
  const role = `${el.getAttribute('epub:type') || ''} ${typeof el.className === 'string' ? el.className : ''} ${el.id}`
  if (ROLE.test(role)) return true
  const align = `${el.getAttribute('align') || ''} ${el.style?.textAlign || ''}`
  return /center/i.test(align) && isOpeningTitle(text)
}

/**
 * Tag one chapter the way a novel layout does: the opening title is centered and
 * large, later scene lines are centered and bold, and prose is indented after
 * the first paragraph. Books differ because the tags follow their own headings.
 */
export function applyReasilyDocument(doc: Document, enabled: boolean) {
  const body = doc.body
  if (!body) return
  const blocks = reasilyBlocks(body)
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
      el.classList.add(!seenChapter ? 'lg-reasily-chapter' : 'lg-reasily-scene')
      seenChapter = true
      afterHeading = true
      continue
    }
    el.classList.add('lg-reasily-body')
    if (afterHeading || !seenChapter) el.classList.add('lg-reasily-first')
    afterHeading = false
    opening = false
    seenChapter = true
  }
}
