export function normalizeTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Pair a text book with the audiobook of the same work, when one is on the shelf. */
export function matchAudiobook<T extends { title: string }>(title: string, audiobooks: T[]): T | null {
  const key = normalizeTitle(title)
  if (!key) return null
  const exact = audiobooks.find((book) => normalizeTitle(book.title) === key)
  if (exact) return exact
  return (
    audiobooks.find((book) => {
      const other = normalizeTitle(book.title)
      return other.length > 3 && (other.includes(key) || key.includes(other))
    }) ?? null
  )
}
