interface Props {
  bookFraction: number
  onBookJump: (fraction: number) => void
}

export function ProgressScrub({ bookFraction, onBookJump }: Props) {
  return (
    <div className="book-scrub-wrap">
      <input
        className="book-scrub"
        type="range"
        min={0}
        max={1000}
        value={Math.round(bookFraction * 1000)}
        aria-label="Jump in book"
        onChange={(e) => onBookJump(Number(e.target.value) / 1000)}
      />
    </div>
  )
}
