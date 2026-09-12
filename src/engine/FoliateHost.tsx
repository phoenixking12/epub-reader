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
import { bookmarkBlocks, caretIsTextual, isHugeNativeSelection, nearestBookmarkBlock, wordRangeFromHit } from './selectWord'
import { chapterReadFraction, quoteLooksLike } from '../reader/progress'
import { usesPublisherFont } from '../settings/defaults'
import { installCfiIgnore } from './cfiIgnore'

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
  relayout: () => void
  scrollChapterTo: (fraction: number) => void
  goToBookmark: (target: string, quote?: string) => Promise<void>
  getSelection: () => SelectionInfo | null
  getLocation: () => { cfi: string; quote: string }
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

function unwrapAnnSpans(doc: Document, id: string) {
  doc.querySelectorAll(`[data-lg-ann="${id}"]`).forEach((el) => {
    const parent = el.parentNode
    if (!parent) return
    while (el.firstChild) parent.insertBefore(el.firstChild, el)
    parent.removeChild(el)
    if ('normalize' in parent) parent.normalize()
  })
}

function isInlineMark(style: AnnotationRecord['style']) {
  return style === 'textColor' || style === 'bold' || style === 'italic'
}

function styleInlineSpan(span: HTMLElement, rec: AnnotationRecord) {
  span.dataset.lgAnn = rec.id
  span.dataset.lgKind = rec.style
  span.removeAttribute('style')
  if (rec.style === 'textColor') span.style.setProperty('color', rec.color, 'important')
  if (rec.style === 'bold') span.style.setProperty('font-weight', '700', 'important')
  if (rec.style === 'italic') span.style.setProperty('font-style', 'italic', 'important')
}

function retargetRange(range: Range, node: Node) {
  try {
    range.selectNode(node)
  } catch {
    try {
      range.selectNodeContents(node)
    } catch {
      /* detached */
    }
  }
}

function applyTextHighlight(doc: Document, range: Range, rec: AnnotationRecord) {
  if (!isInlineMark(rec.style)) {
    unwrapAnnSpans(doc, rec.id)
    return
  }
  const existing = [...doc.querySelectorAll(`[data-lg-ann="${CSS.escape(rec.id)}"]`)]
  if (existing.length) {
    for (const el of existing) {
      if (el instanceof HTMLElement) styleInlineSpan(el, rec)
    }
    retargetRange(range, existing[0]!)
    return
  }
  const span = doc.createElement('span')
  styleInlineSpan(span, rec)
  try {
    range.surroundContents(span)
  } catch {
    span.append(range.extractContents())
    range.insertNode(span)
  }
  retargetRange(range, span)
}

function flashArrived(node: Node | Range | null) {
  const el =
    node instanceof Range
      ? node.commonAncestorContainer instanceof Element
        ? node.commonAncestorContainer
        : node.commonAncestorContainer.parentElement
      : node instanceof Element
        ? node
        : node?.parentElement ?? null
  const block =
    el?.closest?.('p, h1, h2, h3, h4, h5, h6, li, blockquote, dd, dt, pre, figcaption, div') ?? el
  if (!(block instanceof HTMLElement)) return
  block.classList.add('lg-arrived')
  window.setTimeout(() => block.classList.remove('lg-arrived'), 1400)
}

function revealQuote(view: View, quote?: string) {
  const renderer = view.renderer as {
    scrollToAnchor?: (anchor: Range | number, select?: boolean) => Promise<void>
    getContents: () => Array<{ doc?: Document; index: number }>
  }
  if (quote?.trim()) {
    const needle = quote.replace(/\s+/g, ' ').trim()
    for (const { doc } of renderer.getContents()) {
      if (!doc) continue
      for (const block of bookmarkBlocks(doc)) {
        const text = (block.innerText || block.textContent || '').replace(/\s+/g, ' ').trim()
        if (!quoteLooksLike(text, needle)) continue
        const range = doc.createRange()
        try {
          range.selectNodeContents(block)
        } catch {
          continue
        }
        void renderer.scrollToAnchor?.(range)
        flashArrived(block)
        return true
      }
    }
  }
  const loc = view.lastLocation
  if (loc?.range instanceof Range) {
    void renderer.scrollToAnchor?.(loc.range)
    flashArrived(loc.range)
    return true
  }
  return false
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
  const liveSelectDocs = useRef(new WeakSet<Document>())
  const tapRef = useRef({ t: 0, x: 0, y: 0, timer: 0 })
  const scrollPanRef = useRef({ lastY: 0, lastT: 0, vy: 0, active: false, raf: 0, suppressTapUntil: 0 })
  const ignoreSelRef = useRef(false)

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

  const isScrollMode = () =>
    settingsRef.current.pageTurnMode === 'scroll' || settingsRef.current.flow === 'scrolled'

  const stopFling = () => {
    if (scrollPanRef.current.raf) {
      cancelAnimationFrame(scrollPanRef.current.raf)
      scrollPanRef.current.raf = 0
    }
  }

  const panChapter = (dy: number) => {
    viewRef.current?.renderer?.pan?.(0, dy)
  }

  const beginChapterPan = (clientY: number, time: number) => {
    stopFling()
    scrollPanRef.current.lastY = clientY
    scrollPanRef.current.lastT = time
    scrollPanRef.current.vy = 0
    scrollPanRef.current.active = false
  }

  const moveChapterPan = (clientY: number, time: number) => {
    const s = scrollPanRef.current
    const dt = Math.max(1, time - s.lastT)
    const dy = clientY - s.lastY
    const inst = dy / dt
    s.vy = s.vy * 0.55 + inst * 0.45
    s.lastY = clientY
    s.lastT = time
    s.active = true
    panChapter(-dy)
  }

  const flingChapter = () => {
    const s = scrollPanRef.current
    if (s.active) s.suppressTapUntil = Date.now() + 200
    s.active = false
    let vy = s.vy * 1.55
    if (Math.abs(vy) < 0.16) return
    let last = performance.now()
    const step = (now: number) => {
      const dt = Math.min(32, now - last)
      last = now
      vy *= Math.pow(0.988, dt / 16)
      if (Math.abs(vy) < 0.03) {
        s.raf = 0
        return
      }
      panChapter(-vy * dt)
      s.raf = requestAnimationFrame(step)
    }
    s.raf = requestAnimationFrame(step)
  }

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
    const hit = doc.elementFromPoint(x, y)
    const sel = doc.getSelection()
    const range = wordRangeFromHit(point, hit instanceof Element ? hit : null)
    if (!range || !sel) return false
    sel.removeAllRanges()
    sel.addRange(range)
    return true
  }

  const extendSelectionTo = (doc: Document, x: number, y: number) => {
    const point = rangeFromPoint(doc, x, y)
    const sel = doc.getSelection()
    if (!point || !sel?.rangeCount) return
    if (!caretIsTextual(point.startContainer)) return
    try {
      sel.extend(point.startContainer, point.startOffset)
    } catch {
      const range = sel.getRangeAt(0)
      try {
        range.setEnd(point.startContainer, point.startOffset)
      } catch {
        /* cross-boundary */
      }
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

  const cfiFor = (index: number, range?: Range) => {
    const view = viewRef.current
    if (!view) return ''
    try {
      return view.getCFI(index, range)
    } catch {
      try {
        return view.getCFI(index)
      } catch {
        return ''
      }
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
    const cfi = overlayCfi || cfiFor(index, range)
    const wrap =
      range.commonAncestorContainer instanceof Element
        ? range.commonAncestorContainer.closest?.('[data-lg-ann]')
        : range.commonAncestorContainer.parentElement?.closest?.('[data-lg-ann]')
    const wrapId = wrap instanceof HTMLElement ? wrap.dataset.lgAnn : undefined
    const rec =
      annotationsRef.current.find((a) => a.cfiRange === cfi) ||
      annotationsRef.current.find((a) => a.id === wrapId)
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
    const el = doc.elementFromPoint(x, y)
    const wrap = el?.closest?.('[data-lg-ann]')
    if (wrap instanceof HTMLElement && wrap.dataset.lgAnn) {
      const rec = annotationsRef.current.find((a) => a.id === wrap.dataset.lgAnn)
      if (rec) {
        const around = doc.createRange()
        try {
          around.selectNodeContents(wrap)
          return { value: rec.cfiRange, range: around }
        } catch {
          /* fall through */
        }
      }
    }
    const part = view.renderer.getContents().find((c) => c.doc === doc)
    const overlayer = part?.overlayer as
      | { hitTest?: (pt: { x: number; y: number }) => [string?, Range?] }
      | undefined
    const [value, range] = overlayer?.hitTest?.({ x, y }) ?? []
    if (value && !value.startsWith('foliate-search:') && range) return { value, range }
    return null
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
    doc.documentElement.classList.add('lg-custom-sel')
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
    liveSelectDocs.current.delete(doc)
    doc.querySelectorAll('.lg-sel-handle').forEach((n) => n.remove())
    savedRanges.current.delete(doc)
    clearSelHighlight(doc)
    doc.documentElement.classList.remove('lg-custom-sel')
  }

  const paintParagraphMarks = () => {
    const view = viewRef.current
    if (!view?.renderer) return
    for (const { doc, index } of view.renderer.getContents()) {
      if (!doc) continue
      doc.documentElement.classList.toggle('lg-show-marks', showMarksRef.current)
      doc.querySelectorAll('.lg-pmark').forEach((n) => n.remove())
      if (!showMarksRef.current) continue
      for (const block of bookmarkBlocks(doc)) {
        const quote = (block.innerText || block.textContent || '').replace(/\s+/g, ' ').trim()
        if (quote.length < 2) continue
        const range = doc.createRange()
        try {
          const mark = block.querySelector(':scope > .lg-pmark')
          if (mark?.nextSibling) {
            range.setStartBefore(mark.nextSibling)
            range.setEndAfter(block.lastChild as Node)
          } else {
            range.selectNodeContents(block)
          }
        } catch {
          continue
        }
        const cfi = cfiFor(index, range)
        const on = bookmarksRef.current.some(
          (b) => b.cfi === cfi || (b.kind === 'paragraph' && b.quote === quote),
        )
        const btn = doc.createElement('button')
        btn.type = 'button'
        btn.className = `lg-pmark${on ? ' on' : ''}`
        btn.setAttribute('aria-label', on ? 'Edit bookmark' : 'Bookmark paragraph')
        if (doc.defaultView?.getComputedStyle(block).position === 'static') {
          block.style.setProperty('position', 'relative', 'important')
        }
        let opened = false
        const open = (e: Event) => {
          e.preventDefault()
          e.stopPropagation()
          if (opened) return
          if (Date.now() < scrollPanRef.current.suppressTapUntil) return
          opened = true
          window.setTimeout(() => {
            opened = false
          }, 400)
          const r = btn.getBoundingClientRect()
          const vp = toViewport(doc, r.left, r.top)
          onParagraphTapRef.current({ cfi, quote, x: vp.x, y: vp.y })
        }
        btn.addEventListener('click', open)
        btn.addEventListener('touchend', open)
        block.prepend(btn)
      }
    }
  }

  const handleContentTap = (doc: Document, clientX: number, clientY: number, target?: EventTarget | null) => {
    const hit =
      (target instanceof Element ? target : null) ||
      doc.elementFromPoint(clientX, clientY)
    if (hit?.closest('a, button, .lg-sel-handle, .lg-pmark')) {
      window.clearTimeout(tapRef.current.timer)
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
    const isDouble = now - prev.t < 340 && Math.hypot(clientX - prev.x, clientY - prev.y) < 48
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
      prev.t = 0
      const img = hit?.closest?.('img')
      if (img instanceof HTMLImageElement) {
        onImageRef.current({ src: img.src, alt: img.alt || img.title || '' })
        return
      }
      if (showMarksRef.current) {
        showMarksRef.current = false
        paintParagraphMarks()
        onShowMarksRef.current?.(false)
        onIdleTapRef.current?.()
        return
      }
      const fromNode =
        target instanceof Text
          ? target.parentElement
          : target instanceof Element
            ? target
            : hit
      const caret = rangeFromPoint(doc, clientX, clientY)
      const caretEl =
        caret?.startContainer instanceof Element
          ? caret.startContainer
          : caret?.startContainer.parentElement ?? null
      const block =
        nearestBookmarkBlock(fromNode instanceof Element ? fromNode : hit instanceof Element ? hit : null) ||
        nearestBookmarkBlock(caretEl)
      showMarksRef.current = true
      paintParagraphMarks()
      const painted = Boolean(doc.querySelector('.lg-pmark'))
      if (painted || block instanceof HTMLElement) {
        onShowMarksRef.current?.(true)
        return
      }
      showMarksRef.current = false
      paintParagraphMarks()
      onShowMarksRef.current?.(false)
      onIdleTapRef.current?.()
    }, 360)
  }

  const suppressNativeUi = (doc: Document) => {
    doc.addEventListener('contextmenu', (e) => e.preventDefault())
  }

  const emitDocSelection = (doc: Document, overlayCfi?: string, mode: 'live' | 'commit' = 'commit') => {
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
      liveSelectDocs.current.delete(doc)
      clearHandles(doc)
      onSelectionRef.current(null)
      return
    }
    const range = sel.getRangeAt(0)
    savedRanges.current.set(doc, range.cloneRange())
    if (mode === 'live') {
      liveSelectDocs.current.add(doc)
      onSelectionRef.current(info)
      return
    }
    liveSelectDocs.current.delete(doc)
    const box = rangeBox(range)
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
    if (painted) hideNativeSelection(doc)
  }

  const bindTextSelection = (doc: Document) => {
    if (selectDocs.current.has(doc)) return
    selectDocs.current.add(doc)
    suppressNativeUi(doc)
    const state = {
      timer: 0,
      x: 0,
      y: 0,
      lastX: 0,
      lastY: 0,
      t: 0,
      selecting: false,
      panning: false,
      fromTouch: false,
      handle: null as 'start' | 'end' | null,
      anchorNode: null as Node | null,
      anchorOffset: 0,
      emitRaf: 0,
    }
    const emitSoon = () => {
      if (state.emitRaf) return
      state.emitRaf = requestAnimationFrame(() => {
        state.emitRaf = 0
        emitDocSelection(doc, undefined, 'live')
      })
    }
    const stretchTo = (x: number, y: number) => {
      const point = rangeFromPoint(doc, x, y)
      const sel = restoreSavedRange(doc) ?? doc.getSelection()
      if (!point || !sel) return
      if (!caretIsTextual(point.startContainer)) return
      if (state.anchorNode) {
        try {
          sel.setBaseAndExtent(state.anchorNode, state.anchorOffset, point.startContainer, point.startOffset)
        } catch {
          extendSelectionTo(doc, x, y)
        }
      } else {
        extendSelectionTo(doc, x, y)
      }
      emitSoon()
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
        state.lastX = t.clientX
        state.lastY = t.clientY
        state.t = Date.now()
        state.fromTouch = true
        state.panning = false
        if (isScrollMode()) stopFling()
        window.clearTimeout(state.timer)
        const handleEl = target?.closest?.('.lg-sel-handle') as HTMLElement | null
        if (handleEl) {
          e.preventDefault()
          e.stopPropagation()
          clearSelHighlight(doc)
          doc.documentElement.classList.remove('lg-custom-sel')
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
        if (target?.closest?.('a, button')) {
          state.selecting = false
          return
        }
        state.selecting = false
        state.handle = null
        state.anchorNode = null
        state.timer = window.setTimeout(() => {
          if (state.panning) return
          if (selectWordAt(doc, state.x, state.y)) {
            state.selecting = true
            const sel = doc.getSelection()
            if (sel?.rangeCount) {
              const range = sel.getRangeAt(0)
              state.anchorNode = range.startContainer
              state.anchorOffset = range.startOffset
            }
            doc.querySelectorAll('.lg-sel-handle').forEach((n) => n.remove())
            clearSelHighlight(doc)
            doc.documentElement.classList.remove('lg-custom-sel')
            emitDocSelection(doc, undefined, 'live')
            navigator.vibrate?.(12)
          }
        }, 480)
      },
      { capture: true, passive: false },
    )
    doc.addEventListener(
      'touchmove',
      (e) => {
        if (e.touches.length !== 1) return
        const t = e.touches[0]
        const moved = Math.hypot(t.clientX - state.x, t.clientY - state.y)
        const totalX = t.clientX - state.x
        const totalY = t.clientY - state.y
        const scrollMode = isScrollMode()
        if (state.handle || state.selecting) {
          e.preventDefault()
          e.stopPropagation()
          stretchTo(t.clientX, t.clientY)
          state.lastX = t.clientX
          state.lastY = t.clientY
          return
        }
        if (moved > 8) window.clearTimeout(state.timer)
        if (scrollMode && (state.panning || (moved > 12 && Math.abs(totalY) > Math.abs(totalX) * 0.7))) {
          if (!state.panning) beginChapterPan(t.clientY, e.timeStamp)
          state.panning = true
          e.preventDefault()
          e.stopPropagation()
          moveChapterPan(t.clientY, e.timeStamp)
          state.lastX = t.clientX
          state.lastY = t.clientY
        }
      },
      { capture: true, passive: false },
    )
    const endSelect = (e: TouchEvent) => {
      window.clearTimeout(state.timer)
      if (state.emitRaf) {
        cancelAnimationFrame(state.emitRaf)
        state.emitRaf = 0
      }
      if (state.selecting || state.handle) {
        emitDocSelection(doc)
        state.selecting = false
        state.handle = null
        state.panning = false
        return
      }
      if (state.panning) {
        state.panning = false
        state.selecting = false
        state.handle = null
        flingChapter()
        return
      }
      if (
        e.changedTouches.length === 1 &&
        Date.now() - state.t < 500 &&
        Date.now() - pinchRef.current.lastAt > 350
      ) {
        const t = e.changedTouches[0]
        const dx = t.clientX - state.x
        const dy = t.clientY - state.y
        const mode = settingsRef.current.pageTurnMode
        const sideways = Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.4
        if (sideways && (mode === 'swipe' || isScrollMode())) {
          e.stopPropagation()
          if (mode === 'scroll') {
            if (dx < 0) viewRef.current?.renderer?.nextSection?.()
            else viewRef.current?.renderer?.prevSection?.()
          } else if (dx < 0) void viewRef.current?.goRight()
          else void viewRef.current?.goLeft()
          return
        }
        if (Math.abs(dx) < 12 && Math.abs(dy) < 12) {
          handleContentTap(doc, t.clientX, t.clientY, e.target)
        }
      }
      state.selecting = false
      state.handle = null
      state.panning = false
    }
    doc.addEventListener('touchend', endSelect, { capture: true })
    doc.addEventListener('touchcancel', endSelect, { capture: true })
    doc.addEventListener('mouseup', (e) => {
      if (state.selecting || state.handle) {
        emitDocSelection(doc)
        return
      }
      const sel = doc.getSelection()
      const moved = Math.hypot(e.clientX - state.x, e.clientY - state.y)
      if (sel && !sel.isCollapsed && moved > 8) emitDocSelection(doc)
    })
    doc.addEventListener('click', (ev) => {
      if (state.fromTouch) {
        state.fromTouch = false
        return
      }
      if (ev.defaultPrevented) return
      const sel = doc.getSelection()
      const moved = Math.hypot(ev.clientX - state.x, ev.clientY - state.y)
      if (sel && !sel.isCollapsed && (moved > 8 || state.selecting)) {
        emitDocSelection(doc)
        return
      }
      if (sel && !sel.isCollapsed) sel.removeAllRanges()
      handleContentTap(doc, ev.clientX, ev.clientY, ev.target)
    })
    if (window.matchMedia?.('(pointer: fine)').matches) {
      doc.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return
        state.x = e.clientX
        state.y = e.clientY
        window.clearTimeout(state.timer)
        state.timer = window.setTimeout(() => {
          if (selectWordAt(doc, state.x, state.y)) {
            state.selecting = true
            emitDocSelection(doc)
          }
        }, 350)
      })
      doc.addEventListener('mousemove', (e) => {
        if (!state.timer) return
        if (Math.hypot(e.clientX - state.x, e.clientY - state.y) > 8) {
          window.clearTimeout(state.timer)
          state.timer = 0
        }
      })
    }
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
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
          const next = clampFont(settingsRef.current.fontSize + (e.deltaY < 0 ? 1 : -1))
          settingsRef.current = { ...settingsRef.current, fontSize: next }
          applyLiveFont(next)
          onFontSizeRef.current(next)
          window.setTimeout(() => showPinchBadge(next, false), 700)
          return
        }
        if (isScrollMode()) {
          e.preventDefault()
          panChapter(e.deltaY * 1.35)
        }
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
    relayout: () => {
      const renderer = viewRef.current?.renderer as { render?: () => void } | undefined
      renderer?.render?.()
    },
    scrollChapterTo: (fraction) => {
      const renderer = viewRef.current?.renderer as {
        start?: number
        size?: number
        viewSize?: number
        pan?: (dx: number, dy: number) => void
      } | undefined
      if (!renderer?.pan) return
      const vis = renderer.size || 1
      const content = renderer.viewSize || 1
      const maxScroll = Math.max(0, content - vis)
      const target = Math.min(maxScroll, Math.max(0, fraction * maxScroll))
      renderer.pan(0, target - (renderer.start ?? 0))
    },
    goToBookmark: async (target, quote) => {
      const view = viewRef.current
      if (!view || !target) return
      const renderer = view.renderer as {
        scrollToAnchor?: (anchor: Range | Element | number) => Promise<void>
        getContents: () => Array<{ doc?: Document; index: number }>
      }

      const pinToTarget = async () => {
        const resolved = view.resolveNavigation(target) as
          | { index?: number; anchor?: (doc: Document) => Range | Element | number }
          | undefined
        if (!resolved || typeof resolved.anchor !== 'function') return false
        const part =
          renderer.getContents().find((c) => c.index === resolved.index) ?? renderer.getContents()[0]
        const doc = part?.doc
        if (!doc) return false
        let frag: Range | Element | number
        try {
          frag = resolved.anchor(doc)
        } catch {
          return false
        }
        if (frag instanceof Range || (frag instanceof Element && frag.nodeType === 1)) {
          await renderer.scrollToAnchor?.(frag)
          flashArrived(frag instanceof Range ? frag : frag)
          return true
        }
        if (typeof frag === 'number') {
          await renderer.scrollToAnchor?.(frag)
          return true
        }
        return false
      }

      let went = false
      try {
        await view.goTo(target)
        went = true
      } catch {
        went = false
      }
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => resolve())
      })
      const pinned = await pinToTarget()
      if (pinned || went) {
        window.setTimeout(() => {
          void pinToTarget()
        }, 220)
        return
      }
      const needle = (quote ?? '').replace(/\s+/g, ' ').trim()
      if (needle.length < 20) return
      if (revealQuote(view, needle)) return
      for (const [index, section] of view.book.sections.entries()) {
        if (!section.createDocument) continue
        try {
          const doc = await section.createDocument()
          const text = (doc.body?.innerText ?? '').replace(/\s+/g, ' ').trim()
          if (!quoteLooksLike(text, needle) && !text.includes(needle.slice(0, 32))) continue
          await view.goTo(index)
          await new Promise<void>((resolve) => {
            window.requestAnimationFrame(() => resolve())
          })
          if (revealQuote(view, needle)) return
        } catch {
          /* next section */
        }
      }
    },
    getSelection: () => {
      const view = viewRef.current
      if (!view) return null
      for (const { doc } of view.renderer.getContents()) {
        restoreSavedRange(doc)
        const info = selectionFromDoc(doc)
        if (info) return info
      }
      return null
    },
    getLocation: () => {
      const view = viewRef.current
      if (!view) return { cfi: '', quote: '' }
      const loc = view.lastLocation
      const snippet = loc?.range?.toString?.()?.replace(/\s+/g, ' ').trim().slice(0, 140)
      if (loc?.cfi) {
        return { cfi: loc.cfi, quote: snippet || loc.tocItem?.label || '' }
      }
      const part = view.renderer?.getContents()?.[0]
      if (part) return { cfi: cfiFor(part.index), quote: snippet || '' }
      return { cfi: '', quote: '' }
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
        if (hidingNative.current.has(doc) || liveSelectDocs.current.has(doc) || ignoreSelRef.current) return
        if (scrollPanRef.current.active) return
        const sel = doc.getSelection()
        if (!sel || sel.isCollapsed) {
          if (savedRanges.current.has(doc)) return
          clearHandles(doc)
          onSelectionRef.current(null)
          return
        }
        const text = sel.toString()
        const saved = savedRanges.current.get(doc)
        if (!saved && isHugeNativeSelection(text, 0)) {
          hidingNative.current.add(doc)
          sel.removeAllRanges()
          window.setTimeout(() => hidingNative.current.delete(doc), 0)
          return
        }
        emitDocSelection(doc)
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
        size?: number
        page?: number
        pages?: number
      }
      const scrolled = Boolean(renderer?.scrolled)
      let sectionFraction = 0
      let page = 1
      let pages = 1
      if (scrolled) {
        sectionFraction = chapterReadFraction(renderer.start ?? 0, renderer.viewSize || 1, renderer.size || 1)
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
      applyTextHighlight(doc, range, rec)
      if (isInlineMark(rec.style)) {
        draw(Overlayer.highlight, { color: 'rgba(0,0,0,0)' })
      } else {
        const [fn, opts] = drawAnnotation(rec.style, rec.color)
        draw(fn, opts)
      }
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
        installCfiIgnore(view)
        const book = view.book
        book.transformTarget?.addEventListener('data', (ev) => {
          const detail = (ev as CustomEvent).detail as { data: Promise<unknown>; name?: string }
          detail.data = Promise.resolve(detail.data).catch(() => '')
        })
        applyRendererLayout(view.renderer, settingsRef.current)
        view.renderer.setStyles?.(buildReaderCSS(settingsRef.current))
        try {
          await view.init({ lastLocation: lastLocation || undefined, showTextStart: !lastLocation })
        } catch (err) {
          console.warn(err)
          await view.goTo(0).catch(() => undefined)
        }
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

  const settingsKey = [
    settings.flow,
    settings.pageTurnMode,
    settings.margin,
    settings.maxInlineSize,
    settings.gap,
    settings.fontSize,
    settings.fontFamily,
    settings.lineHeight,
    settings.theme,
    settings.customBg,
    settings.customFg,
    settings.customLink,
    settings.justify,
    settings.hyphenate,
    settings.writingMode,
    settings.footnotePosition,
    settings.invertImagesInNight,
  ].join('|')

  useEffect(() => {
    const view = viewRef.current
    if (!view?.renderer || pinchRef.current.active) return
    applyRendererLayout(view.renderer, settingsRef.current)
    view.renderer.setStyles?.(buildReaderCSS(settingsRef.current))
    for (const part of view.renderer.getContents()) {
      part.doc?.documentElement.style.setProperty('font-size', `${settingsRef.current.fontSize}px`, 'important')
      if (usesPublisherFont(settingsRef.current.fontFamily)) {
        part.doc?.documentElement.style.removeProperty('font-family')
        part.doc?.body?.style.removeProperty('font-family')
      } else {
        part.doc?.documentElement.style.setProperty('font-family', settingsRef.current.fontFamily, 'important')
        part.doc?.body?.style.setProperty('font-family', settingsRef.current.fontFamily, 'important')
      }
    }
  }, [settingsKey])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const prev = prevAnnRef.current
    const nextById = new Map(annotations.map((a) => [a.id, a]))
    for (const rec of prev) {
      const next = nextById.get(rec.id)
      const gone = !next
      const moved = Boolean(next && next.cfiRange !== rec.cfiRange)
      const styleChanged = Boolean(next && next.style !== rec.style)
      const colorChanged = Boolean(next && next.color !== rec.color)
      if (!gone && !moved && !styleChanged && !colorChanged) continue
      void Promise.resolve(view.deleteAnnotation({ value: rec.cfiRange })).catch(() => undefined)
      if (gone || moved || styleChanged) {
        if (view.renderer) {
          for (const { doc } of view.renderer.getContents()) {
            if (doc) unwrapAnnSpans(doc, rec.id)
          }
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
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const next = clampFont(settingsRef.current.fontSize + (e.deltaY < 0 ? 1 : -1))
        settingsRef.current = { ...settingsRef.current, fontSize: next }
        applyLiveFont(next)
        onFontSizeRef.current(next)
        window.setTimeout(() => showPinchBadge(next, false), 700)
        return
      }
      if (isScrollMode()) {
        e.preventDefault()
        panChapter(e.deltaY * 1.35)
      }
    }

    host.addEventListener('touchstart', onTouchStart, { passive: false })
    host.addEventListener('touchmove', onTouchMove, { passive: false })
    host.addEventListener('touchend', onTouchEnd)
    host.addEventListener('wheel', onWheel, { passive: false })
    let lastW = 0
    let lastH = 0
    const ro = new ResizeObserver(() => {
      if (scrollPanRef.current.active || scrollPanRef.current.raf) return
      const rect = host.getBoundingClientRect()
      if (Math.abs(rect.width - lastW) < 1 && Math.abs(rect.height - lastH) < 1) return
      lastW = rect.width
      lastH = rect.height
      const renderer = viewRef.current?.renderer as { render?: () => void } | undefined
      renderer?.render?.()
    })
    ro.observe(host)
    return () => {
      stopFling()
      ro.disconnect()
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
        style={{ background: bg, ['--lg-side' as string]: `${settings.margin}px` }}
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
