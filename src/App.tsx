import { useCallback, useEffect, useState } from 'react'
import { db, getSettings, saveSettings } from './db'
import { LibraryPage } from './library/LibraryPage'
import { listenForBookOpen } from './native/shell'
import { initNativeShell } from './native/shell'
import { ReaderPage } from './reader/ReaderPage'
import { SettingsPage } from './settings/SettingsPage'
import { importEpubFile } from './library/importBook'
import { loadCustomFonts } from './engine/fonts'
import { IncomingEpub } from './native/incoming'
import { isNative } from './native/platform'
import { base64ToBlob } from './native/platform'
import { App as CapApp } from '@capacitor/app'

type Screen = 'library' | 'reader' | 'settings'

export function App() {
  const [screen, setScreen] = useState<Screen>('library')
  const [bookId, setBookId] = useState<string | null>(null)

  const openBook = useCallback(async (id: string) => {
    setBookId(id)
    setScreen('reader')
    await saveSettings({ lastBookId: id })
    await db.books.update(id, { lastOpenedAt: Date.now() })
  }, [])

  useEffect(() => {
    void initNativeShell()
    void loadCustomFonts()
    void (async () => {
      const settings = await getSettings()
      if (settings.lastBookId) {
        const book = await db.books.get(settings.lastBookId)
        if (book) {
          setBookId(book.id)
          setScreen('reader')
        }
      }
    })()
    const ingestIncoming = async () => {
      if (!isNative()) return
      try {
        const result = await IncomingEpub.consume()
        if (!result.found || !result.base64) return
        const file = new File([base64ToBlob(result.base64)], result.name || 'book.epub', {
          type: 'application/epub+zip',
        })
        const { book } = await importEpubFile(file)
        await openBook(book.id)
      } catch {
        /* web or empty intent */
      }
    }
    void ingestIncoming()
    const resume = CapApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) void ingestIncoming()
    })
    const stop = listenForBookOpen(
      (id) => void openBook(id),
      () => undefined,
    )
    const onDrop = async (e: DragEvent) => {
      e.preventDefault()
      const files = e.dataTransfer?.files
      if (!files?.length) return
      for (const file of Array.from(files)) {
        if (file.name.toLowerCase().endsWith('.epub')) await importEpubFile(file)
      }
    }
    const prevent = (e: DragEvent) => e.preventDefault()
    window.addEventListener('drop', onDrop)
    window.addEventListener('dragover', prevent)
    return () => {
      stop()
      void resume.then((h) => h.remove())
      window.removeEventListener('drop', onDrop)
      window.removeEventListener('dragover', prevent)
    }
  }, [openBook])

  if (screen === 'settings') return <SettingsPage onBack={() => setScreen('library')} />
  if (screen === 'reader' && bookId)
    return (
      <ReaderPage
        bookId={bookId}
        onBack={() => {
          setScreen('library')
          void saveSettings({ lastBookId: bookId })
        }}
      />
    )
  return <LibraryPage onOpen={(id) => void openBook(id)} onSettings={() => setScreen('settings')} />
}

export default App
