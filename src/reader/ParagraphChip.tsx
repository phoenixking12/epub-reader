interface Props {
  x: number
  y: number
  bookmarked: boolean
  onBookmark: () => void
}

export function ParagraphChip({ x, y, bookmarked, onBookmark }: Props) {
  const left = Math.min(Math.max(8, x - 28), typeof window === 'undefined' ? x : window.innerWidth - 56)
  const top = Math.min(Math.max(8, y - 12), typeof window === 'undefined' ? y : window.innerHeight - 56)
  return (
    <button
      type="button"
      className={`para-chip ${bookmarked ? 'on' : ''}`}
      style={{ left, top }}
      onClick={onBookmark}
    >
      {bookmarked ? 'Bookmarked' : 'Bookmark'}
    </button>
  )
}
