/**
 * 轻量级测试框架 — 在 Electron 主进程中运行 E2E 测试
 *
 * 提供 describe / it / beforeEach / afterEach / expect，
 * 使测试文件与 vitest 风格保持一致，无需 vitest 运行时。
 */
import assert from 'node:assert/strict'

// --- 测试注册状态 ---

interface TestEntry {
  fullPath: string[]
  fn: () => Promise<void> | void
  beforeEachHooks: (() => Promise<void> | void)[]
  afterEachHooks: (() => Promise<void> | void)[]
}

const testEntries: TestEntry[] = []
const currentPath: string[] = []
const beforeEachStack: (() => Promise<void> | void)[][] = []
const afterEachStack: (() => Promise<void> | void)[][] = []

// --- describe / it / beforeEach / afterEach ---

export function describe(name: string, fn: () => void): void {
  currentPath.push(name)
  beforeEachStack.push([])
  afterEachStack.push([])
  fn()
  currentPath.pop()
  beforeEachStack.pop()
  afterEachStack.pop()
}

export function it(name: string, fn: () => Promise<void> | void): void {
  testEntries.push({
    fullPath: [...currentPath, name],
    fn,
    beforeEachHooks: beforeEachStack.flat(),
    afterEachHooks: afterEachStack.flat()
  })
}

export function beforeEach(fn: () => Promise<void> | void): void {
  const arr = beforeEachStack[beforeEachStack.length - 1]
  if (arr) arr.push(fn)
}

export function afterEach(fn: () => Promise<void> | void): void {
  const arr = afterEachStack[afterEachStack.length - 1]
  if (arr) arr.push(fn)
}

// --- expect 断言 ---

class ObjectContaining {
  constructor(public partial: Record<string, unknown>) {}
}

function createExpectation(value: unknown): {
  toBe: (expected: unknown) => void
  toEqual: (expected: unknown) => void
  toBeDefined: () => void
  toBeTruthy: () => void
  toBeFalsy: () => void
  toBeGreaterThan: (n: number) => void
  toHaveLength: (n: number) => void
} {
  return {
    toBe(expected: unknown) {
      assert.strictEqual(value, expected)
    },
    toEqual(expected: unknown) {
      if (expected instanceof ObjectContaining) {
        const obj = value as Record<string, unknown>
        for (const [key, val] of Object.entries(expected.partial)) {
          assert.deepStrictEqual(
            obj[key],
            val,
            `expect().toEqual(objectContaining) — key "${key}" mismatch`
          )
        }
      } else {
        assert.deepStrictEqual(value, expected)
      }
    },
    toBeDefined() {
      assert.notStrictEqual(value, undefined)
    },
    toBeTruthy() {
      assert.ok(Boolean(value), `Expected value to be truthy, got: ${value}`)
    },
    toBeFalsy() {
      assert.ok(!value, `Expected value to be falsy, got: ${value}`)
    },
    toBeGreaterThan(n: number) {
      assert.ok((value as number) > n, `Expected ${value as number} > ${n}`)
    },
    toHaveLength(n: number) {
      const actual = (value as { length: number }).length
      assert.strictEqual(actual, n, `Expected length ${actual} === ${n}`)
    }
  }
}

interface ExpectFn {
  (value: unknown): ReturnType<typeof createExpectation>
  objectContaining: (partial: Record<string, unknown>) => ObjectContaining
}

export const expect = Object.assign((value: unknown) => createExpectation(value), {
  objectContaining: (partial: Record<string, unknown>) => new ObjectContaining(partial)
}) as ExpectFn

// --- 测试执行 ---

export async function runTests(): Promise<boolean> {
  let passed = 0
  let failed = 0
  let lastSuite = ''

  for (const entry of testEntries) {
    const suiteName = entry.fullPath.slice(0, -1).join(' > ')
    const testName = entry.fullPath[entry.fullPath.length - 1]

    if (suiteName !== lastSuite) {
      console.log(`\n  ${suiteName}`)
      lastSuite = suiteName
    }

    try {
      for (const hook of entry.beforeEachHooks) await hook()
      await entry.fn()
      for (const hook of entry.afterEachHooks) await hook()

      console.log(`    ✓ ${testName}`)
      passed++
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.log(`    ✗ ${testName}`)
      console.log(`      ${msg.split('\n')[0]}`)

      // afterEach 即使测试失败也要执行
      try {
        for (const hook of entry.afterEachHooks) await hook()
      } catch {
        // 忽略 afterEach 错误
      }
      failed++
    }
  }

  const total = passed + failed
  console.log(`\n  Tests: ${total} total, ${passed} passed, ${failed} failed\n`)

  return failed === 0
}
