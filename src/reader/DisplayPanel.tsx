import { useState } from 'react'
import { BUNDLED_FONTS, HIGHLIGHT_COLORS } from '../settings/defaults'
import type { DisplaySettings, FontRecord } from '../types/models'

interface Props {
  open: boolean
  settings: DisplaySettings
  customFonts: FontRecord[]
  onChange: (patch: Partial<DisplaySettings>) => void
  onImportFont: (files: FileList) => void
  onClose: () => void
}

const THEME_LABELS = { day: 'Day', sepia: 'Sepia', night: 'Night', custom: 'Custom' } as const

export function DisplayPanel({ open, settings, customFonts, onChange, onImportFont, onClose }: Props) {
  const [tab, setTab] = useState<'look' | 'page' | 'more'>('look')
  if (!open) return null
  return (
    <div className="sheet display-sheet" role="dialog" aria-label="Reading settings">
      <div className="sheet-handle" />
      <header className="sheet-head">
        <h2>Reading</h2>
        <button className="icon-btn" onClick={onClose}>
          Done
        </button>
      </header>
      <div className="sheet-tabs">
        <button className={tab === 'look' ? 'active' : ''} onClick={() => setTab('look')}>
          Look
        </button>
        <button className={tab === 'page' ? 'active' : ''} onClick={() => setTab('page')}>
          Page
        </button>
        <button className={tab === 'more' ? 'active' : ''} onClick={() => setTab('more')}>
          More
        </button>
      </div>

      {tab === 'look' && (
        <>
          <div className="action-row">
            {(Object.keys(THEME_LABELS) as Array<keyof typeof THEME_LABELS>).map((id) => (
              <button
                key={id}
                className={settings.theme === id ? 'chip active' : 'chip'}
                onClick={() => onChange({ theme: id })}
              >
                {THEME_LABELS[id]}
              </button>
            ))}
          </div>
          {settings.theme === 'custom' && (
            <div className="action-row">
              <label className="field grow">
                Page
                <input type="color" value={settings.customBg} onChange={(e) => onChange({ customBg: e.target.value })} />
              </label>
              <label className="field grow">
                Ink
                <input type="color" value={settings.customFg} onChange={(e) => onChange({ customFg: e.target.value })} />
              </label>
            </div>
          )}
          <label className="field">
            Typeface
            <select value={settings.fontFamily} onChange={(e) => onChange({ fontFamily: e.target.value })}>
              {BUNDLED_FONTS.map((f) => (
                <option key={f.id} value={f.value}>
                  {f.label}
                </option>
              ))}
              {customFonts.map((f) => (
                <option key={f.id} value={`"${f.family}", serif`}>
                  {f.family}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Size {Math.round(settings.fontSize)}
            <input
              type="range"
              min={12}
              max={36}
              step={0.5}
              value={settings.fontSize}
              onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
            />
          </label>
          <label className="field">
            Brightness {Math.round(settings.brightness * 100)}%
            <input
              type="range"
              min={0.2}
              max={1}
              step={0.02}
              value={settings.brightness}
              onChange={(e) => onChange({ brightness: Number(e.target.value) })}
            />
          </label>
          <p className="field-label">Highlight color</p>
          <div className="color-row compact">
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c}
                className={`swatch ${settings.defaultAnnotationColor === c ? 'active' : ''}`}
                style={{ background: c }}
                aria-label={`Highlight ${c}`}
                onClick={() => onChange({ defaultAnnotationColor: c })}
              />
            ))}
          </div>
        </>
      )}

      {tab === 'page' && (
        <>
          <div className="action-row">
            <button
              className={settings.flow === 'paginated' ? 'chip active' : 'chip'}
              onClick={() => onChange({ flow: 'paginated' })}
            >
              Pages
            </button>
            <button
              className={settings.flow === 'scrolled' ? 'chip active' : 'chip'}
              onClick={() => onChange({ flow: 'scrolled' })}
            >
              Scroll
            </button>
            <button
              className={settings.justify ? 'chip active' : 'chip'}
              onClick={() => onChange({ justify: !settings.justify })}
            >
              Justify
            </button>
            <button
              className={settings.hyphenate ? 'chip active' : 'chip'}
              onClick={() => onChange({ hyphenate: !settings.hyphenate })}
            >
              Hyphenate
            </button>
          </div>
          <label className="field">
            Line spacing {settings.lineHeight.toFixed(2)}
            <input
              type="range"
              min={1.1}
              max={2.2}
              step={0.05}
              value={settings.lineHeight}
              onChange={(e) => onChange({ lineHeight: Number(e.target.value) })}
            />
          </label>
          <label className="field">
            Side margin {settings.margin}px
            <input
              type="range"
              min={0}
              max={72}
              step={2}
              value={settings.margin}
              onChange={(e) => onChange({ margin: Number(e.target.value) })}
            />
          </label>
          <label className="field">
            Line length {settings.maxInlineSize}px
            <input
              type="range"
              min={280}
              max={900}
              step={10}
              value={settings.maxInlineSize}
              onChange={(e) => onChange({ maxInlineSize: Number(e.target.value) })}
            />
          </label>
        </>
      )}

      {tab === 'more' && (
        <>
          <label className="field">
            Add a font (TTF or OTF)
            <input
              type="file"
              accept=".ttf,.otf,font/ttf,font/otf"
              multiple
              onChange={(e) => e.target.files && onImportFont(e.target.files)}
            />
          </label>
          <label className="field">
            Writing direction
            <select
              value={settings.writingMode}
              onChange={(e) => onChange({ writingMode: e.target.value as DisplaySettings['writingMode'] })}
            >
              <option value="auto">Follow the book</option>
              <option value="horizontal-tb">Horizontal</option>
              <option value="vertical-rl">Vertical RTL</option>
              <option value="vertical-lr">Vertical LTR</option>
            </select>
          </label>
          <label className="field">
            Footnotes
            <select
              value={settings.footnotePosition}
              onChange={(e) => onChange({ footnotePosition: e.target.value as DisplaySettings['footnotePosition'] })}
            >
              <option value="popup">Popup</option>
              <option value="bottom">Bottom sheet</option>
              <option value="follow">As printed</option>
            </select>
          </label>
          {settings.theme === 'night' && (
            <label className="check">
              <input
                type="checkbox"
                checked={settings.invertImagesInNight}
                onChange={(e) => onChange({ invertImagesInNight: e.target.checked })}
              />
              Invert images at night
            </label>
          )}
          <label className="field">
            Extra CSS
            <textarea
              rows={3}
              value={settings.customCss}
              placeholder="p { letter-spacing: 0.01em; }"
              onChange={(e) => onChange({ customCss: e.target.value })}
            />
          </label>
        </>
      )}
    </div>
  )
}
