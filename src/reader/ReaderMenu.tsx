interface Props {
  open: boolean
  hasMedia: boolean
  onNotes: () => void
  onText: () => void
  onDisplay: () => void
  onColor: () => void
  onFind: () => void
  onBookmarkPage: () => void
  onAudio: () => void
  onClose: () => void
}

export function ReaderMenu({
  open,
  hasMedia,
  onNotes,
  onText,
  onDisplay,
  onColor,
  onFind,
  onBookmarkPage,
  onAudio,
  onClose,
}: Props) {
  if (!open) return null
  const go = (fn: () => void) => {
    onClose()
    fn()
  }
  return (
    <>
      <button className="menu-scrim" type="button" aria-label="Close menu" onClick={onClose} />
      <div className="reader-menu" role="menu" aria-label="Reading menu">
        <button type="button" role="menuitem" onClick={() => go(onNotes)}>
          Notes
        </button>
        <button type="button" role="menuitem" onClick={() => go(onText)}>
          Text
        </button>
        <button type="button" role="menuitem" onClick={() => go(onDisplay)}>
          Display
        </button>
        <button type="button" role="menuitem" onClick={() => go(onColor)}>
          Color
        </button>
        <button type="button" role="menuitem" onClick={() => go(onFind)}>
          Find in book
        </button>
        <button type="button" role="menuitem" onClick={() => go(onBookmarkPage)}>
          Bookmark this page
        </button>
        {hasMedia && (
          <button type="button" role="menuitem" onClick={() => go(onAudio)}>
            Listen
          </button>
        )}
      </div>
    </>
  )
}
