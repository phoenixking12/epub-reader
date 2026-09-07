import { registerPlugin } from '@capacitor/core'

export interface NativeBookItem {
  id: string
  name: string
  path: string
}

export interface NativePickResult {
  items: NativeBookItem[]
  cancelled?: boolean
}

export interface IncomingEpubPlugin {
  consume(): Promise<{ found: boolean; name?: string; base64?: string }>
  importFiles(): Promise<NativePickResult>
  importFolder(): Promise<NativePickResult>
  pinShortcut(options: { id: string; title: string }): Promise<void>
}

export const IncomingEpub = registerPlugin<IncomingEpubPlugin>('IncomingEpub')
