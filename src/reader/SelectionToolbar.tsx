import { useEffect, useState } from 'react'
import type { AnnotationStyle, WebSearchEngine } from '../types/models'
import { HIGHLIGHT_COLORS } from '../settings/defaults'
import { ColorWheel } from './ColorWheel'

interface Props {
  visible: boolean
  quote?: string
  defaultStyle?: AnnotationStyle
  defaultColor: string
  searchEngine?: WebSearchEngine
  onHighlight: (style: AnnotationStyle, color: string) => void
  onNote: () => void
  onBookmark: () => void
  onSearch: () => void
  onShare: () => void
  onCopy: () => void
  onClose: () => void
}

export function SelectionToolbar({
  visible,
  quote,
  defaultColor,
  searchEngine,
  onHighlight,
  onNote,
  onBookmark,
  onSearch,
  onShare,
  onCopy,
  onClose,
}: Props) {
  const [color, setColor] = useState(defaultColor)
  const [wheelOpen, setWheelOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)

  useEffect(() => {
    if (visible) {
      setColor(defaultColor)
      setWheelOpen(false)
      setMoreOpen(false)
    }
  }, [visible, defaultColor, quote])

  if (!visible) return null

  const defineLabel =
    searchEngine === 'google' ? 'Google' : searchEngine === 'duckduckgo' ? 'DuckDuckGo' : 'Define'

  return (
    <div className="selection-pop" role="dialog" aria-label="Selection">
      <div className="color-row compact">
        {HIGHLIGHT_COLORS.map((c) => (
          <button
            key={c}
            className={`swatch ${c === color ? 'active' : ''}`}
            style={{ background: c }}
            aria-label={`Highlight ${c}`}
            onClick={() => {
              setColor(c)
              onHighlight('highlight', c)
            }}
          />
        ))}
        <button
          className={`swatch wheel-toggle ${wheelOpen ? 'active' : ''}`}
          aria-label="More colors"
          onClick={() => {
            setMoreOpen(false)
            setWheelOpen((v) => !v)
          }}
        >
          ◐
        </button>
      </div>
      {wheelOpen && (
        <ColorWheel
          color={color}
          onChange={setColor}
          onCommit={(c) => {
            setColor(c)
            onHighlight('highlight', c)
          }}
        />
      )}
      <div className="selection-actions">
        <button className="sel-btn" onClick={() => onHighlight('underline', color)}>
          Underline
        </button>
        <button className="sel-btn" onClick={onSearch}>
          {defineLabel}
        </button>
        <button className="sel-btn" onClick={onNote}>
          Note
        </button>
        <button className="sel-btn" onClick={onCopy}>
          Copy
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
        <button className="sel-btn ghost" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>
      {moreOpen && (
        <div className="selection-more">
          <button className="sel-btn" onClick={onBookmark}>
            Bookmark
          </button>
          <button className="sel-btn" onClick={onShare}>
            Share
          </button>
        </div>
      )}
    </div>
  )
}
