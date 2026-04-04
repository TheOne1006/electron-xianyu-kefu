import { vi } from 'vitest'

// ============================================================
// 共享 electron-store mock
// 此文件直接在内部调用 vi.mock，确保在模块首次加载时就完成 mock 注册
// ============================================================

// Mock 数据存储 - 使用 vi.hoisted 确保在 vi.mock 工厂函数中可访问
const mockStoreData = vi.hoisted(() => {
  const data: Record<string, unknown> = {}
  return {
    setData(newData: Record<string, unknown>): void {
      Object.keys(data).forEach((k) => delete data[k])
      Object.assign(data, newData)
    },
    get(key?: string): unknown {
      if (!key) return data
      return data[key]
    },
    set(keyOrObject: string | Record<string, unknown>, value?: unknown): void {
      if (typeof keyOrObject === 'string') {
        data[keyOrObject] = value
      } else if (typeof keyOrObject === 'object') {
        Object.assign(data, keyOrObject)
      }
    },
    remove(key: string): boolean {
      if (data[key] !== undefined) {
        delete data[key]
        return true
      }
      return false
    },
    clear(): void {
      Object.keys(data).forEach((k) => delete data[k])
    },
    getData(): Record<string, unknown> {
      return data
    }
  }
})

// Mock electron-store 类
class MockElectronStore {
  get(key?: string): unknown {
    return mockStoreData.get(key)
  }
  set(keyOrObject: string | Record<string, unknown>, value?: unknown): void {
    mockStoreData.set(keyOrObject, value)
  }
  delete(key?: string): boolean {
    return mockStoreData.remove(key as string)
  }
  get store(): Record<string, unknown> {
    return mockStoreData.get() as Record<string, unknown>
  }
  get size(): number {
    return Object.keys(mockStoreData.get() as Record<string, unknown>).length
  }
}

// 直接在模块内注册 mock（不要导出 mockStoreData！）
vi.mock('electron-store', () => ({
  __esModule: true,
  default: MockElectronStore
}))

// 导出 mockStoreData 的访问方法（不是导出变量本身）
export const resetMockStoreData = (): void => {
  mockStoreData.clear()
}

export const setMockStoreData = (data: Record<string, unknown>): void => {
  // 处理 products 数组：将每个产品存储在其 ID 键下
  if (Array.isArray(data.products)) {
    const { products, ...rest } = data
    const individualProducts: Record<string, unknown> = {}
    for (const p of products) {
      if (p && typeof p === 'object' && 'id' in p) {
        individualProducts[p.id as string] = p
      }
    }
    mockStoreData.setData({ ...rest, ...individualProducts })
  } else {
    mockStoreData.setData(data)
  }
}
