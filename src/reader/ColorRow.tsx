import { HIGHLIGHT_COLORS } from '../settings/defaults'
import { ColorWheel } from './ColorWheel'

interface Props {
  color: string
  customColors?: string[]
  wheelOpen: boolean
  onToggleWheel: () => void
  onPick: (hex: string) => void
  onWheelChange?: (hex: string) => void
  onWheelCommit: (hex: string) => void
}

export function ColorRow({
  color,
  customColors = [],
  wheelOpen,
  onToggleWheel,
  onPick,
  onWheelChange,
  onWheelCommit,
}: Props) {
  return (
    <>
      <div className="color-row compact">
        {HIGHLIGHT_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            className={`swatch ${c === color ? 'active' : ''}`}
            style={{ background: c }}
            aria-label={`Highlight ${c}`}
            onClick={() => onPick(c)}
          />
        ))}
        <button
          type="button"
          className={`swatch wheel-toggle ${wheelOpen ? 'active' : ''}`}
          aria-label="More colors"
          onClick={onToggleWheel}
        >
          ◐
        </button>
      </div>
      {customColors.length > 0 && (
        <>
          <p className="field-label tight">Custom</p>
          <div className="color-row compact">
            {customColors.map((c) => (
              <button
                key={c}
                type="button"
                className={`swatch ${c === color ? 'active' : ''}`}
                style={{ background: c }}
                aria-label={`Custom highlight ${c}`}
                onClick={() => onPick(c)}
              />
            ))}
          </div>
        </>
      )}
      {wheelOpen && (
        <ColorWheel color={color} onChange={onWheelChange ?? (() => undefined)} onCommit={onWheelCommit} />
      )}
    </>
  )
}
