import { useEffect, useRef, useState } from 'react'
import { View } from 'foliate-js/view.js'
import { loadBookFile } from '../native/files'
import { matchAudiobook } from './readAlong'

interface AudioBook {
  id: string
  title: string
  fileKey: string
}

interface Props {
  open: boolean
  bookTitle: string
  hasMedia: boolean
  audiobooks: AudioBook[]
  sectionIndex: number
  onClose: () => void
  onPlayHere: () => void
  onPauseHere: () => void
  onResumeHere: () => void
  onStopHere: () => void
}

type Source = { kind: 'here' } | { kind: 'other'; id: string; title: string }

/** A tap has to start some audio immediately, or a later narration clip can stay silent. */
function unlockAudio() {
  const audio = new Audio()
  audio.muted = true
  void audio.play().then(() => audio.pause()).catch(() => undefined)
}

export function ReadAlong({
  open,
  bookTitle,
  hasMedia,
  audiobooks,
  sectionIndex,
  onClose,
  onPlayHere,
  onPauseHere,
  onResumeHere,
  onStopHere,
}: Props) {
  const stageRef = useRef<HTMLDivElement>(null)
  const externalRef = useRef<View | null>(null)
  const tokenRef = useRef(0)
  const sectionRef = useRef(sectionIndex)
  const startedAt = useRef<number | null>(null)
  const onStopHereRef = useRef(onStopHere)
  const sourceKindRef = useRef<Source['kind'] | null>(null)
  const [source, setSource] = useState<Source | null>(null)
  const [paused, setPaused] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const match = matchAudiobook(bookTitle, audiobooks)
  sectionRef.current = sectionIndex
  onStopHereRef.current = onStopHere
  sourceKindRef.current = source?.kind ?? null

  const stopExternal = () => {
    const view = externalRef.current
    externalRef.current = null
    if (!view) return
    try {
      view.mediaOverlay?.stop?.()
      view.close()
    } catch {
      /* already closed */
    }
    view.remove()
  }

  const stop = () => {
    tokenRef.current += 1
    startedAt.current = null
    if (source?.kind === 'here') onStopHere()
    stopExternal()
    setSource(null)
    setPaused(false)
    setError('')
  }

  useEffect(() => {
    return () => {
      tokenRef.current += 1
      startedAt.current = null
      if (sourceKindRef.current === 'here') onStopHereRef.current()
      const view = externalRef.current
      externalRef.current = null
      if (!view) return
      try {
        view.mediaOverlay?.stop?.()
        view.close()
      } catch {
        /* already closed */
      }
      view.remove()
    }
  }, [])

  useEffect(() => {
    const view = externalRef.current
    if (!view || paused || source?.kind !== 'other') return
    if (startedAt.current === sectionIndex) return
    startedAt.current = sectionIndex
    void view.mediaOverlay?.start(sectionIndex)
  }, [sectionIndex, paused, source?.kind])

  const playHere = () => {
    unlockAudio()
    stopExternal()
    tokenRef.current += 1
    startedAt.current = null
    setError('')
    setPaused(false)
    setSource({ kind: 'here' })
    onPlayHere()
    onClose()
  }

  const playOther = async (book: AudioBook) => {
    unlockAudio()
    const token = ++tokenRef.current
    onStopHere()
    stopExternal()
    setBusy(true)
    setError('')
    setPaused(false)
    try {
      const file = await loadBookFile(book.fileKey)
      if (token !== tokenRef.current) return
      const stage = stageRef.current
      if (!stage) return
      const view = document.createElement('foliate-view') as View
      stage.append(view)
      externalRef.current = view
      await view.open(file)
      if (token !== tokenRef.current) {
        stopExternal()
        return
      }
      if (!view.mediaOverlay) {
        stopExternal()
        setError('That audiobook has no narration.')
        setSource(null)
        return
      }
      try {
        await view.init({ showTextStart: true })
      } catch {
        /* narration can still start */
      }
      if (token !== tokenRef.current) {
        stopExternal()
        return
      }
      startedAt.current = sectionRef.current
      await view.mediaOverlay.start(sectionRef.current)
      setSource({ kind: 'other', id: book.id, title: book.title })
      onClose()
    } catch (err) {
      if (token === tokenRef.current) {
        stopExternal()
        setSource(null)
        setError(err instanceof Error ? err.message : 'Could not play that audiobook')
      }
    } finally {
      if (token === tokenRef.current) setBusy(false)
    }
  }

  const toggle = () => {
    if (!source) return
    if (source.kind === 'here') {
      if (paused) onResumeHere()
      else onPauseHere()
    } else if (paused) externalRef.current?.mediaOverlay?.resume?.()
    else externalRef.current?.mediaOverlay?.pause?.()
    setPaused((value) => !value)
  }

  const label = source?.kind === 'other' ? source.title : 'Narration in this book'

  return (
    <>
      <div ref={stageRef} className="read-along-stage" aria-hidden />
      {source && (
        <div className="read-along-bar" role="region" aria-label="Read and listen">
          <button type="button" className="chip active" onClick={toggle} disabled={busy}>
            {paused ? 'Play' : 'Pause'}
          </button>
          <p>{paused ? `Paused · ${label}` : label}</p>
          <button type="button" className="chip" onClick={stop}>
            Stop
          </button>
        </div>
      )}
      {open && (
        <div className="sheet read-along-sheet" role="dialog" aria-label="Read and listen">
          <div className="sheet-handle" />
          <header className="sheet-head">
            <h2>Read and listen</h2>
            <button className="icon-btn" onClick={onClose}>
              Done
            </button>
          </header>
          <p className="muted">The book stays on screen while its narration plays.</p>
          {hasMedia && (
            <button type="button" className="chip active" disabled={busy} onClick={playHere}>
              Narration in this book
            </button>
          )}
          {audiobooks.length > 0 && <p className="field-label">Audiobooks</p>}
          <div className="read-along-list">
            {audiobooks.map((book) => (
              <button
                key={book.id}
                type="button"
                className={book.id === match?.id ? 'chip active' : 'chip'}
                disabled={busy}
                onClick={() => void playOther(book)}
              >
                {book.title}
                {book.id === match?.id ? ' · match' : ''}
              </button>
            ))}
          </div>
          {!hasMedia && audiobooks.length === 0 && (
            <p className="muted">Add an audiobook, then play it here while you read.</p>
          )}
          {error && <p className="error">{error}</p>}
        </div>
      )}
    </>
  )
}
