/// <reference types="vitest" />
import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['src/main/__tests__/setup.ts'],
    include: ['src/main/**/*.test.ts', 'src/injected/**/*.test.ts'],
    coverage: {
      exclude: ['**/__tests__/**']
    }
  },
  resolve: {
    alias: {
      '@shared': resolve('src/shared')
    }
  }
})
