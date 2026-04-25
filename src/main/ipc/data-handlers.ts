import { consola } from 'consola'
import { app, dialog, shell } from 'electron'
import { join } from 'path'
import { mkdir, writeFile, readFile } from 'fs/promises'
import { getAppConfig, replaceAppConfig } from '../stores/app-config-store'
import { getAllAgentConfigs, replaceAll as replaceAgentConfigs } from '../stores/agent-config-store'
import { getAllDocuments, replaceAll as replaceDocuments } from '../stores/document-store'
import { getAllAsRecord, replaceAll as replaceProducts } from '../stores/product-store'
import { ok, err } from '../ipc-response'
import { safeHandle } from './safe-handle'
import type { ExportData } from '../../shared/types'

const logger = consola.withTag('ipc:data')

/** 提取主版本号（如 "0.5.6" → "0.5"） */
function getMajorVersion(version: string): string {
  const parts = version.split('.')
  return parts.length >= 2 ? `${parts[0]}.${parts[1]}` : version
}

export function registerDataHandlers(): void {
  // ─── 导出 ──────────────────────────────────────────────
  safeHandle('data:export', async () => {
    const version = app.getVersion()
    const date = new Date().toISOString().slice(0, 10)
    const defaultFilename = `xianyu-kefu-backup-${version}-${date}.json`

    const result = await dialog.showSaveDialog({
      title: '导出数据',
      defaultPath: defaultFilename,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })

    if (result.canceled || !result.filePath) {
      return err(1, '用户取消导出')
    }

    const exportData: ExportData = {
      version,
      exportedAt: new Date().toISOString(),
      appConfig: getAppConfig(),
      agentConfig: getAllAgentConfigs(),
      documents: getAllDocuments(),
      products: getAllAsRecord()
    }

    await writeFile(result.filePath, JSON.stringify(exportData, null, 2), 'utf-8')
    logger.info(`数据已导出到: ${result.filePath}`)
    return ok(result.filePath)
  })

  // ─── 导入 ──────────────────────────────────────────────
  safeHandle('data:import', async () => {
    const result = await dialog.showOpenDialog({
      title: '导入数据',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return err(1, '用户取消导入')
    }

    const filePath = result.filePaths[0]
    let raw: string
    try {
      raw = await readFile(filePath, 'utf-8')
    } catch {
      return err(2, '文件读取失败')
    }

    let data: ExportData
    try {
      data = JSON.parse(raw) as ExportData
    } catch {
      return err(3, 'JSON 格式无效')
    }

    // 版本校验：主版本号必须匹配
    const currentVersion = app.getVersion()
    const currentMajor = getMajorVersion(currentVersion)
    const importMajor = getMajorVersion(data.version)
    if (currentMajor !== importMajor) {
      return err(
        4,
        `版本不匹配：当前版本 ${currentVersion}，导入文件版本 ${data.version}。主版本号需一致（${currentMajor}）`
      )
    }

    // 自动备份当前数据
    try {
      const backupDir = join(app.getPath('userData'), 'backups')
      await mkdir(backupDir, { recursive: true })
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupPath = join(backupDir, `backup-${timestamp}.json`)
      const backupData: ExportData = {
        version: currentVersion,
        exportedAt: new Date().toISOString(),
        appConfig: getAppConfig(),
        agentConfig: getAllAgentConfigs(),
        documents: getAllDocuments(),
        products: getAllAsRecord()
      }
      await writeFile(backupPath, JSON.stringify(backupData, null, 2), 'utf-8')
      logger.info(`已自动备份到: ${backupPath}`)
    } catch (backupError) {
      logger.error('自动备份失败:', backupError)
      return err(5, '自动备份失败，导入中止')
    }

    // 执行导入（全量覆盖）
    try {
      replaceAppConfig(data.appConfig)
      replaceAgentConfigs(data.agentConfig)
      replaceDocuments(data.documents)
      replaceProducts(data.products)
      logger.info(`数据已导入，来源: ${filePath}`)
      return ok(null)
    } catch (importError) {
      logger.error('导入失败:', importError)
      return err(
        6,
        `导入失败: ${importError instanceof Error ? importError.message : String(importError)}`
      )
    }
  })

  // ─── 打开数据目录 ──────────────────────────────────────
  safeHandle('data:openDir', async () => {
    const dirPath = app.getPath('userData')
    await shell.openPath(dirPath)
    return ok(null)
  })
}
