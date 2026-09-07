import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react'
import { View } from 'foliate-js/view.js'
import { Overlayer } from 'foliate-js/overlayer.js'
import { FootnoteHandler } from 'foliate-js/footnotes.js'
import type { AnnotationRecord, DisplaySettings } from '../types/models'
import { applyRendererLayout, buildReaderCSS, themeColors } from './css'

export interface SelectionInfo {
  cfi: string
  text: string
  index: number
}

export interface ImageInfo {
  src: string
  alt: string
}

export interface FootnoteInfo {
  html: string
  href: string
}

export interface RelocateInfo {
  cfi: string
  fraction: number
  locLabel: string
}

export interface SearchHit {
  cfi: string
  excerpt: { pre: string; match: string; post: string }
  label?: string
}

export interface FoliateHandle {
  goLeft: () => void
  goRight: () => void
  goTo: (target: string | number) => Promise<void>
  goToFraction: (n: number) => Promise<void>
  applySettings: (settings: DisplaySettings) => void
  getSelection: () => SelectionInfo | null
  deselect: () => void
  search: (query: string, regex: boolean) => Promise<SearchHit[]>
  clearSearch: () => void
  startMediaOverlay: () => void
  hasMediaOverlay: () => boolean
  getDir: () => 'ltr' | 'rtl'
}

interface Props {
  file: File
  lastLocation?: string
  settings: DisplaySettings
  annotations: AnnotationRecord[]
  onRelocate: (info: RelocateInfo) => void
  onSelection: (sel: SelectionInfo | null) => void
  onShowAnnotation: (cfi: string) => void
  onImage: (img: ImageInfo) => void
  onFootnote: (note: FootnoteInfo | null) => void
  onReady?: (toc: unknown, title: string, hasMedia: boolean) => void
  onTapCenter: () => void
  onFontSizeChange: (size: number) => void
}

function drawAnnotation(
  style: AnnotationRecord['style'],
  color: string,
): [(rects: DOMRectList, opts?: object) => SVGElement, object] {
  if (style === 'underline') return [Overlayer.underline, { color }]
  if (style === 'strike') return [Overlayer.strikethrough, { color }]
  if (style === 'squiggly') return [Overlayer.squiggly, { color }]
  return [Overlayer.highlight, { color }]
}

function applyTextHighlight(doc: Document, range: Range, rec: AnnotationRecord) {
  if (rec.style !== 'textColor' && rec.style !== 'bold') return
  if (typeof Highlight !== 'function' || !CSS.highlights) return
  const name = `ann-${rec.id}`
  CSS.highlights.set(name, new Highlight(range))
  const parent = doc.head ?? doc.documentElement
  if (!parent) return
  let styleEl = doc.getElementById('reader-highlight-styles') as HTMLStyleElement | null
  if (!styleEl) {
    styleEl = doc.createElement('style')
    styleEl.id = 'reader-highlight-styles'
    parent.append(styleEl)
  }
  const extra =
    rec.style === 'textColor'
      ? `color: ${rec.color};`
      : rec.style === 'bold'
        ? `font-weight: 700; text-shadow: 0.3px 0 0 currentColor;`
        : ''
  if (extra) {
    styleEl.textContent += `::highlight(${name}) { ${extra} }\n`
  }
}

export const FoliateHost = forwardRef<FoliateHandle, Props>(function FoliateHost(
  {
    file,
    lastLocation,
    settings,
    annotations,
    onRelocate,
    onSelection,
    onShowAnnotation,
    onImage,
    onFootnote,
    onReady,
    onTapCenter,
    onFontSizeChange,
  },
  ref,
) {
  const rootRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<View | null>(null)
  const settingsRef = useRef(settings)
  const annotationsRef = useRef(annotations)
  const tapRef = useRef({ x: 0, y: 0, t: 0 })
  const pinchRef = useRef({ active: false, startDist: 0, startSize: 18, lastSize: 18, lastAt: 0 })
  const badgeRef = useRef<HTMLDivElement>(null)
  const pinchDocs = useRef(new WeakSet<Document>())
  const selectDocs = useRef(new WeakSet<Document>())
  const onRelocateRef = useRef(onRelocate)
  const onSelectionRef = useRef(onSelection)
  const onShowAnnotationRef = useRef(onShowAnnotation)
  const onImageRef = useRef(onImage)
  const onFootnoteRef = useRef(onFootnote)
  const onTapCenterRef = useRef(onTapCenter)
  const onReadyRef = useRef(onReady)
  const onFontSizeRef = useRef(onFontSizeChange)

  settingsRef.current = settings
  annotationsRef.current = annotations
  onRelocateRef.current = onRelocate
  onSelectionRef.current = onSelection
  onShowAnnotationRef.current = onShowAnnotation
  onImageRef.current = onImage
  onFootnoteRef.current = onFootnote
  onTapCenterRef.current = onTapCenter
  onReadyRef.current = onReady
  onFontSizeRef.current = onFontSizeChange

  const touchDistance = (touches: TouchList) => {
    const a = touches[0]
    const b = touches[1]
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
  }

  const clampFont = (size: number) => Math.min(36, Math.max(12, size))

  const showPinchBadge = (size: number, visible: boolean) => {
    const badge = badgeRef.current
    if (!badge) return
    badge.hidden = !visible
    badge.textContent = `${Math.round(size)} px`
  }

  const applyLiveFont = (size: number) => {
    const view = viewRef.current
    if (!view?.renderer) return
    const next = { ...settingsRef.current, fontSize: size }
    settingsRef.current = next
    view.renderer.setStyles?.(buildReaderCSS(next))
    for (const part of view.renderer.getContents()) {
      part.doc?.documentElement.style.setProperty('font-size', `${size}px`, 'important')
    }
    const margin = view.renderer.getAttribute('margin')
    if (margin) view.renderer.setAttribute('margin', margin)
    showPinchBadge(size, true)
  }

  const beginPinch = (touches: TouchList) => {
    const size = settingsRef.current.fontSize
    pinchRef.current = {
      active: true,
      startDist: Math.max(1, touchDistance(touches)),
      startSize: size,
      lastSize: size,
      lastAt: Date.now(),
    }
  }

  const movePinch = (touches: TouchList) => {
    if (!pinchRef.current.active || touches.length < 2) return
    const scale = touchDistance(touches) / pinchRef.current.startDist
    const next = clampFont(pinchRef.current.startSize * scale)
    pinchRef.current.lastSize = next
    applyLiveFont(next)
  }

  const endPinch = () => {
    if (!pinchRef.current.active) return
    pinchRef.current.active = false
    pinchRef.current.lastAt = Date.now()
    const size = Math.round(pinchRef.current.lastSize * 10) / 10
    settingsRef.current = { ...settingsRef.current, fontSize: size }
    onFontSizeRef.current(size)
    showPinchBadge(size, false)
  }

  const rangeFromPoint = (doc: Document, x: number, y: number) => {
    const caret = doc.caretRangeFromPoint?.(x, y)
    if (caret) return caret
    const pos = (doc as Document & { caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null }).caretPositionFromPoint?.(x, y)
    if (!pos) return null
    const range = doc.createRange()
    range.setStart(pos.offsetNode, pos.offset)
    range.collapse(true)
    return range
  }

  const selectWordAt = (doc: Document, x: number, y: number) => {
    const point = rangeFromPoint(doc, x, y)
    const sel = doc.getSelection()
    if (!point || !sel) return
    sel.removeAllRanges()
    sel.addRange(point)
    const win = doc.defaultView
    try {
      win?.getSelection()?.modify('move', 'backward', 'word')
      win?.getSelection()?.modify('extend', 'forward', 'word')
    } catch {
      /* modify() missing */
    }
  }

  const extendSelectionTo = (doc: Document, x: number, y: number) => {
    const point = rangeFromPoint(doc, x, y)
    const sel = doc.getSelection()
    if (!point || !sel?.rangeCount) return
    try {
      sel.extend(point.startContainer, point.startOffset)
    } catch {
      const range = sel.getRangeAt(0)
      range.setEnd(point.startContainer, point.startOffset)
    }
  }

  const emitDocSelection = (doc: Document) => {
    const view = viewRef.current
    if (!view) return
    const sel = doc.getSelection()
    if (!sel || sel.isCollapsed || !sel.rangeCount) {
      onSelectionRef.current(null)
      return
    }
    const range = sel.getRangeAt(0)
    const text = sel.toString().trim()
    if (!text) {
      onSelectionRef.current(null)
      return
    }
    const index = view.renderer.getContents().find((c) => c.doc === doc)?.index ?? 0
    onSelectionRef.current({ cfi: view.getCFI(index, range), text, index })
  }

  const bindTextSelection = (doc: Document) => {
    if (selectDocs.current.has(doc)) return
    selectDocs.current.add(doc)
    const state = { timer: 0, x: 0, y: 0, selecting: false }
    doc.addEventListener(
      'touchstart',
      (e) => {
        if (e.touches.length !== 1) {
          window.clearTimeout(state.timer)
          state.selecting = false
          return
        }
        const t = e.touches[0]
        state.x = t.clientX
        state.y = t.clientY
        state.selecting = false
        window.clearTimeout(state.timer)
        state.timer = window.setTimeout(() => {
          state.selecting = true
          selectWordAt(doc, state.x, state.y)
          emitDocSelection(doc)
          navigator.vibrate?.(12)
        }, 400)
      },
      { capture: true, passive: true },
    )
    doc.addEventListener(
      'touchmove',
      (e) => {
        if (e.touches.length !== 1) return
        const t = e.touches[0]
        const moved = Math.hypot(t.clientX - state.x, t.clientY - state.y)
        if (!state.selecting) {
          if (moved > 12) window.clearTimeout(state.timer)
          return
        }
        e.preventDefault()
        e.stopPropagation()
        extendSelectionTo(doc, t.clientX, t.clientY)
        emitDocSelection(doc)
      },
      { capture: true, passive: false },
    )
    const endSelect = (e: TouchEvent) => {
      window.clearTimeout(state.timer)
      if (state.selecting) {
        e.stopPropagation()
        emitDocSelection(doc)
      }
      state.selecting = false
    }
    doc.addEventListener('touchend', endSelect, { capture: true })
    doc.addEventListener('touchcancel', endSelect, { capture: true })
    doc.addEventListener('mouseup', () => {
      window.setTimeout(() => emitDocSelection(doc), 0)
    })
  }

  const bindPinchToDocument = (doc: Document) => {
    if (pinchDocs.current.has(doc)) return
    pinchDocs.current.add(doc)
    const opts: AddEventListenerOptions = { capture: true, passive: false }
    doc.addEventListener(
      'touchstart',
      (e) => {
        if (e.touches.length >= 2) {
          e.preventDefault()
          e.stopPropagation()
          beginPinch(e.touches)
        }
      },
      opts,
    )
    doc.addEventListener(
      'touchmove',
      (e) => {
        if (e.touches.length >= 2) {
          e.preventDefault()
          e.stopPropagation()
          if (!pinchRef.current.active) beginPinch(e.touches)
          movePinch(e.touches)
        }
      },
      opts,
    )
    const finish = () => endPinch()
    doc.addEventListener('touchend', finish, { capture: true })
    doc.addEventListener('touchcancel', finish, { capture: true })
    doc.addEventListener(
      'wheel',
      (e) => {
        if (!e.ctrlKey && !e.metaKey) return
        e.preventDefault()
        const next = clampFont(settingsRef.current.fontSize + (e.deltaY < 0 ? 1 : -1))
        settingsRef.current = { ...settingsRef.current, fontSize: next }
        applyLiveFont(next)
        onFontSizeRef.current(next)
        window.setTimeout(() => showPinchBadge(next, false), 700)
      },
      opts,
    )
    const blockGesture = (e: Event) => e.preventDefault()
    doc.addEventListener('gesturestart', blockGesture, opts)
    doc.addEventListener('gesturechange', blockGesture, opts)
  }

  useImperativeHandle(ref, () => ({
    goLeft: () => void viewRef.current?.goLeft(),
    goRight: () => void viewRef.current?.goRight(),
    goTo: async (target) => {
      await viewRef.current?.goTo(target)
    },
    goToFraction: async (n) => {
      await viewRef.current?.goToFraction(n)
    },
    applySettings: (next) => {
      const view = viewRef.current
      if (!view?.renderer) return
      applyRendererLayout(view.renderer, next)
      view.renderer.setStyles?.(buildReaderCSS(next))
    },
    getSelection: () => {
      const view = viewRef.current
      if (!view) return null
      for (const { doc, index } of view.renderer.getContents()) {
        const sel = doc.getSelection()
        if (!sel || sel.isCollapsed || !sel.rangeCount) continue
        const range = sel.getRangeAt(0)
        const text = sel.toString().trim()
        if (!text) continue
        return { cfi: view.getCFI(index, range), text, index }
      }
      return null
    },
    deselect: () => viewRef.current?.deselect(),
    search: async (query, regex) => {
      const view = viewRef.current
      if (!view || !query.trim()) return []
      const hits: SearchHit[] = []
      if (regex) {
        const { compileSearchPattern, excerptAround, findRegexInText } = await import('../search/regex')
        let re: RegExp
        try {
          re = compileSearchPattern(query, true)
        } catch {
          return []
        }
        for (const [index, section] of view.book.sections.entries()) {
          if (!section.createDocument) continue
          const doc = await section.createDocument()
          const text = doc.body?.innerText ?? ''
          for (const hit of findRegexInText(text, re)) {
            hits.push({
              cfi: section.cfi ?? '',
              excerpt: excerptAround(text, hit.start, hit.end),
              label: String(index + 1),
            })
          }
        }
        return hits
      }
      for await (const result of view.search({ query })) {
        if (result === 'done') break
        if ('subitems' in result && result.subitems) {
          for (const item of result.subitems) {
            hits.push({ cfi: item.cfi, excerpt: item.excerpt, label: result.label })
          }
        } else if ('cfi' in result && result.cfi) {
          hits.push({ cfi: result.cfi, excerpt: result.excerpt })
        }
      }
      return hits
    },
    clearSearch: () => viewRef.current?.clearSearch(),
    startMediaOverlay: () => {
      viewRef.current?.startMediaOverlay()
    },
    hasMediaOverlay: () => Boolean(viewRef.current?.mediaOverlay),
    getDir: () => (viewRef.current?.book.dir === 'rtl' ? 'rtl' : 'ltr'),
  }))

  useEffect(() => {
    const host = rootRef.current
    if (!host) return
    const view = document.createElement('foliate-view') as View
    view.style.width = '100%'
    view.style.height = '100%'
    host.append(view)
    viewRef.current = view
    let cancelled = false

    const paintAnnotations = () => {
      const v = viewRef.current
      if (!v) return
      for (const rec of annotationsRef.current) {
        void Promise.resolve(v.addAnnotation({ value: rec.cfiRange })).catch(() => undefined)
      }
    }

    const readSelection = (): SelectionInfo | null => {
      const v = viewRef.current
      if (!v) return null
      for (const { doc, index } of v.renderer.getContents()) {
        const sel = doc.getSelection()
        if (!sel || sel.isCollapsed || !sel.rangeCount) continue
        const range = sel.getRangeAt(0)
        const text = sel.toString().trim()
        if (!text) continue
        return { cfi: v.getCFI(index, range), text, index }
      }
      return null
    }

    const onLoad = (e: Event) => {
      const { doc } = (e as CustomEvent).detail as { doc: Document; index: number }
      doc.addEventListener('selectionchange', () => {
        const sel = doc.getSelection()
        if (!sel || sel.isCollapsed) {
          onSelectionRef.current(null)
          return
        }
        const info = readSelection()
        if (info) onSelectionRef.current(info)
      })
      doc.addEventListener('click', (ev) => {
        const img = (ev.target as HTMLElement | null)?.closest?.('img')
        if (img instanceof HTMLImageElement) {
          ev.preventDefault()
          ev.stopPropagation()
          onImageRef.current({ src: img.src, alt: img.alt || img.title || '' })
        }
      })
      const colors = themeColors(settingsRef.current)
      doc.documentElement.style.background = colors.bg
      bindPinchToDocument(doc)
      bindTextSelection(doc)
    }

    const onRelocateEv = (e: Event) => {
      const d = (e as CustomEvent).detail as {
        cfi?: string
        fraction?: number
        tocItem?: { label?: string }
        location?: [number, number]
      }
      onRelocateRef.current({
        cfi: d.cfi ?? '',
        fraction: d.fraction ?? 0,
        locLabel: d.tocItem?.label || '',
      })
    }

    const onCreateOverlay = () => {
      paintAnnotations()
    }

    const onDraw = (e: Event) => {
      const { draw, annotation, doc, range } = (e as CustomEvent).detail as {
        draw: (fn: typeof Overlayer.highlight, opts: object) => void
        annotation: { value: string }
        doc: Document
        range: Range
      }
      const rec = annotationsRef.current.find((a) => a.cfiRange === annotation.value)
      if (!rec) return
      const [fn, opts] = drawAnnotation(rec.style, rec.color)
      if (rec.style !== 'textColor' && rec.style !== 'bold') draw(fn, opts)
      applyTextHighlight(doc, range, rec)
    }

    const onShow = (e: Event) => {
      const { value } = (e as CustomEvent).detail as { value: string }
      onShowAnnotationRef.current(value)
    }

    view.addEventListener('load', onLoad)
    view.addEventListener('relocate', onRelocateEv)
    view.addEventListener('create-overlay', onCreateOverlay)
    view.addEventListener('draw-annotation', onDraw)
    view.addEventListener('show-annotation', onShow)

    const footnotes = new FootnoteHandler()
    footnotes.detectFootnotes = true
    footnotes.addEventListener('render', (e) => {
      const { view: noteView, href } = (e as CustomEvent).detail as {
        view: HTMLElement & { renderer?: { getContents: () => Array<{ doc: Document }> } }
        href: string
      }
      const pos = settingsRef.current.footnotePosition
      if (pos === 'follow') return
      const doc = noteView.renderer?.getContents()?.[0]?.doc
      onFootnoteRef.current({ html: doc?.body?.innerHTML ?? '', href })
    })
    view.addEventListener('link', (e) => {
      const ev = e as CustomEvent & { preventDefault(): void; detail: { a: HTMLAnchorElement; href: string } }
      void footnotes.handle(view.book, ev)
    })

    ;(async () => {
      try {
        await view.open(file)
        if (cancelled) return
        const book = view.book
        book.transformTarget?.addEventListener('data', (ev) => {
          const detail = (ev as CustomEvent).detail as { data: Promise<unknown>; name?: string }
          detail.data = Promise.resolve(detail.data).catch(() => '')
        })
        applyRendererLayout(view.renderer, settingsRef.current)
        view.renderer.setStyles?.(buildReaderCSS(settingsRef.current))
        await view.init({ lastLocation: lastLocation || undefined, showTextStart: !lastLocation })
        if (cancelled) return
        onReadyRef.current?.(book.toc ?? [], String(book.metadata?.title ?? ''), Boolean(view.mediaOverlay))
        paintAnnotations()
        for (const part of view.renderer.getContents()) {
          if (part.doc) {
            bindPinchToDocument(part.doc)
            bindTextSelection(part.doc)
          }
        }
      } catch (err) {
        console.error(err)
      }
    })()

    return () => {
      cancelled = true
      view.removeEventListener('load', onLoad)
      view.removeEventListener('relocate', onRelocateEv)
      view.removeEventListener('create-overlay', onCreateOverlay)
      view.removeEventListener('draw-annotation', onDraw)
      view.removeEventListener('show-annotation', onShow)
      view.close()
      view.remove()
      viewRef.current = null
    }
    // file identity is the open trigger
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file])

  useEffect(() => {
    const view = viewRef.current
    if (!view?.renderer || pinchRef.current.active) return
    applyRendererLayout(view.renderer, settings)
    view.renderer.setStyles?.(buildReaderCSS(settings))
    for (const part of view.renderer.getContents()) {
      part.doc?.documentElement.style.setProperty('font-size', `${settings.fontSize}px`, 'important')
    }
  }, [settings])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    for (const rec of annotations) {
      void Promise.resolve(view.addAnnotation({ value: rec.cfiRange })).catch(() => undefined)
    }
  }, [annotations])

  useEffect(() => {
    const host = rootRef.current
    if (!host) return

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        e.preventDefault()
        beginPinch(e.touches)
      } else if (e.touches.length === 1) {
        tapRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() }
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length < 2) return
      e.preventDefault()
      if (!pinchRef.current.active) beginPinch(e.touches)
      movePinch(e.touches)
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (pinchRef.current.active && e.touches.length < 2) endPinch()
      if (
        e.changedTouches.length === 1 &&
        Date.now() - tapRef.current.t < 280 &&
        Date.now() - pinchRef.current.lastAt > 350
      ) {
        const t = e.changedTouches[0]
        const dx = Math.abs(t.clientX - tapRef.current.x)
        const dy = Math.abs(t.clientY - tapRef.current.y)
        if (dx < 12 && dy < 12) {
          const rect = host.getBoundingClientRect()
          const x = (t.clientX - rect.left) / rect.width
          if (x > 0.28 && x < 0.72) onTapCenterRef.current()
          else if (x <= 0.28) void viewRef.current?.goLeft()
          else void viewRef.current?.goRight()
        }
      }
    }

    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const next = clampFont(settingsRef.current.fontSize + (e.deltaY < 0 ? 1 : -1))
      settingsRef.current = { ...settingsRef.current, fontSize: next }
      applyLiveFont(next)
      onFontSizeRef.current(next)
      window.setTimeout(() => showPinchBadge(next, false), 700)
    }

    host.addEventListener('touchstart', onTouchStart, { passive: false })
    host.addEventListener('touchmove', onTouchMove, { passive: false })
    host.addEventListener('touchend', onTouchEnd)
    host.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      host.removeEventListener('touchstart', onTouchStart)
      host.removeEventListener('touchmove', onTouchMove)
      host.removeEventListener('touchend', onTouchEnd)
      host.removeEventListener('wheel', onWheel)
    }
  }, [])

  const { bg } = themeColors(settings)

  return (
    <>
      <div
        ref={rootRef}
        className="foliate-host"
        style={{ background: bg }}
        onClick={(e) => {
          if ((e.target as HTMLElement).classList.contains('foliate-host')) onTapCenter()
        }}
      />
      <div ref={badgeRef} className="pinch-badge" hidden>
        18 px
      </div>
    </>
  )
})
