/// <reference types="vitest" />
import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // 不导入 setup.ts，不 mock electron — E2E 测试需要真实的 BrowserWindow
    setupFiles: [],
    include: ['tests/e2e/specs/**/*.e2e.ts'],
    testTimeout: 30000,
    hookTimeout: 30000
    // E2E 测试通过 vitest fileConcurrency=1 串行运行
  },
  resolve: {
    alias: {
      '@shared': resolve('src/shared')
    }
  }
})
