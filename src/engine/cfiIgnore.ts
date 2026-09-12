import * as CFI from 'foliate-js/epubcfi.js'
import type { View } from 'foliate-js/view.js'

/** Skip injected bookmark marks and annotation wrappers so CFIs stay stable. */
export function cfiIgnoreNode(node: Node): number {
  if (!(node instanceof Element)) return NodeFilter.FILTER_ACCEPT
  if (node.hasAttribute('data-lg-ann') || node.classList.contains('lg-pmark')) {
    return NodeFilter.FILTER_SKIP
  }
  return NodeFilter.FILTER_ACCEPT
}

export function rangeFromCfi(doc: Document, cfi: string): Range {
  const parsed = CFI.parse(cfi) as { parent?: unknown[] } | unknown[]
  const top = (parsed as { parent?: unknown[] }).parent ?? parsed
  if (Array.isArray(top) && top.length) top.shift()
  return CFI.toRange(doc, parsed, cfiIgnoreNode)
}

export function installCfiIgnore(view: View) {
  const book = view.book as {
    sections: Array<{ cfi?: string }>
    resolveCFI?: (cfi: string) => { index: number; anchor: (doc: Document) => Range | Element | number }
  }
  const origResolve = book.resolveCFI?.bind(book)
  if (origResolve) {
    book.resolveCFI = (cfi: string) => {
      const { index } = origResolve(cfi)
      return {
        index,
        anchor: (doc: Document) => rangeFromCfi(doc, cfi),
      }
    }
  }
  view.getCFI = (index: number, range?: Range) => {
    const baseCFI = book.sections[index]?.cfi ?? CFI.fake.fromIndex(index)
    if (!range) return baseCFI
    return CFI.joinIndir(baseCFI, CFI.fromRange(range, cfiIgnoreNode))
  }
}
