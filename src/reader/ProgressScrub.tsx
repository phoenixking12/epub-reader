import type { PointerEvent } from 'react'

interface Props {
  bookFraction: number
  chapterFraction: number
  primary: string
  secondary: string
  showChapterRail: boolean
  onBookJump: (fraction: number) => void
  onChapterJump: (fraction: number) => void
}

export function ProgressScrub({
  bookFraction,
  chapterFraction,
  primary,
  secondary,
  showChapterRail,
  onBookJump,
  onChapterJump,
}: Props) {
  return (
    <>
      {showChapterRail && (
        <div
          className="chapter-rail"
          role="slider"
          aria-label="Position in chapter"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(chapterFraction * 100)}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            jump(e, onChapterJump)
          }}
          onPointerMove={(e) => {
            if (e.buttons) jump(e, onChapterJump)
          }}
        >
          <i style={{ height: `${Math.round(chapterFraction * 100)}%` }} />
        </div>
      )}
      <div className="read-meter">
        <input
          className="book-scrub"
          type="range"
          min={0}
          max={1000}
          value={Math.round(bookFraction * 1000)}
          aria-label="Position in book"
          onChange={(e) => onBookJump(Number(e.target.value) / 1000)}
        />
        <div className="read-meter-copy">
          <strong>{primary}</strong>
          <span>{secondary}</span>
        </div>
      </div>
    </>
  )
}

function jump(e: PointerEvent<HTMLDivElement>, onJump: (fraction: number) => void) {
  const box = e.currentTarget.getBoundingClientRect()
  const t = (e.clientY - box.top) / Math.max(1, box.height)
  onJump(Math.min(1, Math.max(0, t)))
}
