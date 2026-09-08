declare module 'foliate-js/view.js' {
  export class View extends HTMLElement {
    book: FoliateBook
    renderer: FoliateRenderer
    lastLocation?: FoliateLocation
    history: {
      back(): void
      forward(): void
      canGoBack: boolean
      canGoForward: boolean
    }
    mediaOverlay?: FoliateMediaOverlay
    open(book: File | Blob | string | FoliateBook): Promise<void>
    close(): void
    init(opts: { lastLocation?: string; showTextStart?: boolean }): Promise<void>
    goTo(target: string | number | { fraction: number }): Promise<unknown>
    goToFraction(frac: number): Promise<void>
    goToTextStart(): Promise<void>
    prev(distance?: number): Promise<void>
    next(distance?: number): Promise<void>
    goLeft(): Promise<void> | void
    goRight(): Promise<void> | void
    getCFI(index: number, range?: Range): string
    resolveCFI(cfi: string): { index: number; anchor: (doc: Document) => Range | Element | number }
    resolveNavigation(target: unknown): unknown
    addAnnotation(annotation: { value: string }, remove?: boolean): Promise<unknown>
    deleteAnnotation(annotation: { value: string }): Promise<unknown>
    showAnnotation(annotation: { value: string }): Promise<void>
    deselect(): void
    getSectionFractions(): number[]
    search(opts: FoliateSearchOpts): AsyncGenerator<FoliateSearchResult>
    clearSearch(): void
    startMediaOverlay(): unknown
    select(target: unknown): Promise<void>
  }
  export function makeBook(file: File | Blob | string): Promise<FoliateBook>
  export class UnsupportedTypeError extends Error {}
  export class NotFoundError extends Error {}
}

declare module 'foliate-js/overlayer.js' {
  export class Overlayer {
    element: SVGSVGElement
    add(key: string, range: Range, draw: Function, options?: object): void
    remove(key: string): void
    redraw(): void
    hitTest(e: { x: number; y: number }): [string?, Range?]
    static highlight(rects: DOMRectList, options?: { color?: string }): SVGElement
    static underline(rects: DOMRectList, options?: { color?: string; width?: number }): SVGElement
    static strikethrough(rects: DOMRectList, options?: { color?: string; width?: number }): SVGElement
    static squiggly(rects: DOMRectList, options?: { color?: string; width?: number }): SVGElement
    static outline(rects: DOMRectList, options?: { color?: string }): SVGElement
  }
}

declare module 'foliate-js/footnotes.js' {
  export class FootnoteHandler extends EventTarget {
    detectFootnotes: boolean
    handle(book: FoliateBook, e: { preventDefault(): void; detail: { a: HTMLAnchorElement; href: string } }): Promise<unknown> | void
  }
}

declare module 'foliate-js/epubcfi.js' {
  export const isCFI: RegExp
  export function parse(cfi: string): unknown
  export function fromRange(range: Range, filter?: unknown): string
  export function toRange(doc: Document, parts: unknown, filter?: unknown): Range
  export function compare(a: string, b: string): number
  export function collapse(cfi: string, toEnd?: boolean): string
  export const fake: {
    fromIndex(index: number): string
    toIndex(cfi: unknown): number
  }
  export function joinIndir(...xs: string[]): string
}

declare module 'foliate-js/search.js' {
  export function searchMatcher(
    textWalker: unknown,
    opts: object,
  ): (doc: Document, query: string) => Generator<{ range: Range; excerpt: FoliateExcerpt }>
}

interface FoliateExcerpt {
  pre: string
  match: string
  post: string
}

interface FoliateSearchOpts {
  query: string
  index?: number
  matchCase?: boolean
  matchDiacritics?: boolean
  matchWholeWords?: boolean
}

type FoliateSearchResult =
  | { progress: number }
  | { cfi: string; excerpt: FoliateExcerpt }
  | { label: string; subitems: Array<{ cfi: string; excerpt: FoliateExcerpt }> }
  | 'done'

interface FoliateTocItem {
  label: string
  href: string
  subitems?: FoliateTocItem[]
}

interface FoliateBook {
  sections: Array<{
    id: string
    cfi?: string
    linear?: string
    load(): Promise<string>
    unload?(): void
    createDocument(): Promise<Document>
    size: number
    mediaOverlay?: unknown
    resolveHref?: (href: string) => string
  }>
  toc?: FoliateTocItem[]
  pageList?: FoliateTocItem[]
  landmarks?: Array<{ type: string[]; href: string }>
  metadata?: FoliateMetadata
  rendition?: { layout?: string }
  dir?: 'rtl' | 'ltr'
  media?: { activeClass?: string; playbackActiveClass?: string }
  transformTarget?: EventTarget
  resolveHref(href: string): { index: number; anchor: (doc: Document) => Range | Element | number } | null
  resolveCFI?(cfi: string): { index: number; anchor: (doc: Document) => Range | Element | number }
  isExternal?(href: string): boolean
  getCover?(): Promise<Blob | null>
  getMediaOverlay?(): FoliateMediaOverlay
  getCalibreBookmarks?(): Promise<unknown>
  destroy?(): void
}

interface FoliateMetadata {
  title?: string | Record<string, string> | { name?: string }
  author?: unknown
  language?: string
  description?: string
  identifier?: string
  publisher?: string
  published?: string
}

interface FoliateRenderer extends HTMLElement {
  setStyles?(styles: string | [string, string]): void
  prev(distance?: number): Promise<void>
  next(distance?: number): Promise<void>
  prevSection?(): unknown
  nextSection?(): unknown
  goTo(resolved: unknown): Promise<void>
  getContents(): Array<{ index: number; doc: Document; overlayer?: unknown }>
  destroy(): void
  setAttribute(name: string, value: string): void
}

interface FoliateLocation {
  fraction?: number
  location?: [number, number]
  tocItem?: FoliateTocItem
  pageItem?: FoliateTocItem
  cfi?: string
  range?: Range
  section?: { current: number; total: number }
}

interface FoliateMediaOverlay extends EventTarget {
  start(index: number): unknown
  pause?(): void
  resume?(): void
  stop?(): void
}
