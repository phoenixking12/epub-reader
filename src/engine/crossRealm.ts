/** iframe nodes live in another JS realm, so `instanceof Element` is false in the parent. */

export function isElement(node: EventTarget | Node | null | undefined): node is Element {
  return Boolean(node && (node as Node).nodeType === 1)
}

export function isHtmlElement(node: EventTarget | Node | null | undefined): node is HTMLElement {
  return isElement(node) && typeof (node as HTMLElement).style === 'object'
}

export function isHtmlImage(node: EventTarget | Node | null | undefined): node is HTMLImageElement {
  return isElement(node) && (node as Element).tagName === 'IMG'
}
