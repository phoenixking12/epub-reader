import { describe, expect, it } from 'vitest'
import { compareBooks, groupBooks } from './sort'
import { emptyBook } from '../settings/defaults'

function book(partial: Parameters<typeof emptyBook>[0]) {
  return emptyBook(partial)
}

describe('library sort', () => {
  it('sorts titles A-Z after pinned books', () => {
    const a = book({ id: '1', fileKey: 'a', title: 'Zebra', pinned: false, addedAt: 1 })
    const b = book({ id: '2', fileKey: 'b', title: 'Apple', pinned: true, addedAt: 2 })
    const c = book({ id: '3', fileKey: 'c', title: 'Mango', pinned: false, addedAt: 3 })
    const list = [a, c, b].sort((x, y) => compareBooks(x, y, 'title'))
    expect(list.map((x) => x.title)).toEqual(['Apple', 'Mango', 'Zebra'])
  })

  it('groups by author', () => {
    const a = book({ id: '1', fileKey: 'a', title: 'B', authors: ['Ada'] })
    const b = book({ id: '2', fileKey: 'b', title: 'A', authors: ['Ada'] })
    const c = book({ id: '3', fileKey: 'c', title: 'C', authors: [] })
    const groups = groupBooks([a, b, c], 'title', 'author')
    expect(groups.map((g) => g.heading)).toEqual(['Ada', 'Unknown author'])
    expect(groups[0].books.map((x) => x.title)).toEqual(['A', 'B'])
  })
})
