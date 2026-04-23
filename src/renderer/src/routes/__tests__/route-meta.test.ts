import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const routeMetaFilePath = resolve(process.cwd(), 'src/renderer/src/routes/route-meta.json')

describe('route meta JSON', () => {
  it('存在单一来源 route meta 文件', () => {
    expect(existsSync(routeMetaFilePath)).toBe(true)
  })

  it('包含导航与标题所需字段', () => {
    if (!existsSync(routeMetaFilePath)) {
      throw new Error('route meta 文件不存在')
    }

    const routeMetaList = JSON.parse(readFileSync(routeMetaFilePath, 'utf-8')) as Array<
      Record<string, unknown>
    >

    expect(routeMetaList.length).toBeGreaterThan(0)
    expect(routeMetaList).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: '/',
          title: '设置',
          iconKey: expect.any(String),
          navVisible: expect.any(Boolean)
        })
      ])
    )
  })
})
