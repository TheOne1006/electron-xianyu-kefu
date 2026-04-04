/// <reference types="vitest" />
import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

/**
 * 注入脚本测试的 vitest 配置
 *
 * 仅用于运行 src/injected/ 下的测试文件。
 * 主配置 vitest.config.ts 的 include 只覆盖 src/main/。
 *
 * 使用方式：pnpm exec vitest run --config vitest.injected.config.ts
 */
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/injected/**/*.test.ts'],
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
