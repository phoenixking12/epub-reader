import { Keyboard } from '@capacitor/keyboard'
import { StatusBar } from '@capacitor/status-bar'
import { isNative } from './platform'

function setVar(name: string, px: number) {
  if (!Number.isFinite(px) || px < 0) return
  document.documentElement.style.setProperty(name, `${Math.round(px)}px`)
}

async function syncStatusBar() {
  if (!isNative()) return
  try {
    const info = await StatusBar.getInfo()
    if (info.height > 0) setVar('--lg-sat', info.height)
  } catch {
    /* web or unsupported */
  }
}

function syncKeyboardFromViewport() {
  const vv = window.visualViewport
  if (!vv) return
  const covered = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
  if (covered > 80) setVar('--lg-keyboard', covered)
  else if (!isNative()) setVar('--lg-keyboard', 0)
}

function liftFocusedField() {
  const el = document.activeElement
  if (!(el instanceof HTMLElement)) return
  if (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') return
  window.setTimeout(() => {
    el.scrollIntoView({ block: 'center', inline: 'nearest' })
  }, 60)
}

let started = false

export async function bindSystemInsets(): Promise<void> {
  if (started) {
    await syncStatusBar()
    syncKeyboardFromViewport()
    return
  }
  started = true
  setVar('--lg-keyboard', 0)
  await syncStatusBar()
  syncKeyboardFromViewport()

  const onResize = () => syncKeyboardFromViewport()
  window.visualViewport?.addEventListener('resize', onResize)
  window.visualViewport?.addEventListener('scroll', onResize)
  window.addEventListener('focusin', liftFocusedField)

  if (isNative()) {
    try {
      await Keyboard.addListener('keyboardWillShow', (e) => {
        if (e.keyboardHeight > 0) setVar('--lg-keyboard', e.keyboardHeight)
        liftFocusedField()
      })
      await Keyboard.addListener('keyboardDidShow', (e) => {
        if (e.keyboardHeight > 0) setVar('--lg-keyboard', e.keyboardHeight)
        liftFocusedField()
      })
      await Keyboard.addListener('keyboardWillHide', () => setVar('--lg-keyboard', 0))
      await Keyboard.addListener('keyboardDidHide', () => setVar('--lg-keyboard', 0))
    } catch {
      /* Keyboard plugin unavailable */
    }
  }

  const resume = () => {
    void syncStatusBar()
    syncKeyboardFromViewport()
  }
  document.addEventListener('visibilitychange', resume)
  window.addEventListener('pageshow', resume)
}
