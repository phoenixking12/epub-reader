/** Horizontal chapter turn while scrolling. Paginated swipe is handled by the paginator. */
export function shouldHorizontalTurn(
  dx: number,
  dy: number,
  opts: { scrolled?: boolean; farthestDy?: number } = {},
) {
  const adx = Math.abs(dx)
  const ady = Math.abs(dy)
  const farthest = Math.max(ady, opts.farthestDy ?? ady)
  if (opts.scrolled) {
    return adx >= 80 && adx > ady * 2.2 && farthest < 56
  }
  return adx >= 56 && adx > ady * 1.4 && farthest < 96
}

export function turnDirection(dx: number): 'next' | 'prev' {
  return dx < 0 ? 'next' : 'prev'
}
