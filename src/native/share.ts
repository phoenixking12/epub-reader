import { Browser } from '@capacitor/browser'
import { Share } from '@capacitor/share'
import { isNative } from './platform'
import type { WebSearchEngine } from '../types/models'

const SEARCH_URLS: Record<WebSearchEngine, (q: string) => string> = {
  wiktionary: (q) => `https://en.wiktionary.org/wiki/${encodeURIComponent(q)}`,
  google: (q) => `https://www.google.com/search?q=${encodeURIComponent(q + ' meaning')}`,
  duckduckgo: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q + ' meaning')}`,
}

export async function openWebSearch(query: string, engine: WebSearchEngine): Promise<void> {
  const url = SEARCH_URLS[engine](query.trim())
  if (isNative()) {
    await Browser.open({ url })
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}

export async function shareText(title: string, text: string): Promise<void> {
  if (isNative()) {
    await Share.share({ title, text })
    return
  }
  if (navigator.share) {
    await navigator.share({ title, text })
    return
  }
  await navigator.clipboard.writeText(text)
}

export async function shareFile(title: string, file: File): Promise<void> {
  if (isNative()) {
    try {
      await Share.share({ title, text: title })
    } catch {
      /* user cancelled */
    }
    return
  }
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ title, files: [file] })
    return
  }
  await shareText(title, title)
}

export { SEARCH_URLS }
