import type {
  AnnotationRecord,
  BookRecord,
  BookmarkRecord,
  DisplaySettings,
  FileRecord,
  FontRecord,
  PageTurnMode,
  SettingsRecord,
} from '../types/models'

export const DEFAULT_DISPLAY: DisplaySettings = {
  theme: 'sepia',
  customBg: '#f4efe6',
  customFg: '#1c1917',
  customLink: '#9a3412',
  fontFamily: 'publisher',
  fontSize: 18,
  lineHeight: 1.55,
  margin: 4,
  maxInlineSize: 1200,
  gap: 2,
  justify: true,
  hyphenate: true,
  flow: 'paginated',
  pageTurnMode: 'swipe',
  brightness: 1,
  brightnessMode: 'auto',
  customHighlightColors: [],
  writingMode: 'auto',
  customCss: '',
  footnotePosition: 'popup',
  defaultAnnotationStyle: 'highlight',
  defaultAnnotationColor: '#facc15',
  invertImagesInNight: false,
  progressSlider: false,
}

export const THEMES: Record<
  Exclude<DisplaySettings['theme'], 'custom'>,
  { bg: string; fg: string; link: string }
> = {
  day: { bg: '#fafafa', fg: '#1c1917', link: '#1d4ed8' },
  sepia: { bg: '#f4efe6', fg: '#3f2e1e', link: '#9a3412' },
  night: { bg: '#121212', fg: '#e7e5e4', link: '#fdba74' },
}

export const BUNDLED_FONTS = [
  { id: 'publisher', label: 'Book default', value: 'publisher' },
  { id: 'source-serif', label: 'Source Serif', value: '"Source Serif 4", Georgia, serif' },
  { id: 'literata', label: 'Literata', value: 'Literata, Georgia, serif' },
  { id: 'newsreader', label: 'Newsreader', value: 'Newsreader, Georgia, serif' },
  { id: 'source-sans', label: 'Source Sans', value: '"Source Sans 3", system-ui, sans-serif' },
  { id: 'ibm-plex', label: 'IBM Plex Sans', value: '"IBM Plex Sans", system-ui, sans-serif' },
  { id: 'jetbrains', label: 'JetBrains Mono', value: '"JetBrains Mono", ui-monospace, monospace' },
  { id: 'system-serif', label: 'System serif', value: 'Georgia, "Times New Roman", serif' },
  { id: 'system-sans', label: 'System sans', value: 'system-ui, -apple-system, sans-serif' },
] as const

export const HIGHLIGHT_COLORS = [
  '#facc15',
  '#86efac',
  '#7dd3fc',
  '#f9a8d4',
  '#fdba74',
  '#c4b5fd',
  '#fca5a5',
  '#e7e5e4',
]

export const DEFAULT_SETTINGS: SettingsRecord = {
  id: 'global',
  display: DEFAULT_DISPLAY,
  lastBookId: null,
  webSearchEngine: 'wiktionary',
  regexSearch: false,
  librarySort: 'opened',
  libraryGroup: 'none',
}

export function newId(): string {
  return crypto.randomUUID()
}

export function usesPublisherFont(family?: string | null): boolean {
  return !family || family === 'publisher'
}

export function flowForPageTurn(mode: PageTurnMode): DisplaySettings['flow'] {
  return mode === 'scroll' ? 'scrolled' : 'paginated'
}

export function migrateDisplay(display?: Partial<DisplaySettings> | null): DisplaySettings {
  const merged = { ...DEFAULT_DISPLAY, ...display }
  const pageTurnMode: PageTurnMode =
    display?.pageTurnMode ?? (display?.flow === 'scrolled' ? 'scroll' : DEFAULT_DISPLAY.pageTurnMode)
  const margin =
    display?.margin == null || display.margin === 24 || display.margin === 8 ? 4 : merged.margin
  const gap = display?.gap == null || display.gap === 7 ? 2 : merged.gap
  const maxInlineSize =
    display?.maxInlineSize == null || display.maxInlineSize === 720 ? 1200 : merged.maxInlineSize
  const savedFamily = display?.fontFamily
  const keepCustomFont =
    Boolean(savedFamily) &&
    savedFamily !== 'publisher' &&
    savedFamily !== '"Source Serif 4", Georgia, serif'
  const fontFamily = keepCustomFont && savedFamily ? savedFamily : 'publisher'
  return {
    ...merged,
    margin,
    gap,
    maxInlineSize,
    fontFamily,
    pageTurnMode,
    flow: flowForPageTurn(pageTurnMode),
    customHighlightColors: merged.customHighlightColors ?? [],
    brightnessMode: merged.brightnessMode ?? 'auto',
    invertImagesInNight: merged.invertImagesInNight ?? false,
    progressSlider: Boolean(merged.progressSlider),
  }
}

export function emptyBook(partial: Partial<BookRecord> & Pick<BookRecord, 'id' | 'fileKey' | 'title'>): BookRecord {
  return {
    authors: [],
    description: '',
    language: '',
    identifier: '',
    publisher: '',
    cover: null,
    sourceKind: 'copy',
    addedAt: Date.now(),
    lastOpenedAt: 0,
    progressCfi: '',
    progressFraction: 0,
    labels: [],
    pinned: false,
    dir: 'ltr',
    ...partial,
  }
}

export type {
  AnnotationRecord,
  BookRecord,
  BookmarkRecord,
  FileRecord,
  FontRecord,
  SettingsRecord,
}
