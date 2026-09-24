import { useSwipeClose } from '../ui/useSwipeClose'

interface Props {
  open: boolean
  onNotes: () => void
  onText: () => void
  onDisplay: () => void
  onFind: () => void
  onListen: () => void
  onClose: () => void
}

export function ReaderMenu({
  open,
  onNotes,
  onText,
  onDisplay,
  onFind,
  onListen,
  onClose,
}: Props) {
  const swipe = useSwipeClose(onClose, 'menu')
  if (!open) return null
  const go = (fn: () => void) => {
    onClose()
    fn()
  }
  return (
    <>
      <button className="menu-scrim" type="button" aria-label="Close menu" onClick={onClose} />
      <div
        ref={swipe.ref}
        className="reader-menu"
        role="menu"
        aria-label="Reading menu"
        onTouchStart={swipe.onTouchStart}
        onTouchEnd={swipe.onTouchEnd}
      >
        <button type="button" role="menuitem" onClick={() => go(onNotes)}>
          Notes
        </button>
        <button type="button" role="menuitem" onClick={() => go(onText)}>
          Text
        </button>
        <button type="button" role="menuitem" onClick={() => go(onDisplay)}>
          Display
        </button>
        <button type="button" role="menuitem" onClick={() => go(onFind)}>
          Find in book
        </button>
        <button type="button" role="menuitem" onClick={() => go(onListen)}>
          Read and listen
        </button>
      </div>
    </>
  )
}
