export interface ReaderProgress {
  bookFraction: number
  chapterFraction: number
  page: number
  pages: number
  scrolled: boolean
}

export function formatCornerProgress(progress: ReaderProgress): { primary: string; secondary: string } {
  const bookPct = Math.round(clamp01(progress.bookFraction) * 100)
  const chapterPct = Math.round(clamp01(progress.chapterFraction) * 100)
  if (progress.scrolled) {
    return {
      primary: `${bookPct}%`,
      secondary: `${chapterPct}% chapter`,
    }
  }
  const pages = Math.max(1, progress.pages)
  const page = Math.min(pages, Math.max(1, progress.page))
  return {
    primary: `${page} / ${pages}`,
    secondary: `${bookPct}%`,
  }
}

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0
  return Math.min(1, Math.max(0, n))
}
