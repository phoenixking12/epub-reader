import Dexie, { type Table } from 'dexie'
import type {
  AnnotationRecord,
  BookRecord,
  BookmarkRecord,
  FileRecord,
  FontRecord,
  SettingsRecord,
} from '../types/models'
import { DEFAULT_SETTINGS } from '../settings/defaults'

export class ReaderDB extends Dexie {
  books!: Table<BookRecord, string>
  bookmarks!: Table<BookmarkRecord, string>
  annotations!: Table<AnnotationRecord, string>
  fonts!: Table<FontRecord, string>
  settings!: Table<SettingsRecord, string>
  files!: Table<FileRecord, string>

  constructor() {
    super('epub-reader')
    this.version(1).stores({
      books: 'id, title, lastOpenedAt, pinned, addedAt, *labels',
      bookmarks: 'id, bookId, order, createdAt',
      annotations: 'id, bookId, cfiRange, createdAt, color',
      fonts: 'id, family',
      settings: 'id',
      files: 'id',
    })
  }
}

export const db = new ReaderDB()

export async function getSettings(): Promise<SettingsRecord> {
  const row = await db.settings.get('global')
  if (row) {
    return {
      ...DEFAULT_SETTINGS,
      ...row,
      display: { ...DEFAULT_SETTINGS.display, ...row.display },
    }
  }
  await db.settings.put(DEFAULT_SETTINGS)
  return DEFAULT_SETTINGS
}

export async function saveSettings(patch: Partial<SettingsRecord>): Promise<SettingsRecord> {
  const current = await getSettings()
  const next: SettingsRecord = {
    ...current,
    ...patch,
    display: { ...current.display, ...(patch.display ?? {}) },
    id: 'global',
  }
  await db.settings.put(next)
  return next
}

export function withSettingsDefaults(row?: SettingsRecord | null): SettingsRecord {
  if (!row) return DEFAULT_SETTINGS
  return {
    ...DEFAULT_SETTINGS,
    ...row,
    display: { ...DEFAULT_SETTINGS.display, ...row.display },
  }
}
