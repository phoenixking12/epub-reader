import { db } from '../db'
import { DEFAULT_DISPLAY } from '../settings/defaults'
import type { AnnotationRecord, BookmarkRecord, BookRecord, DisplaySettings } from '../types/models'

export interface BackupPayload {
  version: 1
  exportedAt: number
  books: Array<Omit<BookRecord, 'cover'> & { coverBase64?: string }>
  bookmarks: BookmarkRecord[]
  annotations: AnnotationRecord[]
  display: DisplaySettings
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(',')
  const mime = /data:(.*?);/.exec(head)?.[1] ?? 'image/jpeg'
  const binary = atob(body)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

export async function exportLibraryBackup(): Promise<BackupPayload> {
  const books = await db.books.toArray()
  const bookmarks = await db.bookmarks.toArray()
  const annotations = await db.annotations.toArray()
  const settings = await db.settings.get('global')
  const slimBooks = await Promise.all(
    books.map(async (book) => {
      const { cover, ...rest } = book
      return {
        ...rest,
        coverBase64: cover ? await blobToDataUrl(cover) : undefined,
      }
    }),
  )
  return {
    version: 1,
    exportedAt: Date.now(),
    books: slimBooks,
    bookmarks,
    annotations,
    display: settings?.display ?? DEFAULT_DISPLAY,
  }
}

export function isBackupPayload(value: unknown): value is BackupPayload {
  if (!value || typeof value !== 'object') return false
  const v = value as BackupPayload
  return v.version === 1 && Array.isArray(v.books) && Array.isArray(v.bookmarks) && Array.isArray(v.annotations)
}

export async function importLibraryBackup(payload: BackupPayload, mode: 'merge' | 'replace' = 'merge') {
  if (!isBackupPayload(payload)) throw new Error('Unsupported backup version')
  if (mode === 'replace') {
    await db.books.clear()
    await db.bookmarks.clear()
    await db.annotations.clear()
  }
  for (const book of payload.books) {
    const { coverBase64, ...rest } = book
    await db.books.put({
      ...rest,
      cover: coverBase64 ? dataUrlToBlob(coverBase64) : null,
    })
  }
  if (payload.bookmarks?.length) await db.bookmarks.bulkPut(payload.bookmarks)
  if (payload.annotations?.length) await db.annotations.bulkPut(payload.annotations)
}

export async function importAnnotationsFromBook(fromId: string, toId: string): Promise<number> {
  const source = await db.annotations.where('bookId').equals(fromId).toArray()
  const existing = await db.annotations.where('bookId').equals(toId).toArray()
  const existingCfis = new Set(existing.map((a) => a.cfiRange))
  let count = 0
  for (const ann of source) {
    if (existingCfis.has(ann.cfiRange)) continue
    await db.annotations.add({
      ...ann,
      id: crypto.randomUUID(),
      bookId: toId,
    })
    count++
  }
  const marks = await db.bookmarks.where('bookId').equals(fromId).toArray()
  const existingMarks = await db.bookmarks.where('bookId').equals(toId).toArray()
  const existingMarkCfis = new Set(existingMarks.map((m) => m.cfi))
  for (const mark of marks) {
    if (existingMarkCfis.has(mark.cfi)) continue
    await db.bookmarks.add({ ...mark, id: crypto.randomUUID(), bookId: toId })
    count++
  }
  return count
}
