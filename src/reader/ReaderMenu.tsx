interface Props {
  open: boolean
  hasMedia: boolean
  onFind: () => void
  onReading: () => void
  onBookmarkPage: () => void
  onAudio: () => void
  onClose: () => void
}

export function ReaderMenu({ open, hasMedia, onFind, onReading, onBookmarkPage, onAudio, onClose }: Props) {
  if (!open) return null
  return (
    <>
      <button className="menu-scrim" type="button" aria-label="Close menu" onClick={onClose} />
      <div className="reader-menu" role="menu" aria-label="Reading menu">
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onClose()
            onFind()
          }}
        >
          Find in book
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onClose()
            onReading()
          }}
        >
          Reading
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onClose()
            onBookmarkPage()
          }}
        >
          Bookmark this page
        </button>
        {hasMedia && (
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onClose()
              onAudio()
            }}
          >
            Listen
          </button>
        )}
      </div>
    </>
  )
}
