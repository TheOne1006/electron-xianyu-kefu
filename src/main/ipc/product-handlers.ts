import { ipcMain } from 'electron'
import { consola } from 'consola'

import {
  list as listProducts,
  getById as getProduct,
  createOrUpdate as createOrUpdateProduct,
  deleteById as deleteProduct
} from '../stores/product-store'
import type { Product } from '../../shared/types'
import { err, ok } from '../ipc-response'

const logger = consola.withTag('ipc:product')

export function registerProductHandlers(): void {
  ipcMain.handle('product:list', () => {
    return ok(listProducts())
  })

  ipcMain.handle('product:getById', (_event, { id }: { id: string }) => {
    return ok(getProduct(id))
  })

  ipcMain.handle('product:upsert', (_event, product: Product) => {
    try {
      createOrUpdateProduct(product)
      logger.info(`[IPC] 产品已保存: ${product.title} (ID: ${product.id})`)
      return ok(product)
    } catch (error) {
      logger.warn(`[IPC] 产品保存失败: ${error}, ID: ${product.id}`)
      return err(3, '产品保存失败')
    }
  })

  ipcMain.handle('product:deleteById', (_event, { id }: { id: string }) => {
    deleteProduct(id)
    return ok(null)
  })
}
