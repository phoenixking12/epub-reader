import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useRef, useState } from 'react'
import { db, saveSettings } from '../db'
import { isNative } from '../native/platform'
import { DEFAULT_SETTINGS } from '../settings/defaults'
import type { BookRecord, LibraryGroup, LibrarySort } from '../types/models'
import { importEpubFile, removeBook } from './importBook'
import { addBooksFromFiles, formatImportSummary, ingestNativeItems, pickNativeBooks } from './addBooks'
import { groupBooks } from './sort'

interface Props {
  onOpen: (id: string) => void
  onSettings: () => void
}

export function LibraryPage({ onOpen, onSettings }: Props) {
  const books = useLiveQuery(() => db.books.toArray()) ?? []
  const settings = useLiveQuery(() => db.settings.get('global'))
  const sort = settings?.librarySort ?? DEFAULT_SETTINGS.librarySort
  const group = settings?.libraryGroup ?? DEFAULT_SETTINGS.libraryGroup
  const [q, setQ] = useState('')
  const [label, setLabel] = useState<string | 'all'>('all')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [menuId, setMenuId] = useState<string | null>(null)
  const [labelBook, setLabelBook] = useState<BookRecord | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const folderRef = useRef<HTMLInputElement>(null)

  const labels = useMemo(() => {
    const set = new Set<string>()
    for (const b of books) for (const l of b.labels) set.add(l)
    return [...set].sort()
  }, [books])

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    return books
      .filter((b) => (label === 'all' ? true : b.labels.includes(label)))
      .filter((b) => {
        if (!query) return true
        return (
          b.title.toLowerCase().includes(query) ||
          b.authors.join(' ').toLowerCase().includes(query) ||
          b.labels.join(' ').toLowerCase().includes(query)
        )
      })
  }, [books, q, label])

  const sections = useMemo(() => groupBooks(filtered, sort, group), [filtered, sort, group])

  const finishImport = (summary: { added: number; skipped: number }, empty = false) => {
    setStatus(formatImportSummary(summary, empty))
    if (!summary.added && !summary.skipped && !empty) setError('Only EPUB files are supported')
  }

  const addFiles = async (files: FileList | File[]) => {
    setBusy(true)
    setError('')
    setStatus('')
    setAddOpen(false)
    try {
      const summary = await addBooksFromFiles(files, (done, total) => setProgress(`Adding ${done}/${total}`))
      finishImport(summary)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not import EPUB')
    } finally {
      setBusy(false)
      setProgress('')
    }
  }

  const addFromNative = async (mode: 'files' | 'folder') => {
    setAddOpen(false)
    setBusy(true)
    setError('')
    setStatus('')
    try {
      const picked = await pickNativeBooks(mode)
      if (picked.cancelled) return
      if (!picked.items.length) {
        finishImport({ added: 0, skipped: 0 }, true)
        return
      }
      const summary = await ingestNativeItems(picked.items, (done, total) => setProgress(`Adding ${done}/${total}`))
      finishImport(summary)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not import EPUB')
    } finally {
      setBusy(false)
      setProgress('')
    }
  }

  const startAddFiles = () => {
    if (isNative()) void addFromNative('files')
    else fileRef.current?.click()
  }

  const startAddFolder = () => {
    if (isNative()) void addFromNative('folder')
    else folderRef.current?.click()
  }

  return (
    <div
      className="library"
      onClick={() => {
        setMenuId(null)
        setLabelBook(null)
        setAddOpen(false)
      }}
    >
      <header className="lib-top">
        <div>
          <p className="eyebrow">Library</p>
          <h1>{books.length ? `${books.length} book${books.length === 1 ? '' : 's'}` : 'Your books'}</h1>
        </div>
        <button className="icon-btn" onClick={onSettings}>
          Settings
        </button>
      </header>

      <div className="lib-tools">
        <input
          className="search-input"
          placeholder="Search title, author, label"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="lib-filters">
          <select
            value={sort}
            aria-label="Sort books"
            onChange={(e) => void saveSettings({ librarySort: e.target.value as LibrarySort })}
          >
            <option value="opened">Recent</option>
            <option value="title">A–Z</option>
            <option value="title-desc">Z–A</option>
            <option value="added">Newest</option>
            <option value="added-old">Oldest</option>
          </select>
          <select
            value={group}
            aria-label="Arrange books"
            onChange={(e) => void saveSettings({ libraryGroup: e.target.value as LibraryGroup })}
          >
            <option value="none">All books</option>
            <option value="author">By author</option>
          </select>
          {labels.length > 0 && (
            <select value={label} onChange={(e) => setLabel(e.target.value)} aria-label="Filter label">
              <option value="all">All labels</option>
              {labels.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {status && <p className="ok">{status}</p>}

      {sections.map((section) => (
        <section key={section.heading ?? 'all'} className="author-block">
          {section.heading ? <h2 className="author-heading">{section.heading}</h2> : null}
          <div className="book-grid">
            {section.books.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                menuOpen={menuId === book.id}
                onOpen={onOpen}
                onMenu={(id) => {
                  setLabelBook(null)
                  setMenuId(id)
                }}
                onEditLabels={() => {
                  setMenuId(null)
                  setLabelBook(book)
                }}
              />
            ))}
          </div>
        </section>
      ))}

      {filtered.length === 0 && (
        <div className="empty">
          <p>{books.length ? 'No books match that search.' : 'Add EPUB files or a folder. Books are copied onto the device and read offline.'}</p>
          {!books.length && (
            <button
              className="chip active"
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                try {
                  const res = await fetch('/sample.epub')
                  const blob = await res.blob()
                  await importEpubFile(new File([blob], 'sample.epub', { type: 'application/epub+zip' }))
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Could not load sample')
                } finally {
                  setBusy(false)
                }
              }}
            >
              Try a sample
            </button>
          )}
        </div>
      )}

      {labelBook && (
        <LabelEditor
          book={labelBook}
          onClose={() => setLabelBook(null)}
          onSave={async (next) => {
            await db.books.update(labelBook.id, { labels: next })
            setLabelBook(null)
          }}
        />
      )}

      <input
        ref={fileRef}
        type="file"
        accept=".epub,application/epub+zip"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) void addFiles(e.target.files)
          e.target.value = ''
        }}
      />
      <input
        ref={folderRef}
        type="file"
        multiple
        hidden
        {...{ webkitdirectory: '', directory: '' }}
        onChange={(e) => {
          if (e.target.files) void addFiles(e.target.files)
          e.target.value = ''
        }}
      />
      {addOpen && (
        <div className="sheet add-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Add books">
          <div className="sheet-handle" />
          <header className="sheet-head">
            <h2>Add books</h2>
            <button className="icon-btn" onClick={() => setAddOpen(false)}>
              Cancel
            </button>
          </header>
          <p className="muted">
            {isNative()
              ? 'Files and folders are copied into the app. After that, reading works with no internet.'
              : 'Choose one or more EPUB files, or a folder that contains them.'}
          </p>
          <div className="action-row">
            <button className="chip active" disabled={busy} onClick={startAddFiles}>
              Choose files
            </button>
            <button className="chip" disabled={busy} onClick={startAddFolder}>
              Choose folder
            </button>
          </div>
        </div>
      )}
      <div className="fab-row">
        <button
          className="fab"
          disabled={busy}
          onClick={(e) => {
            e.stopPropagation()
            setAddOpen(true)
          }}
        >
          {busy ? progress || 'Adding…' : '+ Add'}
        </button>
      </div>
    </div>
  )
}

function BookCard({
  book,
  menuOpen,
  onOpen,
  onMenu,
  onEditLabels,
}: {
  book: BookRecord
  menuOpen: boolean
  onOpen: (id: string) => void
  onMenu: (id: string | null) => void
  onEditLabels: () => void
}) {
  const pct = Math.round(book.progressFraction * 100)
  return (
    <article className={`book-card ${book.pinned ? 'pinned' : ''}`}>
      <button className="cover-btn" onClick={() => onOpen(book.id)}>
        {book.cover ? <Cover book={book} /> : <div className="cover-fallback">{book.title.slice(0, 1)}</div>}
        {book.pinned ? <span className="pin-badge">Pinned</span> : null}
        {pct > 0 && (
          <div className="progress">
            <i style={{ width: `${pct}%` }} />
          </div>
        )}
      </button>
      <div className="card-meta">
        <button className="card-title" onClick={() => onOpen(book.id)}>
          <h3>{book.title}</h3>
          <p className="muted">{book.authors.join(', ') || 'Unknown author'}</p>
          {pct > 0 ? <p className="muted tiny">{pct}% read</p> : null}
          {book.labels.length > 0 && (
            <p className="label-chips">
              {book.labels.map((l) => (
                <span key={l}>{l}</span>
              ))}
            </p>
          )}
        </button>
        <button
          className="more-btn"
          aria-label="Book options"
          aria-expanded={menuOpen}
          onClick={(e) => {
            e.stopPropagation()
            onMenu(menuOpen ? null : book.id)
          }}
        >
          ⋮
        </button>
      </div>
      {menuOpen && (
        <div className="card-menu" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => {
              void db.books.update(book.id, { pinned: !book.pinned })
              onMenu(null)
            }}
          >
            {book.pinned ? 'Unpin' : 'Pin to top'}
          </button>
          <button onClick={onEditLabels}>Edit labels</button>
          {isNative() && (
            <button
              onClick={() => {
                void import('../native/incoming').then(({ IncomingEpub }) =>
                  IncomingEpub.pinShortcut({ id: book.id, title: book.title }).catch((err: Error) =>
                    alert(err.message || 'Could not add home shortcut'),
                  ),
                )
                onMenu(null)
              }}
            >
              Add to home screen
            </button>
          )}
          <button
            className="danger"
            onClick={() => {
              if (confirm(`Remove “${book.title}”?`)) void removeBook(book.id)
              onMenu(null)
            }}
          >
            Delete
          </button>
        </div>
      )}
    </article>
  )
}

function LabelEditor({
  book,
  onClose,
  onSave,
}: {
  book: BookRecord
  onClose: () => void
  onSave: (labels: string[]) => void
}) {
  const [text, setText] = useState(book.labels.join(', '))
  return (
    <div
      className="sheet label-sheet"
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-label="Edit labels"
    >
      <div className="sheet-handle" />
      <header className="sheet-head">
        <h2>Labels</h2>
        <button className="icon-btn" onClick={onClose}>
          Cancel
        </button>
      </header>
      <p className="muted">Separate with commas. Used to filter the library.</p>
      <input
        className="search-input"
        value={text}
        autoFocus
        placeholder="fiction, reread"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSave(parseLabels(text))
        }}
      />
      <div className="action-row">
        <button className="chip active" onClick={() => onSave(parseLabels(text))}>
          Save
        </button>
      </div>
    </div>
  )
}

function parseLabels(text: string) {
  return [...new Set(text.split(',').map((s) => s.trim()).filter(Boolean))]
}

function Cover({ book }: { book: BookRecord }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!book.cover) {
      setUrl(null)
      return
    }
    const next = URL.createObjectURL(book.cover)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [book.id, book.cover])
  if (!url) return null
  return <img src={url} alt="" className="cover" />
}
