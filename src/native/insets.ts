/** Android WindowInsets are device pixels. CSS px is devicePx / devicePixelRatio. */
export function cssPxFromDevicePixels(devicePx: number, devicePixelRatio: number): number {
  const dpr = devicePixelRatio > 0.5 ? devicePixelRatio : 1
  return devicePx / dpr
}
