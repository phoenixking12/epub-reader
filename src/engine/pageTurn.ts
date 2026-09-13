/** Horizontal page/chapter turn. Ignores flicks that were mostly vertical (fast scroll). */
export function shouldHorizontalTurn(
  dx: number,
  dy: number,
  opts: { scrolled?: boolean; farthestDy?: number } = {},
) {
  const adx = Math.abs(dx)
  const ady = Math.abs(dy)
  const farthest = Math.max(ady, opts.farthestDy ?? ady)
  if (opts.scrolled) {
    return adx >= 88 && adx > ady * 2.6 && farthest < 48
  }
  return adx >= 72 && adx > ady * 1.85 && farthest < 64
}

export function turnDirection(dx: number): 'next' | 'prev' {
  return dx < 0 ? 'next' : 'prev'
}
