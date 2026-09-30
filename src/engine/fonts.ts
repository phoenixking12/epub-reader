import { db } from '../db'
import { usesPublisherFont } from '../settings/defaults'

const readingFontLoaders: Record<string, () => Promise<unknown>> = {
  '"Source Serif 4", Georgia, serif': () =>
    Promise.all([
      import('@fontsource/source-serif-4/400.css'),
      import('@fontsource/source-serif-4/600.css'),
      import('@fontsource/source-serif-4/700.css'),
    ]),
  'Literata, Georgia, serif': () =>
    Promise.all([import('@fontsource/literata/400.css'), import('@fontsource/literata/700.css')]),
  'Newsreader, Georgia, serif': () =>
    Promise.all([import('@fontsource/newsreader/400.css'), import('@fontsource/newsreader/700.css')]),
  '"Source Sans 3", system-ui, sans-serif': () =>
    Promise.all([
      import('@fontsource/source-sans-3/400.css'),
      import('@fontsource/source-sans-3/600.css'),
      import('@fontsource/source-sans-3/700.css'),
    ]),
  '"IBM Plex Sans", system-ui, sans-serif': () =>
    Promise.all([import('@fontsource/ibm-plex-sans/400.css'), import('@fontsource/ibm-plex-sans/700.css')]),
  '"JetBrains Mono", ui-monospace, monospace': () =>
    Promise.all([import('@fontsource/jetbrains-mono/400.css'), import('@fontsource/jetbrains-mono/700.css')]),
}

const loadedReadingFonts = new Set<string>()

/** Load a bundled reading face only after it is chosen. Book default loads none of them. */
export async function ensureReadingFont(family?: string | null) {
  if (!family || usesPublisherFont(family)) return
  const load = readingFontLoaders[family]
  if (!load || loadedReadingFonts.has(family)) return
  loadedReadingFonts.add(family)
  await load()
}

export async function loadCustomFonts() {
  const fonts = await db.fonts.toArray()
  for (const font of fonts) {
    const url = URL.createObjectURL(font.blob)
    const style = document.createElement('style')
    style.textContent = `@font-face { font-family: "${font.family}"; src: url("${url}"); font-weight: ${font.weight}; font-style: ${font.style}; }`
    document.head.append(style)
  }
}
