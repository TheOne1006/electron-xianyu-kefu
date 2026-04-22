import type { IpcResult } from '../shared/types'

export function ok<T>(data: T, message = ''): IpcResult<T> {
  return { code: 0, message, data }
}

export function err(code: number, message: string): IpcResult<null> {
  return { code, message, data: null }
}
