import { IncomingEpub, type NativeBookItem } from '../native/incoming'
import { isNative } from '../native/platform'
import { importEpubFile, importEpubFromStoredPath, isEpubFilename } from './importBook'

export interface ImportSummary {
  added: number
  skipped: number
}

export async function ingestNativeItems(
  items: NativeBookItem[],
  onProgress?: (done: number, total: number) => void,
): Promise<ImportSummary> {
  let added = 0
  let skipped = 0
  for (let i = 0; i < items.length; i++) {
    onProgress?.(i + 1, items.length)
    const item = items[i]
    const result = await importEpubFromStoredPath(item.id, item.path, item.name)
    if (result.skipped) skipped += 1
    else added += 1
  }
  return { added, skipped }
}

export async function addBooksFromFiles(
  files: FileList | File[],
  onProgress?: (done: number, total: number) => void,
): Promise<ImportSummary> {
  const epubs = Array.from(files).filter(
    (file) => isEpubFilename(file.name) || file.type === 'application/epub+zip',
  )
  let added = 0
  let skipped = 0
  for (let i = 0; i < epubs.length; i++) {
    onProgress?.(i + 1, epubs.length)
    const result = await importEpubFile(epubs[i])
    if (result.skipped) skipped += 1
    else added += 1
  }
  return { added, skipped }
}

export async function pickNativeBooks(
  mode: 'files' | 'folder',
): Promise<{ items: NativeBookItem[]; cancelled: boolean }> {
  if (!isNative()) return { items: [], cancelled: true }
  const result = mode === 'folder' ? await IncomingEpub.importFolder() : await IncomingEpub.importFiles()
  return { items: result.items ?? [], cancelled: Boolean(result.cancelled) }
}

export function formatImportSummary(summary: ImportSummary, emptyFolder: boolean): string {
  if (emptyFolder) return 'No EPUB files in that folder'
  if (!summary.added && !summary.skipped) return 'No EPUB files were added'
  const parts: string[] = []
  if (summary.added) parts.push(`Added ${summary.added} book${summary.added === 1 ? '' : 's'}`)
  if (summary.skipped) parts.push(`skipped ${summary.skipped} already in the library`)
  return parts.join(', ')
}
