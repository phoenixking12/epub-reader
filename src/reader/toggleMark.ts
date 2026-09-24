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

/**
 * A second swatch on the same selection must update the mark already created,
 * even when the database query has not returned that row yet.
 */
export function markTargetId(input: {
  paintedId?: string | null
  pendingId?: string | null
  selectedId?: string | null
  cfi?: string
  annotations: Array<{ id: string; cfiRange: string; createdAt: number }>
}): string | null {
  if (input.paintedId) return input.paintedId
  if (input.pendingId) return input.pendingId
  if (input.selectedId) return input.selectedId
  const same = input.annotations.filter((a) => input.cfi && a.cfiRange === input.cfi)
  if (!same.length) return null
  return [...same].sort((a, b) => b.createdAt - a.createdAt)[0]!.id
}

export function duplicateMarkIds(
  keptId: string,
  cfi: string,
  annotations: Array<{ id: string; cfiRange: string }>,
): string[] {
  return annotations.filter((a) => a.cfiRange === cfi && a.id !== keptId).map((a) => a.id)
}
