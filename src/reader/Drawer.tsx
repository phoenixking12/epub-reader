import { useEffect, useMemo, useState } from 'react'
import type { AnnotationRecord, BookmarkRecord, TocNode } from '../types/models'

export type DrawerTab = 'toc' | 'marks'
export type DrawerMode = 'nav' | 'notes'

interface Props {
  open: boolean
  mode: DrawerMode
  tab: DrawerTab
  toc: TocNode[]
  bookmarks: BookmarkRecord[]
  annotations: AnnotationRecord[]
  onTab: (tab: DrawerTab) => void
  onClose: () => void
  onLibrary?: () => void
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
  if (style === 'italic') return 'Italic'
  if (style === 'textColor') return 'Color'
  return 'Highlight'
}

function kindLabel(kind: BookmarkRecord['kind']) {
  if (kind === 'paragraph') return 'Paragraph'
  if (kind === 'selection') return 'Selection'
  if (kind === 'chapter') return 'Chapter'
  return 'Place'
}

export function Drawer({
  open,
  mode,
  tab,
  toc,
  bookmarks,
  annotations,
  onTab,
  onClose,
  onLibrary,
  onGoTo,
  onRenameBookmark,
  onDeleteBookmark,
  onDeleteAnnotation,
  onEditNote,
}: Props) {
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const notes = useMemo(
    () => annotations.filter((a) => a.note.trim()).sort((a, b) => b.createdAt - a.createdAt),
    [annotations],
  )
  const orderedMarks = useMemo(
    () => [...bookmarks].sort((a, b) => b.createdAt - a.createdAt),
    [bookmarks],
  )

  useEffect(() => {
    if (!open) setEditing(null)
  }, [open])

  if (!open) return null
  const heading = mode === 'notes' ? 'Notes' : tab === 'toc' ? 'Contents' : 'Bookmarks'
  return (
    <div className="drawer-root">
      <button className="drawer-scrim" aria-label="Close" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label={heading}>
        <header className="drawer-head">
          {mode === 'nav' && onLibrary ? (
            <button className="icon-btn" onClick={onLibrary}>
              Library
            </button>
          ) : null}
          <h2>{heading}</h2>
          <button className="icon-btn" onClick={onClose}>
            Close
          </button>
        </header>
        {mode === 'nav' && (
          <div className="drawer-tabs">
            <button className={tab === 'toc' ? 'active' : ''} onClick={() => onTab('toc')}>
              Contents
            </button>
            <button className={tab === 'marks' ? 'active' : ''} onClick={() => onTab('marks')}>
              Bookmarks
              {bookmarks.length ? <span className="tab-count">{bookmarks.length}</span> : null}
            </button>
          </div>
        )}
        {mode === 'nav' && tab === 'toc' && <TocTree items={toc} onGoTo={onGoTo} />}
        {mode === 'nav' && tab === 'marks' && (
          <ul className="list">
            {orderedMarks.length === 0 && (
              <li className="muted empty-hint">Tap a paragraph bookmark icon, then give it a name.</li>
            )}
            {orderedMarks.map((b) => (
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
                      <span className="hl-kind">{kindLabel(b.kind)}</span>
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
        {mode === 'notes' && (
          <ul className="list">
            {notes.length === 0 && (
              <li className="muted empty-hint">Long-press, then Note. Only notes you write appear here.</li>
            )}
            {notes.map((a) => (
              <li key={a.id} className="mark-row">
                <button className="toc-item highlight-item" onClick={() => onGoTo(a.cfiRange)}>
                  <i className="hl-bar" style={{ background: a.color }} />
                  <span>
                    <span className="hl-kind">{styleLabel(a.style)}</span>
                    <span className="quote">{a.quote}</span>
                    <em className="note-preview">{a.note}</em>
                  </span>
                </button>
                <div className="row-actions">
                  <button className="text-btn" onClick={() => onEditNote(a)}>
                    Edit
                  </button>
                  <button className="text-btn danger" onClick={() => onDeleteAnnotation(a.id)}>
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  )
}
