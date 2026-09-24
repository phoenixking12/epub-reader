import { useState } from 'react'
import { installLatestRelease } from '../native/appUpdate'
import { APP_VERSION } from '../version'

interface Props {
  className?: string
  label?: string
  onMessage?: (message: string, kind: 'ok' | 'err') => void
}

export function UpdateAppButton({ className = 'chip active', label = 'Update app', onMessage }: Props) {
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<{ text: string; kind: 'ok' | 'err' } | null>(null)

  const report = (message: string, kind: 'ok' | 'err') => {
    if (onMessage) onMessage(message, kind)
    else setNote({ text: message, kind })
  }

  return (
    <>
      <button
        type="button"
        className={className}
        disabled={busy}
        onClick={(e) => {
          e.stopPropagation()
          setBusy(true)
          if (!onMessage) setNote(null)
          void installLatestRelease(APP_VERSION)
            .then((result) => {
              report(
                result === 'current' ? 'You already have the latest version.' : 'Opening the installer…',
                'ok',
              )
            })
            .catch((err: unknown) => {
              report(err instanceof Error ? err.message : 'Update failed', 'err')
            })
            .finally(() => setBusy(false))
        }}
      >
        {busy ? 'Updating…' : label}
      </button>
      {!onMessage && note ? <p className={note.kind === 'ok' ? 'ok' : 'error'}>{note.text}</p> : null}
    </>
  )
}
