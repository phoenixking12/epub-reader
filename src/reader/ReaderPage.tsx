import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { db, getSettings, saveSettings } from '../db'
import { FoliateHost, type FoliateHandle, type SelectionInfo } from '../engine/FoliateHost'
import { themeColors } from '../engine/css'
import { applyNativeBrightness, restoreNativeBrightness } from '../native/brightness'
import { openWebSearch, shareText } from '../native/share'
import { DEFAULT_DISPLAY, newId } from '../settings/defaults'
import type { AnnotationRecord, BookmarkKind, DisplaySettings, TocNode } from '../types/models'
import { DisplayPanel } from './DisplayPanel'
import { Drawer, type DrawerTab } from './Drawer'
import { ImageLightbox } from './ImageLightbox'
import { SearchPanel } from './SearchPanel'
import { SelectionToolbar } from './SelectionToolbar'

interface Props {
  bookId: string
  onBack: () => void
}

export function ReaderPage({ bookId, onBack }: Props) {
  const book = useLiveQuery(() => db.books.get(bookId), [bookId])
  const bookmarks = useLiveQuery(
    () => db.bookmarks.where('bookId').equals(bookId).sortBy('order'),
    [bookId],
  ) ?? []
  const annotations =
    useLiveQuery(() => db.annotations.where('bookId').equals(bookId).toArray(), [bookId]) ?? []
  const fonts = useLiveQuery(() => db.fonts.toArray()) ?? []
  const settingsRow = useLiveQuery(() => db.settings.get('global'))
  const display = settingsRow?.display ?? DEFAULT_DISPLAY
  const file = useBookFile(book?.fileKey)
  const host = useRef<FoliateHandle>(null)
  const [chrome, setChrome] = useState(true)
  const [drawer, setDrawer] = useState(false)
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('toc')
  const [displayOpen, setDisplayOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [selection, setSelection] = useState<SelectionInfo | null>(null)
  const [image, setImage] = useState<{ src: string; alt: string } | null>(null)
  const [footnote, setFootnote] = useState<{ html: string; href: string } | null>(null)
  const [toc, setToc] = useState<TocNode[]>([])
  const [hasMedia, setHasMedia] = useState(false)
  const [frac, setFrac] = useState(0)
  const [loc, setLoc] = useState('')
  const [noteFor, setNoteFor] = useState<AnnotationRecord | SelectionInfo | null>(null)
  const [noteText, setNoteText] = useState('')
  const saveTimer = useRef(0)

  const colors = themeColors(display)
  const overlayOpen = drawer || displayOpen || searchOpen || Boolean(noteFor)
  const showChrome = chrome && !overlayOpen && !selection

  useEffect(() => {
    const d = settingsRow?.display
    if (d) void applyNativeBrightness(d.brightness)
    return () => {
      void restoreNativeBrightness()
    }
  }, [settingsRow?.display.brightness])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'h') host.current?.goLeft()
      if (e.key === 'ArrowRight' || e.key === 'l') host.current?.goRight()
      if (e.key === 'Escape') {
        setDrawer(false)
        setDisplayOpen(false)
        setSearchOpen(false)
        setSelection(null)
        setNoteFor(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const patchDisplay = async (patch: Partial<DisplaySettings>) => {
    const current = await getSettings()
    await saveSettings({ display: { ...current.display, ...patch } })
  }

  const addBookmark = async (kind: BookmarkKind, cfi: string, quote: string, title?: string) => {
    const order = (bookmarks.at(-1)?.order ?? 0) + 1
    await db.bookmarks.add({
      id: newId(),
      bookId,
      cfi,
      quote,
      title: title || quote.slice(0, 80) || 'Bookmark',
      kind,
      order,
      createdAt: Date.now(),
    })
  }

  const addAnnotation = async (sel: SelectionInfo, style = display.defaultAnnotationStyle, color = display.defaultAnnotationColor, note = '') => {
    const rec: AnnotationRecord = {
      id: newId(),
      bookId,
      cfiRange: sel.cfi,
      quote: sel.text,
      style,
      color,
      note,
      createdAt: Date.now(),
    }
    await db.annotations.add(rec)
    return rec
  }

  if (!book) return <div className="centered">Opening…</div>
  if (!file || !settingsRow) return <div className="centered">Loading book…</div>

  return (
    <div className="reader" style={{ background: colors.bg }}>
      <FoliateHost
        ref={host}
        file={file}
        lastLocation={book.progressCfi}
        settings={settingsRow.display}
        annotations={annotations}
        onRelocate={({ cfi, fraction, locLabel }) => {
          setFrac(fraction)
          setLoc(locLabel)
          window.clearTimeout(saveTimer.current)
          saveTimer.current = window.setTimeout(() => {
            void db.books.update(bookId, {
              progressCfi: cfi,
              progressFraction: fraction,
              lastOpenedAt: Date.now(),
            })
          }, 400)
        }}
        onSelection={(sel) => {
          setSelection(sel)
          if (sel) setChrome(false)
        }}
        onShowAnnotation={(cfi) => {
          const rec = annotations.find((a) => a.cfiRange === cfi)
          if (rec) {
            setNoteFor(rec)
            setNoteText(rec.note)
          }
        }}
        onImage={setImage}
        onFootnote={setFootnote}
        onReady={(t, _title, media) => {
          setToc((t as TocNode[]) ?? [])
          setHasMedia(media)
        }}
        onTapCenter={() => setChrome((v) => !v)}
        onFontSizeChange={(size) => void patchDisplay({ fontSize: size })}
      />

      <div className="brightness-veil" style={{ opacity: 1 - settingsRow.display.brightness }} />

      {showChrome && (
        <header className="reader-top">
          <button className="icon-btn" onClick={onBack}>
            Library
          </button>
          <button
            className="reader-title"
            onClick={() => {
              setDrawerTab('toc')
              setDrawer(true)
            }}
          >
            <strong>{book.title}</strong>
            <span>{loc || `${Math.round(frac * 100)}%`}</span>
          </button>
          <button className="icon-btn" onClick={() => setSearchOpen(true)}>
            Find
          </button>
          <button className="icon-btn" onClick={() => setDisplayOpen(true)}>
            Aa
          </button>
          <button
            className="icon-btn"
            onClick={() => {
              setDrawerTab('notes')
              setDrawer(true)
            }}
          >
            Highlights
          </button>
        </header>
      )}

      {showChrome && (
        <footer className="reader-bottom">
          <button className="icon-btn" onClick={() => host.current?.goLeft()} aria-label="Previous page">
            ‹
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.0001}
            value={frac}
            onChange={(e) => void host.current?.goToFraction(Number(e.target.value))}
          />
          <button className="icon-btn" onClick={() => host.current?.goRight()} aria-label="Next page">
            ›
          </button>
          <button
            className="icon-btn"
            onClick={() =>
              void addBookmark('position', book.progressCfi, loc, loc || 'Current position')
            }
          >
            Bookmark
          </button>
          {hasMedia && (
            <button className="icon-btn" onClick={() => host.current?.startMediaOverlay()}>
              Audio
            </button>
          )}
        </footer>
      )}

      <Drawer
        open={drawer}
        tab={drawerTab}
        toc={toc}
        bookmarks={bookmarks}
        annotations={annotations}
        onTab={setDrawerTab}
        onClose={() => setDrawer(false)}
        onGoTo={(t) => {
          void host.current?.goTo(t)
          setDrawer(false)
        }}
        onRenameBookmark={(id, title) => void db.bookmarks.update(id, { title })}
        onDeleteBookmark={(id) => void db.bookmarks.delete(id)}
        onDeleteAnnotation={(id) => void db.annotations.delete(id)}
        onEditNote={(ann) => {
          setDrawer(false)
          setNoteFor(ann)
          setNoteText(ann.note)
        }}
      />

      <DisplayPanel
        open={displayOpen}
        settings={settingsRow.display}
        customFonts={fonts}
        onChange={(patch) => void patchDisplay(patch)}
        onImportFont={async (list) => {
          for (const file of Array.from(list)) {
            const family = file.name.replace(/\.(ttf|otf)$/i, '')
            const id = newId()
            await db.fonts.put({
              id,
              family,
              style: 'normal',
              weight: '400',
              blob: file,
              fileName: file.name,
            })
            injectFontFace(family, file)
          }
        }}
        onClose={() => setDisplayOpen(false)}
      />

      <SearchPanel
        open={searchOpen}
        regex={settingsRow.regexSearch}
        onRegexChange={(v) => void saveSettings({ regexSearch: v })}
        onSearch={(q) => host.current?.search(q, settingsRow.regexSearch) ?? Promise.resolve([])}
        onGoTo={(cfi) => {
          void host.current?.goTo(cfi)
          setSearchOpen(false)
        }}
        onClose={() => {
          host.current?.clearSearch()
          setSearchOpen(false)
        }}
      />

      <SelectionToolbar
        visible={Boolean(selection) && !noteFor}
        quote={selection?.text}
        defaultStyle={settingsRow.display.defaultAnnotationStyle}
        defaultColor={settingsRow.display.defaultAnnotationColor}
        searchEngine={settingsRow.webSearchEngine}
        onHighlight={(style, color) => {
          if (!selection) return
          void addAnnotation(selection, style, color)
          void saveSettings({
            display: { ...settingsRow.display, defaultAnnotationStyle: style, defaultAnnotationColor: color },
          })
          host.current?.deselect()
          setSelection(null)
          setChrome(true)
        }}
        onNote={() => {
          if (selection) {
            setNoteFor(selection)
            setNoteText('')
          }
        }}
        onBookmark={() => {
          if (!selection) return
          void addBookmark('selection', selection.cfi, selection.text)
          setSelection(null)
          setChrome(true)
        }}
        onSearch={() => {
          if (!selection) return
          void openWebSearch(selection.text, settingsRow.webSearchEngine)
        }}
        onShare={() => {
          if (!selection) return
          void shareText(selection.text, selection.text)
        }}
        onCopy={() => {
          if (selection) void navigator.clipboard.writeText(selection.text)
        }}
        onClose={() => {
          host.current?.deselect()
          setSelection(null)
          setChrome(true)
        }}
      />

      <ImageLightbox image={image} onClose={() => setImage(null)} />

      {footnote && (
        <div className={`footnote-pop ${settingsRow.display.footnotePosition}`} role="dialog">
          <button className="icon-btn" onClick={() => setFootnote(null)}>
            Close
          </button>
          <div className="footnote-body" dangerouslySetInnerHTML={{ __html: footnote.html }} />
        </div>
      )}

      {noteFor && (
        <div className="sheet note-sheet">
          <header className="sheet-head">
            <h2>Note</h2>
            <button
              className="icon-btn"
              onClick={() => {
                setNoteFor(null)
              }}
            >
              Cancel
            </button>
            <button
              className="icon-btn"
              onClick={async () => {
                if ('cfiRange' in noteFor) {
                  await db.annotations.update(noteFor.id, { note: noteText })
                } else {
                  await addAnnotation(
                    noteFor,
                    settingsRow.display.defaultAnnotationStyle,
                    settingsRow.display.defaultAnnotationColor,
                    noteText,
                  )
                }
                setNoteFor(null)
                host.current?.deselect()
                setSelection(null)
              }}
            >
              Save
            </button>
          </header>
          <p className="selection-quote">{'quote' in noteFor ? noteFor.quote : noteFor.text}</p>
          <textarea rows={6} value={noteText} onChange={(e) => setNoteText(e.target.value)} autoFocus />
        </div>
      )}
    </div>
  )
}

function useBookFile(fileKey?: string) {
  const [file, setFile] = useState<File | null>(null)
  useEffect(() => {
    if (!fileKey) return
    let alive = true
    ;(async () => {
      const { loadBookFile } = await import('../native/files')
      const f = await loadBookFile(fileKey)
      if (alive) setFile(f)
    })()
    return () => {
      alive = false
    }
  }, [fileKey])
  return file
}

function injectFontFace(family: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const style = document.createElement('style')
  style.textContent = `@font-face { font-family: "${family}"; src: url("${url}"); }`
  document.head.append(style)
}
