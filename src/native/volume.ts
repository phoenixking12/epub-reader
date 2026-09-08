import { registerPlugin } from '@capacitor/core'
import type { PluginListenerHandle } from '@capacitor/core'

export interface VolumeKeysPlugin {
  setEnabled(options: { enabled: boolean }): Promise<void>
  addListener(
    eventName: 'volume',
    listenerFunc: (event: { direction: 'up' | 'down' }) => void,
  ): Promise<PluginListenerHandle>
}

export const VolumeKeys = registerPlugin<VolumeKeysPlugin>('VolumeKeys')
