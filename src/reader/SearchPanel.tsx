import { useState } from 'react'
import type { SearchHit } from '../engine/FoliateHost'

interface Props {
  open: boolean
  regex: boolean
  onRegexChange: (v: boolean) => void
  onSearch: (q: string) => Promise<SearchHit[]>
  onGoTo: (cfi: string) => void
  onClose: () => void
}

export function SearchPanel({ open, regex, onRegexChange, onSearch, onGoTo, onClose }: Props) {
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null
  return (
    <div className="sheet search-sheet" role="dialog" aria-label="Search">
      <header className="sheet-head">
        <h2>Search</h2>
        <button className="icon-btn" onClick={onClose}>
          Done
        </button>
      </header>
      <form
        className="search-form"
        onSubmit={(e) => {
          e.preventDefault()
          setBusy(true)
          setError('')
          onSearch(q)
            .then(setHits)
            .catch((err: Error) => setError(err.message))
            .finally(() => setBusy(false))
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={regex ? 'Regular expression' : 'Find in book'}
          autoFocus
        />
        <label className="check">
          <input type="checkbox" checked={regex} onChange={(e) => onRegexChange(e.target.checked)} />
          Regex
        </label>
        <button className="chip active" type="submit" disabled={busy || !q.trim()}>
          {busy ? '…' : 'Go'}
        </button>
      </form>
      {error && <p className="error">{error}</p>}
      <ul className="list">
        {hits.map((h, i) => (
          <li key={h.cfi + i}>
            <button className="toc-item" onClick={() => onGoTo(h.cfi)}>
              {h.label ? <strong>{h.label} · </strong> : null}
              <span className="quote">
                {h.excerpt.pre}
                <mark>{h.excerpt.match}</mark>
                {h.excerpt.post}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
