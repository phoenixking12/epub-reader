import { useEffect, useMemo, useState } from 'react'
import type { AnnotationRecord, BookmarkRecord, TocNode } from '../types/models'

export type DrawerTab = 'toc' | 'marks' | 'notes'

interface Props {
  open: boolean
  tab: DrawerTab
  toc: TocNode[]
  bookmarks: BookmarkRecord[]
  annotations: AnnotationRecord[]
  onTab: (tab: DrawerTab) => void
  onClose: () => void
  onGoTo: (target: string) => void
  onRenameBookmark: (id: string, title: string) => void
  onDeleteBookmark: (id: string) => void
  onDeleteAnnotation: (id: string) => void
  onEditNote: (ann: AnnotationRecord) => void
}

function TocTree({ items, onGoTo }: { items: TocNode[]; onGoTo: (href: string) => void }) {
  if (!items.length) return <p className="muted">No table of contents in this book.</p>
  return (
    <ul className="toc-tree">
      {items.map((item) => (
        <li key={item.href + item.label}>
          <button className="toc-item" onClick={() => onGoTo(item.href)}>
            {item.label}
          </button>
          {item.subitems?.length ? <TocTree items={item.subitems} onGoTo={onGoTo} /> : null}
        </li>
      ))}
    </ul>
  )
}

function styleLabel(style: AnnotationRecord['style']) {
  if (style === 'underline') return 'Underline'
  if (style === 'strike') return 'Strike'
  if (style === 'squiggly') return 'Squiggle'
  if (style === 'bold') return 'Bold'
  if (style === 'textColor') return 'Color'
  return 'Highlight'
}

export function Drawer({
  open,
  tab,
  toc,
  bookmarks,
  annotations,
  onTab,
  onClose,
  onGoTo,
  onRenameBookmark,
  onDeleteBookmark,
  onDeleteAnnotation,
  onEditNote,
}: Props) {
  const [colorFilter, setColorFilter] = useState<string | 'all'>('all')
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const colors = useMemo(() => [...new Set(annotations.map((a) => a.color))], [annotations])
  const notes = useMemo(
    () =>
      annotations
        .filter((a) => colorFilter === 'all' || a.color === colorFilter)
        .slice()
        .sort((a, b) => b.createdAt - a.createdAt),
    [annotations, colorFilter],
  )

  useEffect(() => {
    if (!open) {
      setEditing(null)
      setColorFilter('all')
    }
  }, [open])

  if (!open) return null
  return (
    <div className="drawer-root">
      <button className="drawer-scrim" aria-label="Close" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label="Book menu">
        <header className="drawer-head">
          <h2>{tab === 'toc' ? 'Contents' : tab === 'notes' ? 'Highlights' : 'Bookmarks'}</h2>
          <button className="icon-btn" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="drawer-tabs">
          <button className={tab === 'toc' ? 'active' : ''} onClick={() => onTab('toc')}>
            Contents
          </button>
          <button className={tab === 'notes' ? 'active' : ''} onClick={() => onTab('notes')}>
            Highlights
            {annotations.length ? <span className="tab-count">{annotations.length}</span> : null}
          </button>
          <button className={tab === 'marks' ? 'active' : ''} onClick={() => onTab('marks')}>
            Marks
            {bookmarks.length ? <span className="tab-count">{bookmarks.length}</span> : null}
          </button>
        </div>
        {tab === 'toc' && <TocTree items={toc} onGoTo={onGoTo} />}
        {tab === 'marks' && (
          <ul className="list">
            {bookmarks.length === 0 && <li className="muted empty-hint">Tap Bookmark while reading to save a place.</li>}
            {bookmarks.map((b) => (
              <li key={b.id} className="mark-row">
                {editing === b.id ? (
                  <form
                    className="rename-row"
                    onSubmit={(e) => {
                      e.preventDefault()
                      onRenameBookmark(b.id, draft.trim() || b.title)
                      setEditing(null)
                    }}
                  >
                    <input value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
                    <button className="icon-btn" type="submit">
                      Save
                    </button>
                  </form>
                ) : (
                  <>
                    <button className="toc-item" onClick={() => onGoTo(b.cfi)}>
                      <strong>{b.title || 'Bookmark'}</strong>
                      {b.quote ? <span className="quote">{b.quote}</span> : null}
                    </button>
                    <div className="row-actions">
                      <button
                        className="text-btn"
                        onClick={() => {
                          setEditing(b.id)
                          setDraft(b.title)
                        }}
                      >
                        Rename
                      </button>
                      <button className="text-btn danger" onClick={() => onDeleteBookmark(b.id)}>
                        Remove
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
        {tab === 'notes' && (
          <>
            {colors.length > 1 && (
              <div className="color-row compact">
                <button className={`chip ${colorFilter === 'all' ? 'active' : ''}`} onClick={() => setColorFilter('all')}>
                  All
                </button>
                {colors.map((c) => (
                  <button
                    key={c}
                    className={`swatch ${colorFilter === c ? 'active' : ''}`}
                    style={{ background: c }}
                    onClick={() => setColorFilter(c)}
                    aria-label={`Filter ${c}`}
                  />
                ))}
              </div>
            )}
            <ul className="list">
              {notes.length === 0 && (
                <li className="muted empty-hint">Long-press a word, then tap a color to highlight it.</li>
              )}
              {notes.map((a) => (
                <li key={a.id} className="mark-row">
                  <button className="toc-item highlight-item" onClick={() => onGoTo(a.cfiRange)}>
                    <i className="hl-bar" style={{ background: a.color }} />
                    <span>
                      <span className="hl-kind">{styleLabel(a.style)}</span>
                      <span className="quote">{a.quote}</span>
                      {a.note ? <em className="note-preview">{a.note}</em> : null}
                    </span>
                  </button>
                  <div className="row-actions">
                    <button className="text-btn" onClick={() => onEditNote(a)}>
                      {a.note ? 'Edit' : 'Note'}
                    </button>
                    <button className="text-btn danger" onClick={() => onDeleteAnnotation(a.id)}>
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </aside>
    </div>
  )
}
