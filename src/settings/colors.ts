import { HIGHLIGHT_COLORS } from './defaults'

export const MAX_CUSTOM_COLORS = 12

export function normalizeHex(color: string): string {
  const v = color.trim().toLowerCase()
  if (/^#[0-9a-f]{6}$/.test(v)) return v
  if (/^#[0-9a-f]{3}$/.test(v)) return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`
  return v
}

export function isPresetHighlight(color: string): boolean {
  const n = normalizeHex(color)
  return HIGHLIGHT_COLORS.some((c) => normalizeHex(c) === n)
}

export interface Rgb {
  r: number
  g: number
  b: number
}

export interface Hsv {
  h: number
  s: number
  v: number
}

export function clampByte(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.min(255, Math.max(0, Math.round(n)))
}

export function hexToRgb(color: string): Rgb | null {
  const hex = normalizeHex(color)
  if (!/^#[0-9a-f]{6}$/.test(hex)) return null
  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
  }
}

export function rgbToHex(r: number, g: number, b: number): string {
  const to = (n: number) => clampByte(n).toString(16).padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`
}

export function rgbToHsv(r: number, g: number, b: number): Hsv {
  const rn = clampByte(r) / 255
  const gn = clampByte(g) / 255
  const bn = clampByte(b) / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6
    else if (max === gn) h = (bn - rn) / d + 2
    else h = (rn - gn) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  return { h, s: max === 0 ? 0 : d / max, v: max }
}

export function hexToHsv(color: string): Hsv | null {
  const rgb = hexToRgb(color)
  return rgb ? rgbToHsv(rgb.r, rgb.g, rgb.b) : null
}

/** Hue 0–360, saturation and intensity (value) 0–1. */
export function hsvToHex(h: number, s: number, v: number): string {
  const sat = Math.min(1, Math.max(0, s))
  const val = Math.min(1, Math.max(0, v))
  const f = (n: number) => {
    const k = (n + h / 60) % 6
    return val - val * sat * Math.max(Math.min(k, 4 - k, 1), 0)
  }
  return rgbToHex(f(5) * 255, f(3) * 255, f(1) * 255)
}

export function rememberCustomColor(list: string[] | undefined, hex: string): string[] {
  const n = normalizeHex(hex)
  if (!n.startsWith('#') || isPresetHighlight(n)) return [...(list ?? [])]
  return [n, ...(list ?? []).filter((c) => normalizeHex(c) !== n)].slice(0, MAX_CUSTOM_COLORS)
}
