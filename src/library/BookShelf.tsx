import type { BookRecord } from '../types/models'

interface Props {
  books: BookRecord[]
  onOpen: (id: string) => void
}

const SPINES = ['#7f1d1d', '#9a3412', '#1e3a5f', '#3f6212', '#4c1d95', '#854d0e', '#134e4a', '#1c1917']

function spineColor(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 33 + id.charCodeAt(i)) >>> 0
  return SPINES[h % SPINES.length]
}

function shortTitle(title: string) {
  const t = title.replace(/\s+/g, ' ').trim()
  return t.length > 42 ? `${t.slice(0, 40)}…` : t || 'Untitled'
}

export function BookShelf({ books, onOpen }: Props) {
  return (
    <section className="shelf-bay" aria-label="Bookshelf">
      <div className="shelf-hood">
        <p className="shelf-kicker">On the shelf</p>
        <p className="shelf-count">
          {books.length ? `${books.length} ${books.length === 1 ? 'volume' : 'volumes'}` : 'Waiting for the first volume'}
        </p>
      </div>
      <div className="shelf-case">
        <div className="shelf-row">
          {books.length === 0 ? (
            <div className="shelf-empty">Add an EPUB and a spine will appear here.</div>
          ) : (
            books.map((book, i) => (
              <button
                key={book.id}
                type="button"
                className="spine"
                style={{
                  background: spineColor(book.id),
                  animationDelay: `${Math.min(i, 18) * 45}ms`,
                }}
                title={book.title}
                onClick={() => onOpen(book.id)}
              >
                <span className="spine-title">{shortTitle(book.title)}</span>
              </button>
            ))
          )}
        </div>
        <div className="shelf-plank" />
      </div>
    </section>
  )
}
