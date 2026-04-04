import { describe, it, expect } from 'vitest'
import { safeId } from '../../stores/helper'

describe('safeId', () => {
  it('正常字符串保持不变', () => {
    expect(safeId('user123')).toBe('user123')
    expect(safeId('测试用户')).toBe('测试用户')
  })

  it('清理特殊字符', () => {
    expect(safeId('user/name')).toBe('user_name')
    expect(safeId('user\\name')).toBe('user_name')
    expect(safeId('user"name')).toBe('user_name')
    expect(safeId('user<name>')).toBe('user_name_')
  })

  it('清理路径遍历字符', () => {
    expect(safeId('../etc/passwd')).toBe('___etc_passwd')
    expect(safeId('..\\windows\\system32')).toBe('___windows_system32')
  })

  it('保留中文字符', () => {
    expect(safeId('用户_123')).toBe('用户_123')
    expect(safeId('商品-001')).toBe('商品-001')
  })

  it('处理空字符串', () => {
    expect(safeId('')).toBe('')
  })

  it('全部特殊字符被替换', () => {
    expect(safeId('!@#$%^&*()')).toBe('__________')
  })
})
