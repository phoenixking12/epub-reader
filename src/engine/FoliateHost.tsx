import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react'
import { View } from 'foliate-js/view.js'
import { Overlayer } from 'foliate-js/overlayer.js'
import { FootnoteHandler } from 'foliate-js/footnotes.js'
import type { AnnotationRecord, BookmarkRecord, DisplaySettings } from '../types/models'
import { applyRendererLayout, buildReaderCSS, themeColors } from './css'

export interface SelectionInfo {
  cfi: string
  text: string
  index: number
  rect: { left: number; top: number; right: number; bottom: number }
  annotationId?: string
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
  sectionFraction: number
  locLabel: string
  page: number
  pages: number
  scrolled: boolean
}

export interface SearchHit {
  cfi: string
  excerpt: { pre: string; match: string; post: string }
  label?: string
}

export interface ParagraphTapInfo {
  cfi: string
  quote: string
  x: number
  y: number
}

export interface FoliateHandle {
  goLeft: () => void
  goRight: () => void
  goPrevSection: () => void
  goNextSection: () => void
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
  bookmarks?: Array<Pick<BookmarkRecord, 'cfi' | 'quote' | 'kind'>>
  showParagraphMarks?: boolean
  onRelocate: (info: RelocateInfo) => void
  onSelection: (sel: SelectionInfo | null) => void
  onImage: (img: ImageInfo) => void
  onFootnote: (note: FootnoteInfo | null) => void
  onReady?: (toc: unknown, title: string, hasMedia: boolean) => void
  onTapCenter: () => void
  onParagraphTap: (info: ParagraphTapInfo | null) => void
  onShowMarks?: (visible: boolean) => void
  onIdleTap?: () => void
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
  if (rec.style !== 'textColor' && rec.style !== 'bold' && rec.style !== 'italic') return
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
        : rec.style === 'italic'
          ? `font-style: italic;`
          : ''
  const start = `::highlight(${name})`
  const lines = (styleEl.textContent || '').split('\n').filter((line) => !line.includes(start))
  if (extra) lines.push(`${start} { ${extra} }`)
  styleEl.textContent = `${lines.filter(Boolean).join('\n')}\n`
}

export const FoliateHost = forwardRef<FoliateHandle, Props>(function FoliateHost(
  {
    file,
    lastLocation,
    settings,
    annotations,
    bookmarks = [],
    showParagraphMarks = false,
    onRelocate,
    onSelection,
    onImage,
    onFootnote,
    onReady,
    onTapCenter,
    onParagraphTap,
    onShowMarks,
    onIdleTap,
    onFontSizeChange,
  },
  ref,
) {
  const rootRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<View | null>(null)
  const settingsRef = useRef(settings)
  const annotationsRef = useRef(annotations)
  const bookmarksRef = useRef(bookmarks)
  const showMarksRef = useRef(showParagraphMarks)
  const pinchRef = useRef({ active: false, startDist: 0, startSize: 18, lastSize: 18, lastAt: 0 })
  const badgeRef = useRef<HTMLDivElement>(null)
  const pinchDocs = useRef(new WeakSet<Document>())
  const selectDocs = useRef(new WeakSet<Document>())
  const prevAnnRef = useRef<AnnotationRecord[]>([])
  const onRelocateRef = useRef(onRelocate)
  const onSelectionRef = useRef(onSelection)
  const onImageRef = useRef(onImage)
  const onFootnoteRef = useRef(onFootnote)
  const onTapCenterRef = useRef(onTapCenter)
  const onParagraphTapRef = useRef(onParagraphTap)
  const onShowMarksRef = useRef(onShowMarks)
  const onIdleTapRef = useRef(onIdleTap)
  const onReadyRef = useRef(onReady)
  const onFontSizeRef = useRef(onFontSizeChange)
  const savedRanges = useRef(new WeakMap<Document, Range>())
  const hidingNative = useRef(new WeakSet<Document>())
  const tapRef = useRef({ t: 0, x: 0, y: 0, timer: 0 })

  settingsRef.current = settings
  annotationsRef.current = annotations
  bookmarksRef.current = bookmarks
  showMarksRef.current = showParagraphMarks
  onRelocateRef.current = onRelocate
  onSelectionRef.current = onSelection
  onImageRef.current = onImage
  onFootnoteRef.current = onFootnote
  onTapCenterRef.current = onTapCenter
  onParagraphTapRef.current = onParagraphTap
  onShowMarksRef.current = onShowMarks
  onIdleTapRef.current = onIdleTap
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

  const toViewport = (doc: Document, x: number, y: number) => {
    const frame = doc.defaultView?.frameElement
    if (frame instanceof HTMLElement) {
      const rect = frame.getBoundingClientRect()
      return { x: rect.left + x, y: rect.top + y }
    }
    return { x, y }
  }

  const rangeBox = (range: Range) => {
    const rects = Array.from(range.getClientRects()).filter((r) => r.width > 0 && r.height > 0)
    if (!rects.length) {
      const b = range.getBoundingClientRect()
      return { left: b.left, top: b.top, right: b.right, bottom: b.bottom, start: b, end: b }
    }
    return {
      left: Math.min(...rects.map((r) => r.left)),
      top: Math.min(...rects.map((r) => r.top)),
      right: Math.max(...rects.map((r) => r.right)),
      bottom: Math.max(...rects.map((r) => r.bottom)),
      start: rects[0],
      end: rects[rects.length - 1],
    }
  }

  const selectionFromDoc = (doc: Document, overlayCfi?: string): SelectionInfo | null => {
    const view = viewRef.current
    if (!view) return null
    const sel = doc.getSelection()
    if (!sel || sel.isCollapsed || !sel.rangeCount) return null
    const range = sel.getRangeAt(0)
    const text = sel.toString().trim()
    if (!text) return null
    const index = view.renderer.getContents().find((c) => c.doc === doc)?.index ?? 0
    const box = rangeBox(range)
    const origin = toViewport(doc, 0, 0)
    const cfi = overlayCfi || view.getCFI(index, range)
    const rec = annotationsRef.current.find((a) => a.cfiRange === cfi)
    return {
      cfi,
      text,
      index,
      annotationId: rec?.id,
      rect: {
        left: origin.x + box.left,
        top: origin.y + box.top,
        right: origin.x + box.right,
        bottom: origin.y + box.bottom,
      },
    }
  }

  const hitAnnotation = (doc: Document, x: number, y: number) => {
    const view = viewRef.current
    if (!view?.renderer) return null
    const part = view.renderer.getContents().find((c) => c.doc === doc)
    const overlayer = part?.overlayer as
      | { hitTest?: (pt: { x: number; y: number }) => [string?, Range?] }
      | undefined
    if (!overlayer?.hitTest) return null
    const [value, range] = overlayer.hitTest({ x, y })
    if (!value || value.startsWith('foliate-search:') || !range) return null
    return { value, range }
  }

  const clearSelHighlight = (doc: Document) => {
    const highlights = doc.defaultView?.CSS?.highlights
    highlights?.delete('lg-sel')
  }

  const paintSelHighlight = (doc: Document, range: Range) => {
    const Win = doc.defaultView
    if (!Win?.Highlight || !Win.CSS?.highlights) return false
    try {
      Win.CSS.highlights.set('lg-sel', new Win.Highlight(range))
      return true
    } catch {
      return false
    }
  }

  const hideNativeSelection = (doc: Document) => {
    const sel = doc.getSelection()
    if (!sel) return
    hidingNative.current.add(doc)
    sel.removeAllRanges()
    window.setTimeout(() => hidingNative.current.delete(doc), 0)
  }

  const restoreSavedRange = (doc: Document) => {
    const saved = savedRanges.current.get(doc)
    const sel = doc.getSelection()
    if (!saved || !sel) return sel
    try {
      hidingNative.current.add(doc)
      sel.removeAllRanges()
      sel.addRange(saved.cloneRange())
    } catch {
      /* range detached */
    }
    window.setTimeout(() => hidingNative.current.delete(doc), 0)
    return sel
  }

  const clearHandles = (doc: Document) => {
    doc.querySelectorAll('.lg-sel-handle').forEach((n) => n.remove())
    savedRanges.current.delete(doc)
    clearSelHighlight(doc)
  }

  const paintParagraphMarks = () => {
    const view = viewRef.current
    if (!view?.renderer) return
    for (const { doc, index } of view.renderer.getContents()) {
      if (!doc) continue
      doc.documentElement.classList.toggle('lg-show-marks', showMarksRef.current)
      doc.querySelectorAll('.lg-pmark').forEach((n) => n.remove())
      if (!showMarksRef.current) continue
      const nodes = doc.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote')
      for (const block of nodes) {
        if (!(block instanceof HTMLElement)) continue
        const quote = (block.innerText || block.textContent || '').replace(/\s+/g, ' ').trim()
        if (quote.length < 2) continue
        const range = doc.createRange()
        try {
          range.selectNodeContents(block)
        } catch {
          continue
        }
        const cfi = view.getCFI(index, range)
        const on = bookmarksRef.current.some(
          (b) => b.cfi === cfi || (b.kind === 'paragraph' && b.quote === quote),
        )
        const btn = doc.createElement('button')
        btn.type = 'button'
        btn.className = `lg-pmark${on ? ' on' : ''}`
        btn.setAttribute('aria-label', on ? 'Edit bookmark' : 'Bookmark paragraph')
        btn.addEventListener('click', (e) => {
          e.preventDefault()
          e.stopPropagation()
          const r = btn.getBoundingClientRect()
          const vp = toViewport(doc, r.left, r.top)
          onParagraphTapRef.current({ cfi, quote, x: vp.x, y: vp.y })
        })
        block.prepend(btn)
      }
    }
  }

  const handleContentTap = (doc: Document, clientX: number, clientY: number) => {
    const hit = doc.elementFromPoint(clientX, clientY)
    if (hit?.closest('a, img, video, audio, button, .lg-pmark, .lg-sel-handle')) {
      return
    }
    if (savedRanges.current.has(doc) || doc.querySelector('.lg-sel-handle')) {
      clearHandles(doc)
      doc.getSelection()?.removeAllRanges()
      onSelectionRef.current(null)
      viewRef.current?.deselect()
      return
    }
    const existing = hitAnnotation(doc, clientX, clientY)
    const now = Date.now()
    const prev = tapRef.current
    const isDouble = now - prev.t < 300 && Math.hypot(clientX - prev.x, clientY - prev.y) < 28
    window.clearTimeout(prev.timer)

    if (isDouble) {
      prev.t = 0
      prev.timer = 0
      onTapCenterRef.current()
      return
    }

    prev.t = now
    prev.x = clientX
    prev.y = clientY

    if (existing) {
      prev.t = 0
      const sel = doc.getSelection()
      sel?.removeAllRanges()
      try {
        sel?.addRange(existing.range.cloneRange())
      } catch {
        sel?.addRange(existing.range)
      }
      emitDocSelection(doc, existing.value)
      return
    }

    prev.timer = window.setTimeout(() => {
      const block = hit?.closest?.('p, h1, h2, h3, h4, h5, h6, li, blockquote')
      if (block) {
        showMarksRef.current = true
        paintParagraphMarks()
        onShowMarksRef.current?.(true)
        return
      }
      showMarksRef.current = false
      paintParagraphMarks()
      onShowMarksRef.current?.(false)
      onIdleTapRef.current?.()
    }, 300)
  }

  const suppressNativeUi = (doc: Document) => {
    doc.addEventListener('contextmenu', (e) => e.preventDefault())
  }

  const emitDocSelection = (doc: Document, overlayCfi?: string, keepNative = false) => {
    let sel = doc.getSelection()
    if (!sel?.rangeCount || sel.isCollapsed) {
      const saved = savedRanges.current.get(doc)
      if (saved) {
        try {
          hidingNative.current.add(doc)
          sel?.removeAllRanges()
          sel?.addRange(saved.cloneRange())
        } catch {
          /* detached */
        }
        window.setTimeout(() => hidingNative.current.delete(doc), 0)
        sel = doc.getSelection()
      }
    }
    const info = selectionFromDoc(doc, overlayCfi)
    sel = doc.getSelection()
    if (!info || !sel?.rangeCount) {
      if (savedRanges.current.has(doc) && doc.querySelector('.lg-sel-handle')) return
      clearHandles(doc)
      onSelectionRef.current(null)
      return
    }
    const range = sel.getRangeAt(0)
    const box = rangeBox(range)
    savedRanges.current.set(doc, range.cloneRange())
    const painted = paintSelHighlight(doc, range)
    const placeHandle = (edge: 'start' | 'end', x: number, y: number) => {
      let el = doc.querySelector(`.lg-sel-handle[data-edge="${edge}"]`) as HTMLElement | null
      if (!el) {
        el = doc.createElement('div')
        el.className = 'lg-sel-handle'
        el.dataset.edge = edge
        doc.body.append(el)
      }
      el.style.left = `${x - 14}px`
      el.style.top = `${y}px`
    }
    placeHandle('start', box.start.left, box.start.top - 14)
    placeHandle('end', box.end.right, box.end.bottom - 30)
    onSelectionRef.current(info)
    if (!keepNative && painted) hideNativeSelection(doc)
  }

  const bindTextSelection = (doc: Document) => {
    if (selectDocs.current.has(doc)) return
    selectDocs.current.add(doc)
    suppressNativeUi(doc)
    const state: {
      timer: number
      x: number
      y: number
      t: number
      selecting: boolean
      fromTouch: boolean
      handle: 'start' | 'end' | null
      anchorNode: Node | null
      anchorOffset: number
    } = {
      timer: 0,
      x: 0,
      y: 0,
      t: 0,
      selecting: false,
      fromTouch: false,
      handle: null,
      anchorNode: null,
      anchorOffset: 0,
    }
    doc.addEventListener(
      'touchstart',
      (e) => {
        if (e.touches.length !== 1) {
          window.clearTimeout(state.timer)
          state.selecting = false
          state.handle = null
          return
        }
        const t = e.touches[0]
        const target = e.target as HTMLElement | null
        state.x = t.clientX
        state.y = t.clientY
        state.t = Date.now()
        state.fromTouch = true
        window.clearTimeout(state.timer)
        const handleEl = target?.closest?.('.lg-sel-handle') as HTMLElement | null
        if (handleEl) {
          e.preventDefault()
          e.stopPropagation()
          const sel = restoreSavedRange(doc) ?? doc.getSelection()
          if (!sel?.rangeCount) return
          const range = sel.getRangeAt(0)
          state.handle = handleEl.dataset.edge === 'start' ? 'start' : 'end'
          state.selecting = true
          if (state.handle === 'end') {
            state.anchorNode = range.startContainer
            state.anchorOffset = range.startOffset
          } else {
            state.anchorNode = range.endContainer
            state.anchorOffset = range.endOffset
          }
          return
        }
        if (target?.closest?.('.lg-pmark, a, button')) {
          state.selecting = false
          return
        }
        state.selecting = false
        state.handle = null
        state.timer = window.setTimeout(() => {
          state.selecting = true
          selectWordAt(doc, state.x, state.y)
          emitDocSelection(doc)
          navigator.vibrate?.(12)
        }, 400)
      },
      { capture: true, passive: false },
    )
    doc.addEventListener(
      'touchmove',
      (e) => {
        if (e.touches.length !== 1) return
        const t = e.touches[0]
        const moved = Math.hypot(t.clientX - state.x, t.clientY - state.y)
        if (state.handle && state.anchorNode) {
          e.preventDefault()
          e.stopPropagation()
          const point = rangeFromPoint(doc, t.clientX, t.clientY)
          const sel = restoreSavedRange(doc) ?? doc.getSelection()
          if (!point || !sel) return
          try {
            sel.setBaseAndExtent(state.anchorNode, state.anchorOffset, point.startContainer, point.startOffset)
          } catch {
            extendSelectionTo(doc, t.clientX, t.clientY)
          }
          emitDocSelection(doc)
          return
        }
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
      if (state.selecting || state.handle) {
        e.stopPropagation()
        emitDocSelection(doc)
        state.selecting = false
        state.handle = null
        return
      }
      if (
        e.changedTouches.length === 1 &&
        Date.now() - state.t < 400 &&
        Date.now() - pinchRef.current.lastAt > 350
      ) {
        const t = e.changedTouches[0]
        const dx = t.clientX - state.x
        const dy = t.clientY - state.y
        const mode = settingsRef.current.pageTurnMode
        const sideways = Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.4
        if (sideways && (mode === 'swipe' || mode === 'scroll')) {
          e.stopPropagation()
          if (mode === 'scroll') {
            if (dx < 0) viewRef.current?.renderer?.nextSection?.()
            else viewRef.current?.renderer?.prevSection?.()
          } else if (dx < 0) void viewRef.current?.goRight()
          else void viewRef.current?.goLeft()
          return
        }
        if (Math.abs(dx) < 12 && Math.abs(dy) < 12) {
          e.stopPropagation()
          handleContentTap(doc, t.clientX, t.clientY)
        }
      }
      state.selecting = false
      state.handle = null
    }
    doc.addEventListener('touchend', endSelect, { capture: true })
    doc.addEventListener('touchcancel', endSelect, { capture: true })
    doc.addEventListener('click', (ev) => {
      if (state.fromTouch) {
        state.fromTouch = false
        return
      }
      if (ev.defaultPrevented) return
      const sel = doc.getSelection()
      if (sel && !sel.isCollapsed) return
      handleContentTap(doc, ev.clientX, ev.clientY)
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
    goPrevSection: () => void viewRef.current?.renderer?.prevSection?.(),
    goNextSection: () => void viewRef.current?.renderer?.nextSection?.(),
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
      for (const { doc } of view.renderer.getContents()) {
        restoreSavedRange(doc)
        const info = selectionFromDoc(doc)
        if (info) {
          hideNativeSelection(doc)
          return info
        }
      }
      return null
    },
    deselect: () => {
      const view = viewRef.current
      view?.deselect()
      if (!view?.renderer) return
      for (const { doc } of view.renderer.getContents()) {
        if (!doc) continue
        clearHandles(doc)
        doc.getSelection()?.removeAllRanges()
      }
    },
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

    const onLoad = (e: Event) => {
      const { doc } = (e as CustomEvent).detail as { doc: Document; index: number }
      doc.addEventListener('selectionchange', () => {
        if (hidingNative.current.has(doc)) return
        const sel = doc.getSelection()
        if (!sel || sel.isCollapsed) {
          if (savedRanges.current.has(doc)) return
          clearHandles(doc)
          onSelectionRef.current(null)
          return
        }
        emitDocSelection(doc)
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
      }
      const renderer = view.renderer as HTMLElement & {
        scrolled?: boolean
        start?: number
        viewSize?: number
        page?: number
        pages?: number
      }
      const scrolled = Boolean(renderer?.scrolled)
      let sectionFraction = 0
      let page = 1
      let pages = 1
      if (scrolled) {
        const size = renderer.viewSize || 1
        sectionFraction = Math.min(1, Math.max(0, (renderer.start ?? 0) / size))
      } else if (renderer) {
        const textPages = Math.max(1, (renderer.pages ?? 3) - 2)
        page = Math.min(textPages, Math.max(1, (renderer.page ?? 1) - 1))
        pages = textPages
        sectionFraction = pages > 1 ? (page - 1) / (pages - 1) : 1
      }
      onRelocateRef.current({
        cfi: d.cfi ?? '',
        fraction: d.fraction ?? 0,
        sectionFraction,
        locLabel: d.tocItem?.label || '',
        page,
        pages,
        scrolled,
      })
      window.setTimeout(() => paintParagraphMarks(), 0)
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
      if (rec.style === 'textColor' || rec.style === 'bold' || rec.style === 'italic') {
        draw(Overlayer.highlight, { color: 'rgba(0,0,0,0)' })
      } else {
        const [fn, opts] = drawAnnotation(rec.style, rec.color)
        draw(fn, opts)
      }
      applyTextHighlight(doc, range, rec)
    }

    const onShow = (e: Event) => {
      const { value, range } = (e as CustomEvent).detail as { value: string; range?: Range }
      if (!range) return
      const owner = range.startContainer.ownerDocument
      if (!owner) return
      const sel = owner.getSelection()
      sel?.removeAllRanges()
      try {
        sel?.addRange(range.cloneRange())
      } catch {
        sel?.addRange(range)
      }
      emitDocSelection(owner, value)
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
        paintParagraphMarks()
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
      prevAnnRef.current = []
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
      part.doc?.documentElement.style.setProperty('font-family', settings.fontFamily, 'important')
      part.doc?.body?.style.setProperty('font-family', settings.fontFamily, 'important')
    }
  }, [settings])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const prev = prevAnnRef.current
    const nextKeys = new Set(annotations.map((a) => a.cfiRange))
    for (const rec of prev) {
      if (nextKeys.has(rec.cfiRange)) continue
      void Promise.resolve(view.deleteAnnotation({ value: rec.cfiRange })).catch(() => undefined)
      if (typeof CSS !== 'undefined' && CSS.highlights) CSS.highlights.delete(`ann-${rec.id}`)
      if (view.renderer) {
        for (const { doc } of view.renderer.getContents()) {
          const highlights = doc?.defaultView?.CSS?.highlights
          highlights?.delete(`ann-${rec.id}`)
        }
      }
    }
    for (const rec of annotations) {
      void Promise.resolve(view.addAnnotation({ value: rec.cfiRange })).catch(() => undefined)
    }
    prevAnnRef.current = annotations
  }, [annotations])

  useEffect(() => {
    paintParagraphMarks()
  }, [showParagraphMarks, bookmarks])

  useEffect(() => {
    const host = rootRef.current
    if (!host) return

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        e.preventDefault()
        beginPinch(e.touches)
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
        onDoubleClick={(e) => {
          if ((e.target as HTMLElement).classList.contains('foliate-host')) onTapCenter()
        }}
      />
      <div ref={badgeRef} className="pinch-badge" hidden>
        18 px
      </div>
    </>
  )
})
