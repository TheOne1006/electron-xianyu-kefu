import { beforeEach, describe, expect, it, vi } from 'vitest'

import { mockWebContents } from '../__mocks__/electron'
import {
  BrowserAutomationService,
  type AutomationWebContents
} from '../../automation/browser-automation-service'

describe('BrowserAutomationService', () => {
  const webContents = mockWebContents as unknown as AutomationWebContents

  beforeEach(() => {
    vi.restoreAllMocks()
    mockWebContents.sendInputEvent.mockReset()
    mockWebContents.insertText.mockReset()
  })

  it('click 会发送移动、按下和抬起事件', async () => {
    const service = new BrowserAutomationService(webContents, {
      sleep: async () => {},
      random: () => 0
    })

    await service.click({ x: 100, y: 200 })

    const events = mockWebContents.sendInputEvent.mock.calls.map((call) => call[0])
    expect(events[0]).toMatchObject({ type: 'mouseMove' })
    expect(events.at(-2)).toMatchObject({ type: 'mouseDown', button: 'left' })
    expect(events.at(-1)).toMatchObject({ type: 'mouseUp', button: 'left' })
    expect(events.filter((event) => event.type === 'mouseMove').length).toBeGreaterThanOrEqual(10)
  })

  it('typeChinese 会按词块插入文本', async () => {
    const randomValues = [0, 0, 0, 0, 0, 0.5, 0, 0.5]
    const service = new BrowserAutomationService(webContents, {
      sleep: async () => {},
      random: () => randomValues.shift() ?? 0.5
    })

    await service.typeChinese('你好世界再见')

    expect(mockWebContents.insertText.mock.calls.map((call) => call[0])).toEqual([
      '你好',
      '世界',
      '再见'
    ])
  })

  it('typeChinese 命中 typo 分支时会回删再重输', async () => {
    const randomValues = [0, 0.05, 0, 0, 0, 0, 0, 0]
    const service = new BrowserAutomationService(webContents, {
      sleep: async () => {},
      random: () => randomValues.shift() ?? 0
    })

    await service.typeChinese('你好世界')

    const insertedTexts = mockWebContents.insertText.mock.calls.map((call) => call[0])
    expect(insertedTexts[0]).toBe('你好')
    expect(insertedTexts[1]).toHaveLength(2)
    expect(insertedTexts[2]).toBe('世界')
    const backspaceDownEvents = mockWebContents.sendInputEvent.mock.calls
      .map((call) => call[0])
      .filter((event) => event.type === 'keyDown' && event.keyCode === 'Backspace')
    expect(backspaceDownEvents).toHaveLength(2)
  })

  it('pressEnter 会先聚焦再发送回车', async () => {
    const service = new BrowserAutomationService(webContents, {
      sleep: async () => {},
      random: () => 0
    })

    await service.pressEnter({ x: 80, y: 90 })

    const events = mockWebContents.sendInputEvent.mock.calls.map((call) => call[0])
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'mouseMove', x: 80, y: 90 }),
        expect.objectContaining({ type: 'mouseDown', x: 80, y: 90, button: 'left' }),
        expect.objectContaining({ type: 'mouseUp', x: 80, y: 90, button: 'left' }),
        expect.objectContaining({ type: 'keyDown', keyCode: 'Return' }),
        expect.objectContaining({ type: 'keyUp', keyCode: 'Return' })
      ])
    )
  })
})
