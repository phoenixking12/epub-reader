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

export function rememberCustomColor(list: string[] | undefined, hex: string): string[] {
  const n = normalizeHex(hex)
  if (!n.startsWith('#') || isPresetHighlight(n)) return [...(list ?? [])]
  return [n, ...(list ?? []).filter((c) => normalizeHex(c) !== n)].slice(0, MAX_CUSTOM_COLORS)
}
