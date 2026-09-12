import { App } from '@capacitor/app'
import { StatusBar, Style } from '@capacitor/status-bar'
import { bindSystemInsets } from './insets'
import { isNative } from './platform'

export async function initNativeShell(): Promise<void> {
  if (isNative()) {
    try {
      await StatusBar.setOverlaysWebView({ overlay: true })
      await StatusBar.setBackgroundColor({ color: '#00000000' })
      await StatusBar.setStyle({ style: Style.Dark })
    } catch {
      /* ignore */
    }
  }
  await bindSystemInsets()
}

export function listenForBookOpen(onOpen: (bookId: string) => void, onFileUrl?: (url: string) => void) {
  if (!isNative()) return () => undefined
  const handle = App.addListener('appUrlOpen', ({ url }) => {
    const bookMatch = url.match(/epubreader:\/\/book\/([^/?#]+)/)
    if (bookMatch?.[1]) {
      onOpen(decodeURIComponent(bookMatch[1]))
      return
    }
    if (url.startsWith('file:') || url.startsWith('content:') || url.endsWith('.epub')) {
      onFileUrl?.(url)
    }
  })
  return () => {
    void handle.then((h) => h.remove())
  }
}

export async function minimizeApp(): Promise<void> {
  if (!isNative()) return
  try {
    await App.minimizeApp()
  } catch {
    /* ignore */
  }
}
