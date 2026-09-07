import { db } from '../db'

export async function loadCustomFonts() {
  const fonts = await db.fonts.toArray()
  for (const font of fonts) {
    const url = URL.createObjectURL(font.blob)
    const style = document.createElement('style')
    style.textContent = `@font-face { font-family: "${font.family}"; src: url("${url}"); font-weight: ${font.weight}; font-style: ${font.style}; }`
    document.head.append(style)
  }
}
