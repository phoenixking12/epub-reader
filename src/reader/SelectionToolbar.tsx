import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { AnnotationStyle, WebSearchEngine } from '../types/models'
import { ColorRow } from './ColorRow'

interface Props {
  visible: boolean
  quote?: string
  existing?: boolean
  defaultStyle?: AnnotationStyle
  defaultColor: string
  customColors?: string[]
  searchEngine?: WebSearchEngine
  anchor?: { left: number; top: number; right: number; bottom: number } | null
  onHighlight: (style: AnnotationStyle, color: string) => void
  onNote: () => void
  onSearch: () => void
  onShare: () => void
  onCopy: () => void
  onClose: () => void
  onRemove?: () => void
}

const STYLES: Array<{ id: AnnotationStyle; label: string; mark: string; className?: string }> = [
  { id: 'highlight', label: 'Highlight', mark: 'A', className: 'mark-hl' },
  { id: 'underline', label: 'Underline', mark: 'A', className: 'mark-ul' },
  { id: 'textColor', label: 'Font color', mark: 'A', className: 'mark-fg' },
  { id: 'bold', label: 'Bold', mark: 'B' },
  { id: 'italic', label: 'Italic', mark: 'I' },
  { id: 'strike', label: 'Strike', mark: 'S' },
  { id: 'squiggly', label: 'Squiggle', mark: 'A', className: 'mark-sq' },
]

export function SelectionToolbar({
  visible,
  quote,
  existing = false,
  defaultStyle = 'highlight',
  defaultColor,
  customColors = [],
  searchEngine,
  anchor,
  onHighlight,
  onNote,
  onSearch,
  onShare,
  onCopy,
  onClose,
  onRemove,
}: Props) {
  const [color, setColor] = useState(defaultColor)
  const [style, setStyle] = useState<AnnotationStyle>(defaultStyle)
  const [wheelOpen, setWheelOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const popRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 8 })
  const styleRef = useRef(style)
  styleRef.current = style

  useEffect(() => {
    if (visible) {
      setColor(defaultColor)
      setStyle(defaultStyle === 'highlight' || defaultStyle === 'underline' || defaultStyle === 'textColor' ? defaultStyle : 'highlight')
      setWheelOpen(false)
      setMoreOpen(false)
    }
  }, [visible, defaultColor, defaultStyle, quote])

  useLayoutEffect(() => {
    if (!visible) return
    const el = popRef.current
    const width = el?.offsetWidth ?? 280
    const height = el?.offsetHeight ?? 160
    const margin = 8
    const vw = window.innerWidth
    const vh = window.innerHeight
    const box = anchor ?? { left: 16, top: vh / 2, right: vw - 16, bottom: vh / 2 }
    const mid = (box.left + box.right) / 2
    let left = Math.min(Math.max(margin, mid - width / 2), vw - width - margin)
    let top = box.top - height - 12
    if (top < margin) top = box.bottom + 12
    if (top + height > vh - margin) top = Math.max(margin, vh - height - margin)
    if (Number.isNaN(left)) left = margin
    setPos({ top, left })
  }, [visible, anchor, wheelOpen, moreOpen, quote, style])

  const defineLabel = useMemo(
    () => (searchEngine === 'google' ? 'Google' : searchEngine === 'duckduckgo' ? 'DuckDuckGo' : 'Define'),
    [searchEngine],
  )

  if (!visible) return null

  const apply = (nextStyle: AnnotationStyle, nextColor = color) => {
    setStyle(nextStyle)
    setColor(nextColor)
    onHighlight(nextStyle, nextColor)
  }

  return (
    <div
      ref={popRef}
      className="selection-pop"
      role="dialog"
      aria-label="Selection"
      style={{ top: pos.top, left: pos.left }}
    >
      <div className="sel-styles">
        {STYLES.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`sel-icon ${item.className ?? ''} ${style === item.id ? 'on' : ''}`}
            aria-label={item.label}
            aria-pressed={style === item.id}
            onClick={() => apply(item.id, color)}
          >
            {item.mark}
          </button>
        ))}
      </div>
      <ColorRow
        color={color}
        customColors={customColors}
        wheelOpen={wheelOpen}
        onToggleWheel={() => {
          setMoreOpen(false)
          setWheelOpen((v) => !v)
        }}
        onPick={(c) => apply(styleRef.current, c)}
        onWheelChange={setColor}
        onWheelCommit={(c) => apply(style, c)}
      />
      <div className="selection-actions">
        <button className="sel-btn ghost" onClick={onClose} aria-label="Close">
          ✕
        </button>
        {existing && onRemove ? (
          <button className="sel-btn ghost" onClick={onRemove}>
            Remove
          </button>
        ) : null}
        <button className="sel-btn" onClick={onNote}>
          Note
        </button>
        <button className="sel-btn" onClick={onCopy}>
          Copy
        </button>
        <button className="sel-btn" onClick={onSearch}>
          {defineLabel}
        </button>
        <button
          className={`sel-btn ghost ${moreOpen ? 'on' : ''}`}
          aria-expanded={moreOpen}
          onClick={() => {
            setWheelOpen(false)
            setMoreOpen((v) => !v)
          }}
        >
          ⋯
        </button>
      </div>
      {moreOpen && (
        <div className="selection-more">
          <button className="sel-btn" onClick={onShare}>
            Share
          </button>
        </div>
      )}
    </div>
  )
}
