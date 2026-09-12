import { useState } from 'react'
import { rememberCustomColor } from '../settings/colors'
import { BUNDLED_FONTS, flowForPageTurn } from '../settings/defaults'
import type { DisplaySettings, FontRecord, PageTurnMode } from '../types/models'
import { ColorRow } from './ColorRow'

export type DisplaySection = 'text' | 'display' | 'color'

interface Props {
  open: boolean
  section: DisplaySection
  settings: DisplaySettings
  customFonts: FontRecord[]
  onChange: (patch: Partial<DisplaySettings>) => void
  onImportFont: (files: FileList) => void
  onClose: () => void
}

const THEME_LABELS = { day: 'Day', sepia: 'Sepia', night: 'Night', custom: 'Custom' } as const
const TURN_MODES: Array<{ id: PageTurnMode; label: string; hint: string }> = [
  { id: 'swipe', label: 'Swipe', hint: 'Swipe sideways to turn the page.' },
  { id: 'buttons', label: 'Buttons', hint: 'On-screen previous and next buttons.' },
  { id: 'volume', label: 'Volume', hint: 'Volume up/down turns the page while you read.' },
  { id: 'scroll', label: 'Scroll', hint: 'Scroll through each chapter.' },
]

export function DisplayPanel({ open, section, settings, customFonts, onChange, onImportFont, onClose }: Props) {
  const [wheelOpen, setWheelOpen] = useState(false)
  if (!open) return null
  const title = section === 'text' ? 'Text' : section === 'color' ? 'Color' : 'Display'
  return (
    <div className="sheet display-sheet" role="dialog" aria-label={title}>
      <div className="sheet-handle" />
      <header className="sheet-head">
        <h2>{title}</h2>
        <button className="icon-btn" onClick={onClose}>
          Done
        </button>
      </header>

      {section === 'text' && (
        <>
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
          <div className="action-row">
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
        </>
      )}

      {section === 'display' && (
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
          <p className="field-label">Default highlight</p>
          <ColorRow
            color={settings.defaultAnnotationColor}
            customColors={settings.customHighlightColors}
            wheelOpen={wheelOpen}
            onToggleWheel={() => setWheelOpen((v) => !v)}
            onPick={(c) => onChange({ defaultAnnotationColor: c })}
            onWheelCommit={(c) =>
              onChange({
                defaultAnnotationColor: c,
                customHighlightColors: rememberCustomColor(settings.customHighlightColors, c),
              })
            }
          />
          <p className="field-label">Turn pages</p>
          <div className="action-row">
            {TURN_MODES.map((mode) => (
              <button
                key={mode.id}
                className={settings.pageTurnMode === mode.id ? 'chip active' : 'chip'}
                onClick={() => onChange({ pageTurnMode: mode.id, flow: flowForPageTurn(mode.id) })}
              >
                {mode.label}
              </button>
            ))}
          </div>
          <p className="muted">{TURN_MODES.find((m) => m.id === settings.pageTurnMode)?.hint}</p>
          <p className="field-label">Brightness</p>
          <div className="action-row">
            <button
              className={settings.brightnessMode !== 'manual' ? 'chip active' : 'chip'}
              onClick={() => onChange({ brightnessMode: 'auto' })}
            >
              Auto
            </button>
            <button
              className={settings.brightnessMode === 'manual' ? 'chip active' : 'chip'}
              onClick={() => onChange({ brightnessMode: 'manual' })}
            >
              Manual
            </button>
          </div>
          {settings.brightnessMode !== 'manual' ? (
            <p className="muted">Follows the phone’s brightness.</p>
          ) : (
            <label className="field">
              Level {Math.round(settings.brightness * 100)}%
              <input
                type="range"
                min={0.2}
                max={1}
                step={0.02}
                value={settings.brightness}
                onChange={(e) => onChange({ brightness: Number(e.target.value) })}
              />
            </label>
          )}
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
            Side gap {settings.gap}%
            <input
              type="range"
              min={0}
              max={12}
              step={1}
              value={settings.gap}
              onChange={(e) => onChange({ gap: Number(e.target.value) })}
            />
          </label>
          <label className="field">
            Line length {settings.maxInlineSize}px
            <input
              type="range"
              min={280}
              max={1400}
              step={10}
              value={settings.maxInlineSize}
              onChange={(e) => onChange({ maxInlineSize: Number(e.target.value) })}
            />
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
        </>
      )}

      {section === 'color' && (
        <>
          <p className="field-label">Highlight color</p>
          <ColorRow
            color={settings.defaultAnnotationColor}
            customColors={settings.customHighlightColors}
            wheelOpen={wheelOpen}
            onToggleWheel={() => setWheelOpen((v) => !v)}
            onPick={(c) => onChange({ defaultAnnotationColor: c })}
            onWheelCommit={(c) =>
              onChange({
                defaultAnnotationColor: c,
                customHighlightColors: rememberCustomColor(settings.customHighlightColors, c),
              })
            }
          />
        </>
      )}
    </div>
  )
}
