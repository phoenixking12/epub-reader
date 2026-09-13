export type SwipeKind = 'sheet' | 'drawer' | 'menu'

export function shouldSwipeClose(dx: number, dy: number, scrollTop: number, kind: SwipeKind) {
  if (kind === 'drawer') {
    const aside = dx < -56 && Math.abs(dx) > Math.abs(dy) * 0.85
    const down = scrollTop <= 2 && dy > 72 && dy > Math.abs(dx) * 1.25
    return aside || down
  }
  return scrollTop <= 2 && dy > 64 && dy > Math.abs(dx) * 1.25
}
