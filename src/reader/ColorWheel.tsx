import { useEffect, useRef } from 'react'

interface Props {
  color: string
  size?: number
  onChange: (hex: string) => void
  onCommit?: (hex: string) => void
}

function hsvToHex(h: number, s: number, v: number) {
  const f = (n: number) => {
    const k = (n + h / 60) % 6
    return v - v * s * Math.max(Math.min(k, 4 - k, 1), 0)
  }
  const to = (x: number) =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${to(f(5))}${to(f(3))}${to(f(1))}`
}

export function ColorWheel({ color, size = 120, onChange, onCommit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const lastColor = useRef(color)
  lastColor.current = color

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
        const sat = dist / r
        const hex = hsvToHex(hue, sat, 1)
        image.data[i] = parseInt(hex.slice(1, 3), 16)
        image.data[i + 1] = parseInt(hex.slice(3, 5), 16)
        image.data[i + 2] = parseInt(hex.slice(5, 7), 16)
        image.data[i + 3] = 255
      }
    }
    ctx.putImageData(image, 0, 0)
  }, [size])

  const pick = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = ((clientX - rect.left) / rect.width) * canvas.width
    const y = ((clientY - rect.top) / rect.height) * canvas.height
    const r = canvas.width / 2
    const dx = x - r
    const dy = y - r
    const dist = Math.hypot(dx, dy)
    if (dist > r) return
    const hex = hsvToHex(((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360, dist / r, 1)
    lastColor.current = hex
    onChange(hex)
  }

  return (
    <div className="color-wheel-wrap">
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
        onPointerUp={() => onCommit?.(lastColor.current)}
      />
      <div className="wheel-preview" style={{ background: color }} />
    </div>
  )
}
