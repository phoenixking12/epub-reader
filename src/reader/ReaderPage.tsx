import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { db, getSettings, saveSettings, withSettingsDefaults } from '../db'
import { FoliateHost, type FoliateHandle, type SelectionInfo } from '../engine/FoliateHost'
import { themeColors } from '../engine/css'
import { applyManualBrightness, followSystemBrightness, restoreNativeBrightness } from '../native/brightness'
import { VolumeKeys } from '../native/volume'
import { openWebSearch, shareText } from '../native/share'
import { rememberCustomColor } from '../settings/colors'
import { newId } from '../settings/defaults'
import type { AnnotationRecord, BookmarkKind, DisplaySettings, TocNode } from '../types/models'
import { BookmarkNameSheet } from './BookmarkNameSheet'
import { DisplayPanel, type DisplaySection } from './DisplayPanel'
import { Drawer, type DrawerMode, type DrawerTab } from './Drawer'
import { ImageLightbox } from './ImageLightbox'
import { formatCornerProgress } from './progress'
import { ReaderMenu } from './ReaderMenu'
import { SearchPanel } from './SearchPanel'
import { SelectionToolbar } from './SelectionToolbar'

interface Props {
  bookId: string
  onBack: () => void
}

export function ReaderPage({ bookId, onBack }: Props) {
  const book = useLiveQuery(() => db.books.get(bookId), [bookId])
  const bookmarks =
    useLiveQuery(() => db.bookmarks.where('bookId').equals(bookId).sortBy('order'), [bookId]) ?? []
  const annotations =
    useLiveQuery(() => db.annotations.where('bookId').equals(bookId).toArray(), [bookId]) ?? []
  const fonts = useLiveQuery(() => db.fonts.toArray()) ?? []
  const settingsLive = useLiveQuery(() => db.settings.get('global'))
  const settingsRow = withSettingsDefaults(settingsLive)
  const display = settingsRow.display
  const file = useBookFile(book?.fileKey)
  const host = useRef<FoliateHandle>(null)
  const topRef = useRef<HTMLElement>(null)
  const [chrome, setChrome] = useState(false)
  const [chromeH, setChromeH] = useState(0)
  const [marksOn, setMarksOn] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('nav')
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('toc')
  const [displayOpen, setDisplayOpen] = useState(false)
  const [displaySection, setDisplaySection] = useState<DisplaySection>('display')
  const [searchOpen, setSearchOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [selection, setSelection] = useState<SelectionInfo | null>(null)
  const [bookmarkDraft, setBookmarkDraft] = useState<{
    cfi: string
    quote: string
    kind: BookmarkKind
    id?: string
    title: string
  } | null>(null)
  const [image, setImage] = useState<{ src: string; alt: string } | null>(null)
  const [footnote, setFootnote] = useState<{ html: string; href: string } | null>(null)
  const [toc, setToc] = useState<TocNode[]>([])
  const [hasMedia, setHasMedia] = useState(false)
  const [frac, setFrac] = useState(0)
  const [chapterFrac, setChapterFrac] = useState(0)
  const [loc, setLoc] = useState('')
  const [pageInfo, setPageInfo] = useState({ page: 1, pages: 1, scrolled: false })
  const [noteFor, setNoteFor] = useState<AnnotationRecord | SelectionInfo | null>(null)
  const [noteText, setNoteText] = useState('')
  const saveTimer = useRef(0)

  const colors = themeColors(display)
  const overlayOpen = drawer || displayOpen || searchOpen || Boolean(noteFor) || Boolean(bookmarkDraft)
  const showChrome = chrome && !overlayOpen && !selection
  const pageButtons = display.pageTurnMode === 'buttons'
  const autoBright = display.brightnessMode !== 'manual'
  const corner = formatCornerProgress({
    bookFraction: frac,
    chapterFraction: chapterFrac,
    page: pageInfo.page,
    pages: pageInfo.pages,
    scrolled: pageInfo.scrolled || display.pageTurnMode === 'scroll',
  })
  const selectedAnn = selection?.annotationId
    ? annotations.find((a) => a.id === selection.annotationId)
    : undefined

  useLayoutEffect(() => {
    if (!showChrome) {
      setChromeH(0)
      return
    }
    const el = topRef.current
    if (!el) return
    const apply = () => setChromeH(el.getBoundingClientRect().height)
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    return () => ro.disconnect()
  }, [showChrome, pageButtons, book?.title, loc])

  useEffect(() => {
    if (!settingsRow?.display) return
    if (settingsRow.display.brightnessMode === 'manual') {
      void applyManualBrightness(settingsRow.display.brightness)
    } else {
      void followSystemBrightness()
    }
    return () => {
      void restoreNativeBrightness()
    }
  }, [settingsRow?.display.brightness, settingsRow?.display.brightnessMode])

  useEffect(() => {
    const enabled = display.pageTurnMode === 'volume'
    void VolumeKeys.setEnabled({ enabled }).catch(() => undefined)
    let remove: (() => void) | undefined
    if (enabled) {
      void VolumeKeys.addListener('volume', ({ direction }) => {
        if (direction === 'up') host.current?.goLeft()
        else host.current?.goRight()
      })
        .then((h) => {
          remove = () => void h.remove()
        })
        .catch(() => undefined)
    }
    return () => {
      remove?.()
      void VolumeKeys.setEnabled({ enabled: false }).catch(() => undefined)
    }
  }, [display.pageTurnMode])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'h') host.current?.goLeft()
      if (e.key === 'ArrowRight' || e.key === 'l') host.current?.goRight()
      if (e.key === 'Escape') {
        setDrawer(false)
        setDisplayOpen(false)
        setSearchOpen(false)
        setMenuOpen(false)
        setSelection(null)
        setNoteFor(null)
        setBookmarkDraft(null)
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

  const addAnnotation = async (
    sel: SelectionInfo,
    style = display.defaultAnnotationStyle,
    color = display.defaultAnnotationColor,
    note = '',
  ) => {
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

  const openBookmarkSheet = (info: { cfi: string; quote: string; kind: BookmarkKind; id?: string; title?: string }) => {
    setBookmarkDraft({
      cfi: info.cfi,
      quote: info.quote,
      kind: info.kind,
      id: info.id,
      title: info.title || info.quote.slice(0, 48) || 'Bookmark',
    })
  }

  if (!book) return <div className="centered">Opening…</div>
  if (!file || settingsLive === undefined) return <div className="centered">Loading book…</div>

  return (
    <div
      className={`reader ${showChrome ? 'chrome-on' : ''}`}
      style={{ background: colors.bg, ['--chrome-h' as string]: `${chromeH}px` }}
    >
      <FoliateHost
        ref={host}
        file={file}
        lastLocation={book.progressCfi}
        settings={settingsRow.display}
        annotations={annotations}
        bookmarks={bookmarks}
        showParagraphMarks={showChrome || marksOn}
        onRelocate={({ cfi, fraction, locLabel, sectionFraction, page, pages, scrolled }) => {
          setFrac(fraction)
          setChapterFrac(sectionFraction)
          setLoc(locLabel)
          setPageInfo({ page, pages, scrolled })
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
          if (sel) {
            setChrome(false)
            setMenuOpen(false)
          }
        }}
        onParagraphTap={(info) => {
          setSelection(null)
          host.current?.deselect()
          if (info) {
            const existing = bookmarks.find(
              (b) => b.cfi === info.cfi || (b.kind === 'paragraph' && b.quote === info.quote),
            )
            openBookmarkSheet({
              cfi: info.cfi,
              quote: info.quote,
              kind: 'paragraph',
              id: existing?.id,
              title: existing?.title,
            })
          }
        }}
        onImage={setImage}
        onFootnote={setFootnote}
        onReady={(t, _title, media) => {
          setToc((t as TocNode[]) ?? [])
          setHasMedia(media)
        }}
        onTapCenter={() => {
          setMenuOpen(false)
          setChrome((v) => {
            const next = !v
            setMarksOn(next)
            return next
          })
        }}
        onShowMarks={setMarksOn}
        onIdleTap={() => {
          setChrome(false)
          setMenuOpen(false)
          setMarksOn(false)
        }}
        onFontSizeChange={(size) => void patchDisplay({ fontSize: size })}
      />

      <div
        className={`reader-progress ${showChrome ? 'on' : ''}`}
        style={{ color: colors.fg }}
        aria-hidden
      >
        <strong>{corner.primary}</strong>
        <span>{corner.secondary}</span>
      </div>

      <div
        className="brightness-veil"
        style={{ opacity: autoBright ? 0 : 1 - settingsRow.display.brightness }}
      />

      {showChrome && (
        <header className="reader-top" ref={topRef}>
          <button
            className="icon-btn chrome-btn"
            aria-label="Library and contents"
            onClick={() => {
              setDrawerMode('nav')
              setDrawerTab('toc')
              setDrawer(true)
              setMenuOpen(false)
            }}
          >
            ☰
          </button>
          {pageButtons && (
            <button className="icon-btn chrome-btn turn-btn" onClick={() => host.current?.goLeft()} aria-label="Previous page">
              ‹
            </button>
          )}
          <div className="reader-title">
            <strong>{book.title}</strong>
            <span>{loc || corner.primary}</span>
          </div>
          {pageButtons && (
            <button className="icon-btn chrome-btn turn-btn" onClick={() => host.current?.goRight()} aria-label="Next page">
              ›
            </button>
          )}
          <button
            className="icon-btn chrome-btn"
            aria-expanded={menuOpen}
            aria-label="Reading menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            ⋮
          </button>
        </header>
      )}

      {showChrome && (
        <ReaderMenu
          open={menuOpen}
          hasMedia={hasMedia}
          onClose={() => setMenuOpen(false)}
          onNotes={() => {
            setDrawerMode('notes')
            setDrawer(true)
          }}
          onText={() => {
            setDisplaySection('text')
            setDisplayOpen(true)
          }}
          onDisplay={() => {
            setDisplaySection('display')
            setDisplayOpen(true)
          }}
          onColor={() => {
            setDisplaySection('color')
            setDisplayOpen(true)
          }}
          onFind={() => setSearchOpen(true)}
          onBookmarkPage={() =>
            openBookmarkSheet({
              cfi: book.progressCfi,
              quote: loc,
              kind: 'position',
              title: loc || 'Current position',
            })
          }
          onAudio={() => host.current?.startMediaOverlay()}
        />
      )}

      <Drawer
        open={drawer}
        mode={drawerMode}
        tab={drawerTab}
        toc={toc}
        bookmarks={bookmarks}
        annotations={annotations}
        onTab={setDrawerTab}
        onClose={() => setDrawer(false)}
        onLibrary={onBack}
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
        section={displaySection}
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
        existing={Boolean(selectedAnn)}
        defaultStyle={selectedAnn?.style ?? settingsRow.display.defaultAnnotationStyle}
        defaultColor={selectedAnn?.color ?? settingsRow.display.defaultAnnotationColor}
        customColors={settingsRow.display.customHighlightColors}
        searchEngine={settingsRow.webSearchEngine}
        anchor={selection?.rect}
        onHighlight={(style, color) => {
          if (!selection) return
          void (async () => {
            if (selectedAnn) await db.annotations.update(selectedAnn.id, { style, color })
            else await addAnnotation(selection, style, color)
            await saveSettings({
              display: {
                ...settingsRow.display,
                defaultAnnotationStyle: style,
                defaultAnnotationColor: color,
                customHighlightColors: rememberCustomColor(settingsRow.display.customHighlightColors, color),
              },
            })
            host.current?.deselect()
            setSelection(null)
            setChrome(true)
          })()
        }}
        onNote={() => {
          if (selectedAnn) {
            setNoteFor(selectedAnn)
            setNoteText(selectedAnn.note)
            return
          }
          if (selection) {
            setNoteFor(selection)
            setNoteText('')
          }
        }}
        onBookmark={() => {
          if (!selection) return
          openBookmarkSheet({
            cfi: selection.cfi,
            quote: selection.text,
            kind: 'selection',
            title: selection.text.slice(0, 48),
          })
          host.current?.deselect()
          setSelection(null)
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
        onRemove={
          selectedAnn
            ? () => {
                void db.annotations.delete(selectedAnn.id)
                host.current?.deselect()
                setSelection(null)
                setChrome(true)
              }
            : undefined
        }
        onClose={() => {
          host.current?.deselect()
          setSelection(null)
          setChrome(true)
        }}
      />

      <BookmarkNameSheet
        open={Boolean(bookmarkDraft)}
        title={bookmarkDraft?.title ?? ''}
        quote={bookmarkDraft?.quote ?? ''}
        existing={Boolean(bookmarkDraft?.id)}
        onTitle={(title) => setBookmarkDraft((d) => (d ? { ...d, title } : d))}
        onSave={async () => {
          if (!bookmarkDraft) return
          const title = bookmarkDraft.title.trim() || bookmarkDraft.quote.slice(0, 80) || 'Bookmark'
          if (bookmarkDraft.id) await db.bookmarks.update(bookmarkDraft.id, { title })
          else await addBookmark(bookmarkDraft.kind, bookmarkDraft.cfi, bookmarkDraft.quote, title)
          setBookmarkDraft(null)
          setChrome(true)
        }}
        onRemove={
          bookmarkDraft?.id
            ? async () => {
                await db.bookmarks.delete(bookmarkDraft.id as string)
                setBookmarkDraft(null)
              }
            : undefined
        }
        onClose={() => setBookmarkDraft(null)}
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
          <textarea rows={6} value={noteText} onChange={(e) => setNoteText(e.target.value)} autoFocus placeholder="Write a note" />
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
