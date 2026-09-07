import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { db } from '../db'
import { isNative } from './platform'
import { blobToBase64, base64ToBlob } from './platform'

const BOOKS_DIR = 'books'

async function ensureBooksDir() {
  try {
    await Filesystem.mkdir({ path: BOOKS_DIR, directory: Directory.Data, recursive: true })
  } catch {
    /* already exists */
  }
}

export async function saveBookFile(id: string, file: File | Blob, name: string): Promise<string> {
  if (isNative()) {
    await ensureBooksDir()
    const path = `${BOOKS_DIR}/${id}.epub`
    const data = await blobToBase64(file)
    await Filesystem.writeFile({
      path,
      data,
      directory: Directory.Data,
    })
    return `fs:${path}`
  }
  await db.files.put({ id, blob: file, name })
  return `idb:${id}`
}

export async function loadBookFile(fileKey: string): Promise<File> {
  if (fileKey.startsWith('fs:')) {
    const path = fileKey.slice(3)
    const result = await Filesystem.readFile({ path, directory: Directory.Data })
    const data = result.data
    const blob =
      typeof data === 'string'
        ? base64ToBlob(data)
        : data instanceof Blob
          ? data
          : new Blob([data])
    return new File([blob], path.split('/').pop() ?? 'book.epub', { type: 'application/epub+zip' })
  }
  if (fileKey.startsWith('idb:')) {
    const id = fileKey.slice(4)
    const rec = await db.files.get(id)
    if (!rec) throw new Error('Book file missing from storage')
    return new File([rec.blob], rec.name, { type: rec.blob.type || 'application/epub+zip' })
  }
  throw new Error(`Unknown file key: ${fileKey}`)
}

export async function deleteBookFile(fileKey: string): Promise<void> {
  if (fileKey.startsWith('fs:')) {
    try {
      await Filesystem.deleteFile({ path: fileKey.slice(3), directory: Directory.Data })
    } catch {
      /* ignore */
    }
    return
  }
  if (fileKey.startsWith('idb:')) {
    await db.files.delete(fileKey.slice(4))
  }
}

export async function writeTextBackup(filename: string, text: string): Promise<void> {
  if (isNative()) {
    await Filesystem.writeFile({
      path: filename,
      data: text,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
    })
    return
  }
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
