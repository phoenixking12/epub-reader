import type { AnnotationStyle } from '../types/models'

/** Tapping the active mark again clears it; tapping a different mark replaces it. */
export function shouldRemoveMark(existing: boolean, current: AnnotationStyle | undefined, next: AnnotationStyle) {
  return existing && current === next
}

/** Font color: tapping the same swatch restores the book’s original color. */
export function shouldRemoveColor(
  existing: boolean,
  style: AnnotationStyle | undefined,
  current: string,
  next: string,
) {
  return existing && style === 'textColor' && current.toLowerCase() === next.toLowerCase()
}
