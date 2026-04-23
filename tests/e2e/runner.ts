/**
 * Electron E2E 测试运行器
 *
 * 在 Electron 主进程中执行测试，使 BrowserWindow 可用。
 * 用法: electron dist/e2e-runner.js
 */
import { app } from 'electron'
import { runTests } from './lib/test-framework'

// 导入测试文件以注册 describe/it 块
import './specs/im-dom-extractor.e2e'
import './specs/im-robot.e2e'

app.whenReady().then(async () => {
  console.log('\n🧪 E2E 测试启动...\n')

  const success = await runTests()

  app.quit()
  process.exit(success ? 0 : 1)
})
