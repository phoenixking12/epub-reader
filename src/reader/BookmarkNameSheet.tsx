interface Props {
  open: boolean
  title: string
  quote: string
  existing: boolean
  onTitle: (value: string) => void
  onSave: () => void
  onRemove?: () => void
  onClose: () => void
}

export function BookmarkNameSheet({ open, title, quote, existing, onTitle, onSave, onRemove, onClose }: Props) {
  if (!open) return null
  return (
    <div className="sheet note-sheet" role="dialog" aria-label="Bookmark name">
      <header className="sheet-head">
        <h2>{existing ? 'Bookmark' : 'Name bookmark'}</h2>
        <button className="icon-btn" type="button" onClick={onClose}>
          Cancel
        </button>
        <button className="icon-btn" type="button" onClick={onSave}>
          Save
        </button>
      </header>
      {quote ? <p className="selection-quote">{quote}</p> : null}
      <label className="field">
        Name
        <input
          type="text"
          value={title}
          onChange={(e) => onTitle(e.target.value)}
          autoFocus
          placeholder="Chapter, scene, or a short label"
        />
      </label>
      {existing && onRemove ? (
        <button className="text-btn danger" type="button" onClick={onRemove}>
          Remove bookmark
        </button>
      ) : null}
    </div>
  )
}
