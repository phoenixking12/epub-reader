import { makeBook } from 'foliate-js/view.js'
import { db } from '../db'
import { emptyBook, newId } from '../settings/defaults'
import { deleteBookFile, loadBookFile, saveBookFile } from '../native/files'
import { formatAuthors, formatLanguageMap, formatTitle } from '../engine/metadata'
import type { BookRecord } from '../types/models'

export async function readEpubMetadata(file: File | Blob) {
  const book = await makeBook(file)
  try {
    const cover = (await book.getCover?.()) ?? null
    return {
      title: formatTitle(book.metadata?.title),
      authors: formatAuthors(book.metadata?.author),
      description: formatLanguageMap(book.metadata?.description),
      language: formatLanguageMap(book.metadata?.language),
      identifier: formatLanguageMap(book.metadata?.identifier),
      publisher: formatLanguageMap(book.metadata?.publisher),
      dir: (book.dir === 'rtl' ? 'rtl' : 'ltr') as 'rtl' | 'ltr',
      cover,
      toc: book.toc ?? [],
    }
  } finally {
    book.destroy?.()
  }
}

export function isEpubFilename(name: string): boolean {
  return name.toLowerCase().endsWith('.epub')
}

export async function findDuplicateBook(identifier: string, _title: string): Promise<BookRecord | undefined> {
  if (!identifier && !_title) return undefined
  const books = await db.books.toArray()
  if (identifier) {
    const hit = books.find((b) => b.identifier && b.identifier === identifier)
    if (hit) return hit
  }
  return undefined
}

export async function importEpubFromStoredPath(id: string, path: string, name: string): Promise<{ book: BookRecord; skipped: boolean }> {
  const file = await loadBookFile(`fs:${path}`)
  const meta = await readEpubMetadata(file)
  const existing = await findDuplicateBook(meta.identifier, meta.title)
  if (existing) {
    await deleteBookFile(`fs:${path}`)
    return { book: existing, skipped: true }
  }
  const record = emptyBook({
    id,
    fileKey: `fs:${path}`,
    title: meta.title || name.replace(/\.epub$/i, ''),
    authors: meta.authors,
    description: meta.description,
    language: meta.language,
    identifier: meta.identifier,
    publisher: meta.publisher,
    cover: meta.cover,
    sourceKind: 'copy',
    sourcePath: name,
    dir: meta.dir,
  })
  await db.books.put(record)
  return { book: record, skipped: false }
}

export async function importEpubFile(
  file: File,
  kind: 'copy' | 'shortcut' = 'copy',
): Promise<{ book: BookRecord; skipped: boolean }> {
  const meta = await readEpubMetadata(file)
  const existing = await findDuplicateBook(meta.identifier, meta.title)
  if (existing) return { book: existing, skipped: true }
  const id = newId()
  const fileKey = kind === 'copy' ? await saveBookFile(id, file, file.name) : `shortcut:${file.name}`
  const record = emptyBook({
    id,
    fileKey,
    title: meta.title,
    authors: meta.authors,
    description: meta.description,
    language: meta.language,
    identifier: meta.identifier,
    publisher: meta.publisher,
    cover: meta.cover,
    sourceKind: kind,
    sourcePath: kind === 'shortcut' ? file.name : undefined,
    dir: meta.dir,
  })
  if (kind === 'shortcut') {
    await db.files.put({ id, blob: file, name: file.name })
    record.fileKey = `idb:${id}`
    record.sourceKind = 'shortcut'
  }
  await db.books.put(record)
  return { book: record, skipped: false }
}

export async function openBookBlob(book: BookRecord): Promise<File> {
  return loadBookFile(book.fileKey)
}

export async function removeBook(bookId: string): Promise<void> {
  const book = await db.books.get(bookId)
  if (!book) return
  await deleteBookFile(book.fileKey)
  await db.bookmarks.where('bookId').equals(bookId).delete()
  await db.annotations.where('bookId').equals(bookId).delete()
  await db.books.delete(bookId)
}
