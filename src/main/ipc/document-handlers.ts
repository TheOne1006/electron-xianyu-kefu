import { ipcMain } from 'electron'

import {
  listDocuments,
  getDocument,
  getAllDocuments,
  upsertDocument,
  deleteDocument
} from '../stores/document-store'
import { ok } from '../ipc-response'

export function registerDocumentHandlers(): void {
  ipcMain.handle('document:list', () => {
    return ok(listDocuments())
  })

  ipcMain.handle('document:get', (_event, { key }: { key: string }) => {
    return ok(getDocument(key))
  })

  ipcMain.handle('document:all', () => {
    return ok(getAllDocuments())
  })

  ipcMain.handle(
    'document:upsert',
    (_event, { key, content }: { key: string; content: string }) => {
      upsertDocument(key, content)
      return ok(content)
    }
  )

  ipcMain.handle('document:delete', (_event, { key }: { key: string }) => {
    deleteDocument(key)
    return ok(null)
  })
}
