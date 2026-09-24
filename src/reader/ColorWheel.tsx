import { useEffect, useRef, useState } from 'react'
import { hexToHsv, hexToRgb, hsvToHex, rgbToHex, type Rgb } from '../settings/colors'

interface Props {
  color: string
  size?: number
  onChange: (hex: string) => void
  onCommit?: (hex: string) => void
}

export function ColorWheel({ color, size = 120, onChange, onCommit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const held = useRef(hexToHsv(color) ?? { h: 0, s: 1, v: 1 })
  const [preview, setPreview] = useState(color)

  useEffect(() => {
    setPreview(color)
    const next = hexToHsv(color)
    if (!next) return
    if (next.s > 0) held.current = next
    else if (next.v > 0) held.current = { h: held.current.h, s: 0, v: next.v }
    else held.current = { h: held.current.h, s: held.current.s, v: 0 }
  }, [color])

  const parsed = hexToHsv(preview)
  const hsv = parsed
    ? parsed.s > 0
      ? parsed
      : { h: held.current.h, s: parsed.v === 0 ? held.current.s : 0, v: parsed.v }
    : held.current
  const rgb = hexToRgb(preview) ?? { r: 0, g: 0, b: 0 }
  const intensity = hsv.v

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const r = size / 2
    const image = ctx.createImageData(size, size)
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - r
        const dy = y - r
        const dist = Math.hypot(dx, dy)
        const i = (y * size + x) * 4
        if (dist > r) {
          image.data[i + 3] = 0
          continue
        }
        const hue = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360
        const hex = hsvToHex(hue, dist / r, intensity)
        image.data[i] = Number.parseInt(hex.slice(1, 3), 16)
        image.data[i + 1] = Number.parseInt(hex.slice(3, 5), 16)
        image.data[i + 2] = Number.parseInt(hex.slice(5, 7), 16)
        image.data[i + 3] = 255
      }
    }
    ctx.putImageData(image, 0, 0)
  }, [size, intensity])

  const emit = (h: number, s: number, v: number) => {
    held.current = { h, s, v }
    setPreview(hsvToHex(h, s, v))
  }

  const pick = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = ((clientX - rect.left) / rect.width) * canvas.width
    const y = ((clientY - rect.top) / rect.height) * canvas.height
    const radius = canvas.width / 2
    const dx = x - radius
    const dy = y - radius
    const dist = Math.hypot(dx, dy)
    if (dist > radius) return
    const hue = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360
    emit(hue, dist / radius, held.current.v)
  }

  const confirm = () => {
    const hex = hsvToHex(held.current.h, held.current.s, held.current.v)
    onChange(hex)
    onCommit?.(hex)
  }
  const rad = (hsv.h * Math.PI) / 180
  const dotX = 50 + Math.cos(rad) * hsv.s * 50
  const dotY = 50 + Math.sin(rad) * hsv.s * 50

  return (
    <div className="color-adjust">
      <div className="color-wheel-wrap">
        <div className="color-wheel-stage" style={{ width: size, height: size }}>
          <canvas
            ref={canvasRef}
            className="color-wheel"
            aria-label="Color wheel"
            onPointerDown={(e) => {
              ;(e.target as HTMLCanvasElement).setPointerCapture(e.pointerId)
              pick(e.clientX, e.clientY)
            }}
            onPointerMove={(e) => {
              if (e.buttons) pick(e.clientX, e.clientY)
            }}
          />
          <span className="color-wheel-dot" style={{ left: `${dotX}%`, top: `${dotY}%` }} />
        </div>
        <div className="wheel-preview" style={{ background: preview }} />
      </div>
      <label className="field">
        Intensity {Math.round(intensity * 100)}
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.round(intensity * 100)}
          aria-label="Color intensity"
          onChange={(e) => emit(held.current.h, held.current.s, Number(e.target.value) / 100)}
        />
      </label>
      <RgbFields
        rgb={rgb}
        onPick={(next) => {
          const hex = rgbToHex(next.r, next.g, next.b)
          const nextHsv = hexToHsv(hex) ?? { h: held.current.h, s: 0, v: 0 }
          emit(
            nextHsv.s > 0 ? nextHsv.h : held.current.h,
            nextHsv.v === 0 ? held.current.s : nextHsv.s,
            nextHsv.v,
          )
        }}
      />
      <button type="button" className="chip active color-confirm" onClick={confirm}>
        Confirm
      </button>
    </div>
  )
}

function RgbFields({ rgb, onPick }: { rgb: Rgb; onPick: (rgb: Rgb) => void }) {
  const [text, setText] = useState({ r: String(rgb.r), g: String(rgb.g), b: String(rgb.b) })
  const focus = useRef(0)

  useEffect(() => {
    if (focus.current > 0) return
    setText({ r: String(rgb.r), g: String(rgb.g), b: String(rgb.b) })
  }, [rgb.r, rgb.g, rgb.b])

  const parsed = (draft: { r: string; g: string; b: string }): Rgb | null => {
    const read = (value: string) => (/^\d{1,3}$/.test(value) ? Number(value) : Number.NaN)
    const r = read(draft.r)
    const g = read(draft.g)
    const b = read(draft.b)
    if (![r, g, b].every((n) => n >= 0 && n <= 255)) return null
    return { r, g, b }
  }

  const write = (key: keyof Rgb, raw: string) => {
    const next = { ...text, [key]: raw }
    setText(next)
    const color = parsed(next)
    if (color) onPick(color)
  }

  return (
    <div className="rgb-row">
      {(['r', 'g', 'b'] as const).map((key) => (
        <label key={key} className="field">
          {key.toUpperCase()}
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={255}
            aria-label={`${key.toUpperCase()} value`}
            value={text[key]}
            onFocus={() => {
              focus.current += 1
            }}
            onBlur={() => {
              focus.current = Math.max(0, focus.current - 1)
              if (!parsed(text)) setText({ r: String(rgb.r), g: String(rgb.g), b: String(rgb.b) })
            }}
            onChange={(e) => write(key, e.target.value)}
          />
        </label>
      ))}
    </div>
  )
}
