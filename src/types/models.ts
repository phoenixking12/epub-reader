export type AnnotationStyle =
  | 'highlight'
  | 'underline'
  | 'strike'
  | 'squiggly'
  | 'bold'
  | 'italic'
  | 'textColor'

export type BookmarkKind = 'position' | 'selection' | 'paragraph' | 'chapter'

export type ReaderFlow = 'paginated' | 'scrolled'

export type PageTurnMode = 'swipe' | 'buttons' | 'volume' | 'scroll'

export type ThemeId = 'day' | 'sepia' | 'night' | 'custom'

export type JustifyMode = 'justify' | 'start'

export type WebSearchEngine = 'wiktionary' | 'google' | 'duckduckgo'

export type FootnotePosition = 'popup' | 'bottom' | 'follow'

export type LibrarySort = 'title' | 'title-desc' | 'added' | 'added-old' | 'opened'

export type LibraryGroup = 'none' | 'author'

export interface DisplaySettings {
  theme: ThemeId
  customBg: string
  customFg: string
  customLink: string
  fontFamily: string
  fontSize: number
  lineHeight: number
  margin: number
  maxInlineSize: number
  gap: number
  justify: boolean
  hyphenate: boolean
  flow: ReaderFlow
  pageTurnMode: PageTurnMode
  brightness: number
  brightnessMode: 'auto' | 'manual'
  customHighlightColors: string[]
  writingMode: 'auto' | 'horizontal-tb' | 'vertical-rl' | 'vertical-lr'
  customCss: string
  footnotePosition: FootnotePosition
  defaultAnnotationStyle: AnnotationStyle
  defaultAnnotationColor: string
  invertImagesInNight: boolean
  progressSlider: boolean
}

export interface BookRecord {
  id: string
  title: string
  authors: string[]
  description: string
  language: string
  identifier: string
  publisher: string
  cover: Blob | null
  fileKey: string
  sourceKind: 'copy' | 'shortcut'
  sourcePath?: string
  addedAt: number
  lastOpenedAt: number
  progressCfi: string
  progressFraction: number
  labels: string[]
  pinned: boolean
  dir: 'ltr' | 'rtl'
}

export interface BookmarkRecord {
  id: string
  bookId: string
  cfi: string
  quote: string
  title: string
  kind: BookmarkKind
  order: number
  createdAt: number
}

export interface AnnotationRecord {
  id: string
  bookId: string
  cfiRange: string
  quote: string
  style: AnnotationStyle
  color: string
  note: string
  createdAt: number
}

export interface FontRecord {
  id: string
  family: string
  style: string
  weight: string
  blob: Blob
  fileName: string
}

export interface SettingsRecord {
  id: 'global'
  display: DisplaySettings
  lastBookId: string | null
  webSearchEngine: WebSearchEngine
  regexSearch: boolean
  librarySort: LibrarySort
  libraryGroup: LibraryGroup
}

export interface FileRecord {
  id: string
  blob: Blob
  name: string
}

export interface TocNode {
  label: string
  href: string
  subitems?: TocNode[]
}
