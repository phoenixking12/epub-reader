export interface ReaderProgress {
  bookFraction: number
  chapterFraction: number
  page: number
  pages: number
  scrolled: boolean
}

export function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0
  return Math.min(1, Math.max(0, n))
}

/** How far the chapter has been read, using the scrollable leftover, not raw offset / content height. */
export function chapterReadFraction(start: number, viewSize: number, viewport: number) {
  const content = Math.max(0, viewSize)
  const vis = Math.max(1, viewport)
  if (content <= vis + 2) return 1
  return clamp01(start / (content - vis))
}

export function formatCornerProgress(progress: ReaderProgress): { primary: string; secondary: string } {
  const bookPct = Math.round(clamp01(progress.bookFraction) * 100)
  const chapterPct = Math.round(clamp01(progress.chapterFraction) * 100)
  if (progress.scrolled) {
    return {
      primary: `${bookPct}%`,
      secondary: `${chapterPct}%`,
    }
  }
  const pages = Math.max(1, progress.pages)
  const page = Math.min(pages, Math.max(1, progress.page))
  return {
    primary: `${page} / ${pages}`,
    secondary: `${bookPct}%`,
  }
}

export function quoteLooksLike(haystack: string, quote: string) {
  const h = haystack.replace(/\s+/g, ' ').trim().toLowerCase()
  const q = quote.replace(/\s+/g, ' ').trim().toLowerCase()
  if (!q || !h) return false
  const clip = q.slice(0, 48)
  return h.startsWith(clip) || (clip.length >= 12 && h.includes(clip.slice(0, 32)))
}
