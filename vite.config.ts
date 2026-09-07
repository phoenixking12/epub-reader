import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

const csp = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self' blob: data:",
  "media-src 'self' blob: data:",
  "connect-src 'self' blob: https:",
  "frame-src blob:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
].join('; ')

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'html-csp',
      transformIndexHtml: {
        order: 'pre',
        handler(html) {
          if (process.env.NODE_ENV === 'development') return html
          return html.replace(
            '<title>EPUB Reader</title>',
            `<meta http-equiv="Content-Security-Policy" content="${csp}" />\n    <title>EPUB Reader</title>`,
          )
        },
      },
    },
  ],
  resolve: {
    alias: {
      'foliate-js': path.resolve(__dirname, 'vendor/foliate-js'),
    },
  },
  optimizeDeps: {
    exclude: ['foliate-js'],
  },
  preview: {
    headers: {
      'Content-Security-Policy': csp,
    },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
})
