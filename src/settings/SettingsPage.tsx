import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { exportLibraryBackup, importAnnotationsFromBook, importLibraryBackup, isBackupPayload } from '../backup/backup'
import { db, saveSettings, withSettingsDefaults } from '../db'
import { loadBookFile, writeTextBackup } from '../native/files'
import { shareFile } from '../native/share'
import { rememberCustomColor } from '../settings/colors'
import type { WebSearchEngine } from '../types/models'
import { ColorRow } from '../reader/ColorRow'
import { APP_NAME, APP_VERSION } from '../version'

interface Props {
  onBack: () => void
}

export function SettingsPage({ onBack }: Props) {
  const settingsLive = useLiveQuery(() => db.settings.get('global'))
  const settings = withSettingsDefaults(settingsLive)
  const books = useLiveQuery(() => db.books.toArray()) ?? []
  const [msg, setMsg] = useState('')
  const [fromId, setFromId] = useState('')
  const [toId, setToId] = useState('')
  const [wheelOpen, setWheelOpen] = useState(false)

  if (settingsLive === undefined) return <div className="centered">Loading…</div>

  return (
    <div className="settings">
      <header className="lib-top">
        <button className="icon-btn" onClick={onBack}>
          Back
        </button>
        <h1>Settings</h1>
      </header>

      <section>
        <h2>Offline</h2>
        <p className="muted">
          Reading, highlights, bookmarks, and search in the book work with no internet. Books you add
          are copied into the app, so the original folder can stay on the SD card or be unplugged.
        </p>
        <p className="muted">Word lookup and sending a file to another app need a connection.</p>
      </section>

      <section>
        <h2>Reading</h2>
        <p className="muted">Defaults for every book. You can still change them while reading.</p>
        <label className="check">
          <input
            type="checkbox"
            checked={settings.display.hyphenate}
            onChange={(e) =>
              void saveSettings({ display: { ...settings.display, hyphenate: e.target.checked } })
            }
          />
          Hyphenate long words
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={settings.regexSearch}
            onChange={(e) => void saveSettings({ regexSearch: e.target.checked })}
          />
          Regular-expression search
        </label>
        <p className="field-label">Default highlight color</p>
        <ColorRow
          color={settings.display.defaultAnnotationColor}
          customColors={settings.display.customHighlightColors}
          wheelOpen={wheelOpen}
          onToggleWheel={() => setWheelOpen((v) => !v)}
          onPick={(c) =>
            void saveSettings({ display: { ...settings.display, defaultAnnotationColor: c } })
          }
          onWheelCommit={(c) =>
            void saveSettings({
              display: {
                ...settings.display,
                defaultAnnotationColor: c,
                customHighlightColors: rememberCustomColor(settings.display.customHighlightColors, c),
              },
            })
          }
        />
      </section>

      <section>
        <h2>Look up words</h2>
        <p className="muted">Opens from the selection menu. The book itself stays offline.</p>
        <div className="choice-row">
          {(['wiktionary', 'google', 'duckduckgo'] as const).map((id) => (
            <button
              key={id}
              className={settings.webSearchEngine === id ? 'chip active' : 'chip'}
              onClick={() => void saveSettings({ webSearchEngine: id as WebSearchEngine })}
            >
              {id === 'wiktionary' ? 'Wiktionary' : id === 'google' ? 'Google' : 'DuckDuckGo'}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2>Backup</h2>
        <p className="muted">Saves highlights, notes, and bookmarks. EPUB files stay on this device.</p>
        <div className="action-row">
          <button
            className="chip active"
            onClick={async () => {
              const payload = await exportLibraryBackup()
              await writeTextBackup(`loreguard-backup-${Date.now()}.json`, JSON.stringify(payload))
              setMsg('Backup saved')
            }}
          >
            Export
          </button>
          <label className="chip">
            Import
            <input
              type="file"
              accept="application/json"
              hidden
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                try {
                  const payload = JSON.parse(await file.text())
                  if (!isBackupPayload(payload)) {
                    setMsg('That file is not a valid backup')
                    return
                  }
                  await importLibraryBackup(payload, 'merge')
                  setMsg('Backup imported')
                } catch {
                  setMsg('Could not read that backup file')
                }
              }}
            />
          </label>
        </div>
      </section>

      {books.length > 1 && (
        <section>
          <h2>Copy highlights between books</h2>
          <p className="muted">Use this for a new edition of the same title.</p>
          <label className="field">
            From
            <select value={fromId} onChange={(e) => setFromId(e.target.value)}>
              <option value="">Choose book</option>
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Into
            <select value={toId} onChange={(e) => setToId(e.target.value)}>
              <option value="">Choose book</option>
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                </option>
              ))}
            </select>
          </label>
          <button
            className="chip active"
            disabled={!fromId || !toId || fromId === toId}
            onClick={async () => {
              const n = await importAnnotationsFromBook(fromId, toId)
              setMsg(`Copied ${n} items`)
            }}
          >
            Copy highlights
          </button>
        </section>
      )}

      {books.length > 0 && (
        <section>
          <h2>Share a book file</h2>
          <label className="field">
            Book
            <select
              defaultValue=""
              onChange={async (e) => {
                const id = e.target.value
                e.target.value = ''
                if (!id) return
                const book = books.find((b) => b.id === id)
                if (!book) return
                await shareFile(book.title, await loadBookFile(book.fileKey))
              }}
            >
              <option value="">Choose book</option>
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                </option>
              ))}
            </select>
          </label>
        </section>
      )}

      {msg && <p className="ok">{msg}</p>}

      <p className="muted version-line">
        {APP_NAME} {APP_VERSION}
      </p>
    </div>
  )
}
