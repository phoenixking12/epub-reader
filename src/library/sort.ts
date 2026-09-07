import type { BookRecord, LibraryGroup, LibrarySort } from '../types/models'

export function compareBooks(a: BookRecord, b: BookRecord, sort: LibrarySort): number {
  const pinned = Number(b.pinned) - Number(a.pinned)
  if (pinned) return pinned
  switch (sort) {
    case 'title':
      return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
    case 'title-desc':
      return b.title.localeCompare(a.title, undefined, { sensitivity: 'base' })
    case 'added':
      return b.addedAt - a.addedAt
    case 'added-old':
      return a.addedAt - b.addedAt
    case 'opened':
    default:
      return b.lastOpenedAt - a.lastOpenedAt || b.addedAt - a.addedAt
  }
}

export function authorLabel(book: BookRecord): string {
  return book.authors.filter(Boolean).join(', ') || 'Unknown author'
}

export function groupBooks(
  books: BookRecord[],
  sort: LibrarySort,
  group: LibraryGroup,
): Array<{ heading: string | null; books: BookRecord[] }> {
  const sorted = [...books].sort((a, b) => compareBooks(a, b, sort))
  if (group !== 'author') return [{ heading: null, books: sorted }]

  const map = new Map<string, BookRecord[]>()
  for (const book of sorted) {
    const key = authorLabel(book)
    const list = map.get(key)
    if (list) list.push(book)
    else map.set(key, [book])
  }

  return [...map.entries()]
    .sort(([a], [b]) => {
      if (a === 'Unknown author') return 1
      if (b === 'Unknown author') return -1
      return a.localeCompare(b, undefined, { sensitivity: 'base' })
    })
    .map(([heading, list]) => ({
      heading,
      books: list.sort((a, b) => compareBooks(a, b, sort)),
    }))
}
