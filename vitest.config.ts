import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      'foliate-js': path.resolve(__dirname, 'vendor/foliate-js'),
    },
  },
})
