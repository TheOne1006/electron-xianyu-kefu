import {
  listDocuments,
  getDocument,
  getAllDocuments,
  upsertDocument,
  deleteDocument
} from '../stores/document-store'
import { ok } from '../ipc-response'
import { safeHandle } from './safe-handle'

export function registerDocumentHandlers(): void {
  safeHandle('document:list', () => {
    return ok(listDocuments())
  })

  safeHandle('document:get', (_event, { key }: { key: string }) => {
    return ok(getDocument(key))
  })

  safeHandle('document:all', () => {
    return ok(getAllDocuments())
  })

  safeHandle('document:upsert', (_event, { key, content }: { key: string; content: string }) => {
    upsertDocument(key, content)
    return ok(content)
  })

  safeHandle('document:delete', (_event, { key }: { key: string }) => {
    deleteDocument(key)
    return ok(null)
  })
}
