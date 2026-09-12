import { useEffect, useMemo, useState } from 'react'
import type { BookRecord } from '../types/models'

interface Props {
  books: BookRecord[]
  onOpen: (id: string) => void
}

const LEATHER = [
  '#4a1515',
  '#6b2d12',
  '#1d3557',
  '#23401a',
  '#3b1d54',
  '#5c3b12',
  '#123d3a',
  '#1c1917',
  '#7c2d12',
  '#312e81',
  '#44403c',
  '#7f1d1d',
]

function hashOf(id: string) {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619)
  return h >>> 0
}

function tomeLook(book: BookRecord) {
  const h = hashOf(book.id)
  const height = 118 + (h % 46)
  const width = 22 + (h % 14)
  const lean = h % 11 === 0 ? -7 : h % 13 === 0 ? 6 : 0
  const bands = 1 + (h % 3)
  const cloth = h % 5 === 0
  return {
    color: LEATHER[h % LEATHER.length],
    height,
    width,
    lean,
    bands,
    cloth,
  }
}

function shortTitle(title: string) {
  const t = title.replace(/\s+/g, ' ').trim()
  return t.length > 36 ? `${t.slice(0, 34)}…` : t || 'Untitled'
}

function rowsOf<T>(items: T[], size: number) {
  const rows: T[][] = []
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size))
  return rows.length ? rows : [[]]
}

function useCoverUrl(cover: Blob | null, id: string) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!cover) {
      setUrl(null)
      return
    }
    const next = URL.createObjectURL(cover)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [cover, id])
  return url
}

function Tome({ book, onOpen, index }: { book: BookRecord; onOpen: (id: string) => void; index: number }) {
  const look = useMemo(() => tomeLook(book), [book])
  const cover = useCoverUrl(book.cover, book.id)
  const read = Math.round(Math.min(1, Math.max(0, book.progressFraction)) * 100)
  return (
    <button
      type="button"
      className={`tome ${look.cloth ? 'cloth' : 'leather'}`}
      style={{
        width: look.width,
        height: look.height,
        backgroundColor: look.color,
        animationDelay: `${Math.min(index, 16) * 45}ms`,
        ['--tilt' as string]: `${look.lean}deg`,
        ['--read' as string]: `${read}%`,
        backgroundImage: cover
          ? `linear-gradient(90deg, rgba(0,0,0,0.45), transparent 18%, transparent 78%, rgba(0,0,0,0.5)), url(${cover})`
          : undefined,
      }}
      title={`${book.title}${book.authors[0] ? ` — ${book.authors[0]}` : ''}`}
      onClick={() => onOpen(book.id)}
    >
      <span className="tome-caps" aria-hidden />
      {look.bands > 1 ? <span className="tome-band" aria-hidden /> : null}
      <span className="tome-title">{shortTitle(book.title)}</span>
      <span className="tome-ribbon" aria-hidden />
    </button>
  )
}

function Bookend({ side }: { side: 'left' | 'right' }) {
  return (
    <div className={`bookend ${side}`} aria-hidden>
      <span className="bookend-face" />
      <span className="bookend-crest" />
    </div>
  )
}

export function BookShelf({ books, onOpen }: Props) {
  const rows = rowsOf(books, 8)
  return (
    <section className="shelf-bay" aria-label="Bookshelf">
      <div className="shelf-hood">
        <p className="shelf-kicker">The stacks</p>
        <p className="shelf-count">
          {books.length ? `${books.length} ${books.length === 1 ? 'volume' : 'volumes'}` : 'A lamp, and empty oak'}
        </p>
      </div>
      <div className="bookcase">
        <div className="case-crown">
          <span className="case-pediment" />
          <span className="case-lantern" aria-hidden />
          <span className="case-plate">LoreGuard</span>
        </div>
        <div className="case-body">
          <div className="case-lamp" aria-hidden />
          {rows.map((row, r) => (
            <div key={r} className="case-tier">
              <div className="shelf-row">
                <Bookend side="left" />
                {row.length === 0 ? (
                  <p className="shelf-empty">Add an EPUB and a bound spine will take this place.</p>
                ) : (
                  row.map((book, i) => <Tome key={book.id} book={book} onOpen={onOpen} index={r * 8 + i} />)
                )}
                <Bookend side="right" />
              </div>
              <div className="shelf-plank" />
            </div>
          ))}
        </div>
        <div className="case-base" />
      </div>
    </section>
  )
}
