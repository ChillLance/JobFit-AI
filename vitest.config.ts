import path from 'node:path'
import { defineConfig } from 'vitest/config'

// Mirrors the `@/*` -> `./src/*` path alias from tsconfig.json. No extra
// dependency (e.g. vite-tsconfig-paths) — this app only has the one alias.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
