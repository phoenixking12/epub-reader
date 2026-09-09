/** iframe nodes live in another JS realm, so `instanceof Element` is false in the parent. */

export function isElement(node: unknown): node is Element {
  return Boolean(node && typeof node === 'object' && (node as Node).nodeType === 1)
}

export function isHtmlElement(node: unknown): node is HTMLElement {
  return isElement(node) && typeof (node as HTMLElement).style === 'object'
}

export function isHtmlImage(node: unknown): node is HTMLImageElement {
  return isElement(node) && (node as Element).tagName === 'IMG'
}
