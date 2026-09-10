import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { cssPxFromDevicePixels } from './native/insets'
import '@fontsource/source-serif-4/400.css'
import '@fontsource/source-serif-4/600.css'
import '@fontsource/source-serif-4/700.css'
import '@fontsource/literata/400.css'
import '@fontsource/literata/700.css'
import '@fontsource/newsreader/400.css'
import '@fontsource/newsreader/700.css'
import '@fontsource/source-sans-3/400.css'
import '@fontsource/source-sans-3/600.css'
import '@fontsource/source-sans-3/700.css'
import '@fontsource/ibm-plex-sans/400.css'
import '@fontsource/ibm-plex-sans/700.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/700.css'
import './index.css'

function syncSystemInsets() {
  const root = document.documentElement
  const sat = root.getAttribute('data-lg-sat-px')
  const sab = root.getAttribute('data-lg-sab-px')
  const dpr = window.devicePixelRatio
  if (sat != null && sat !== '') {
    root.style.setProperty('--lg-sat', `${cssPxFromDevicePixels(Number(sat), dpr)}px`)
  }
  if (sab != null && sab !== '') {
    root.style.setProperty('--lg-sab', `${cssPxFromDevicePixels(Number(sab), dpr)}px`)
  }
}

syncSystemInsets()
window.addEventListener('resize', syncSystemInsets)
new MutationObserver(syncSystemInsets).observe(document.documentElement, {
  attributes: true,
  attributeFilter: ['data-lg-sat-px', 'data-lg-sab-px'],
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
