import { useRef } from 'react'
import type { TouchEvent } from 'react'
import { shouldSwipeClose, type SwipeKind } from './swipeClose'

export function useSwipeClose(onClose: () => void, kind: SwipeKind = 'sheet') {
  const node = useRef<HTMLElement | null>(null)
  const start = useRef<{ x: number; y: number; top: number } | null>(null)

  const ref = (el: HTMLElement | null) => {
    node.current = el
  }

  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1) return
    start.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      top: node.current?.scrollTop ?? 0,
    }
  }

  const onTouchEnd = (e: TouchEvent) => {
    const origin = start.current
    start.current = null
    if (!origin || e.changedTouches.length !== 1) return
    const dx = e.changedTouches[0].clientX - origin.x
    const dy = e.changedTouches[0].clientY - origin.y
    if (shouldSwipeClose(dx, dy, origin.top, kind)) onClose()
  }

  return { ref, onTouchStart, onTouchEnd }
}
