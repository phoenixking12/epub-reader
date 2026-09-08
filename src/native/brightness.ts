import { ScreenBrightness } from '@capacitor-community/screen-brightness'
import { isNative } from './platform'

const FOLLOW_SYSTEM = -1

export async function followSystemBrightness(): Promise<void> {
  if (!isNative()) return
  try {
    await ScreenBrightness.setBrightness({ brightness: FOLLOW_SYSTEM })
  } catch {
    /* plugin unavailable */
  }
}

export async function applyManualBrightness(value: number): Promise<void> {
  if (!isNative()) return
  try {
    await ScreenBrightness.setBrightness({ brightness: Math.min(1, Math.max(0.05, value)) })
  } catch {
    /* plugin unavailable */
  }
}

export async function restoreNativeBrightness(): Promise<void> {
  await followSystemBrightness()
}
