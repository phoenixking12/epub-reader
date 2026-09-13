import type { AnnotationStyle } from '../types/models'

/** Tapping the active mark again clears it; tapping a different mark replaces it. */
export function shouldRemoveMark(existing: boolean, current: AnnotationStyle | undefined, next: AnnotationStyle) {
  return existing && current === next
}
