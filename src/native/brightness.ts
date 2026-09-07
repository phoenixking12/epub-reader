import { ScreenBrightness } from '@capacitor-community/screen-brightness'
import { isNative } from './platform'

let original: number | null = null

export async function applyNativeBrightness(value: number): Promise<void> {
  if (!isNative()) return
  try {
    if (original == null) {
      const { brightness } = await ScreenBrightness.getBrightness()
      original = brightness
    }
    await ScreenBrightness.setBrightness({ brightness: Math.min(1, Math.max(0.01, value) ) })
  } catch {
    /* plugin unavailable */
  }
}

export async function restoreNativeBrightness(): Promise<void> {
  if (!isNative() || original == null) return
  try {
    await ScreenBrightness.setBrightness({ brightness: original })
  } catch {
    /* ignore */
  }
}
