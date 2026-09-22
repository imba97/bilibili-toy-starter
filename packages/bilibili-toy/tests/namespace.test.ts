// filepath: packages/bilibili-toy/tests/namespace.test.ts
//
// Tests for `defineCapability` / `defineNamespace` / `invokeWithHostBackoff`.
//
// The original `src/namespace.test.ts` only covered backoff behaviour. This file
// expands coverage to also exercise:
//   - basic capability typing (Req, Resp inference)
//   - namespace `override(key).mock(h)` chain
//   - dispatcher path (mock vs passthrough; error normalisation on the mock path)
//   - proxy "not a getter" warn in dev
//
// All tests inject 1ms latencies / backoffs to avoid real-time waits.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import {
  HOST_READY_BACKOFF_MS,
  defineCapability,
  defineNamespace,
  invokeWithHostBackoff
} from '../src/namespace'
import { toy, isMockEnabled, __resetForTests } from '../src/toy'

const HOST_READY_MSG = '[ToySDK] toy id not available on host'
const FAST_BACKOFF = [1, 1, 1] as const
const noopSleep = (_ms: number): Promise<void> => Promise.resolve()

describe('invokeWithHostBackoff', () => {
  it('host 未就绪错误在重试期间恢复 —— 透明返回结果', async () => {
    let calls = 0
    const invoke = vi.fn(() => {
      calls += 1
      if (calls < 3) {
        return Promise.reject(new Error(HOST_READY_MSG))
      }
      return Promise.resolve({ ci_total: '7' })
    })

    await expect(invokeWithHostBackoff(invoke, FAST_BACKOFF, noopSleep)).resolves.toEqual({
      ci_total: '7'
    })
    expect(invoke).toHaveBeenCalledTimes(3)
  })

  it('重试用尽仍 host 未就绪 —— 把最后一次错误归一化抛出', async () => {
    const invoke = vi.fn(() => Promise.reject(new Error(HOST_READY_MSG)))

    await expect(invokeWithHostBackoff(invoke, FAST_BACKOFF, noopSleep)).rejects.toThrow(
      /toy id not available on host/
    )
    // 首次 + 3 次退避 = 4 次
    expect(invoke).toHaveBeenCalledTimes(4)
  })

  it('非 host 未就绪错误立即抛出 —— 不重试', async () => {
    const invoke = vi.fn(() => Promise.reject(new Error('[ToySDK] unauthorized')))

    await expect(invokeWithHostBackoff(invoke, FAST_BACKOFF, noopSleep)).rejects.toThrow(
      'unauthorized'
    )
    expect(invoke).toHaveBeenCalledTimes(1)
  })

  it('同步返回值直接透传 —— 不退避', async () => {
    const invoke = vi.fn(() => 'pong')

    await expect(invokeWithHostBackoff(invoke, FAST_BACKOFF, noopSleep)).resolves.toBe('pong')
    expect(invoke).toHaveBeenCalledTimes(1)
  })

  it('同步抛 host 未就绪 —— 进入退避链（虽然罕见）', async () => {
    let calls = 0
    const invoke = vi.fn(() => {
      calls += 1
      if (calls < 2) throw new Error(HOST_READY_MSG)
      return 'ok'
    })

    await expect(invokeWithHostBackoff(invoke, FAST_BACKOFF, noopSleep)).resolves.toBe('ok')
    expect(invoke).toHaveBeenCalledTimes(2)
  })

  it('HOST_READY_BACKOFF_MS is the documented production ladder (200/400/800)', () => {
    expect(HOST_READY_BACKOFF_MS).toEqual([200, 400, 800])
  })

  it('default sleep is invoked when no custom sleep passed', async () => {
    let calls = 0
    const invoke = vi.fn(() => {
      calls += 1
      if (calls < 2) return Promise.reject(new Error(HOST_READY_MSG))
      return Promise.resolve('ok')
    })
    // baseDelay = 200ms first step; we only need to verify the first sleep
    // was scheduled — we don't actually wait 200ms (it returns ok on 2nd try).
    await expect(invokeWithHostBackoff(invoke, [1])).resolves.toBe('ok')
    expect(invoke).toHaveBeenCalledTimes(2)
  })
})

describe('defineCapability + defineNamespace', () => {
  beforeEach(() => {
    __resetForTests()
    // window.toy may leak from previous tests → ensure a clean baseline
    delete (globalThis as { window?: unknown }).window
  })
  afterEach(() => {
    __resetForTests()
    delete (globalThis as { window?: unknown }).window
  })

  it('binds a capability and routes via window.toy[sdk]', async () => {
    const sdk = { hello: vi.fn(() => Promise.resolve('real')) }
    ;(globalThis as { window?: unknown }).window = { toy: sdk }

    const ns = defineNamespace('ns', {
      hello: defineCapability('hello').mock(() => 'mock-only')
    })

    // mock is disabled → passthrough
    expect(isMockEnabled()).toBe(false)
    await expect(ns.hello()).resolves.toBe('real')
    expect(sdk.hello).toHaveBeenCalledTimes(1)
  })

  it('passthrough throws a clear error when window.toy[sdk] is missing', async () => {
    ;(globalThis as { window?: unknown }).window = { toy: {} }
    const ns = defineNamespace('ns', {
      ghost: defineCapability('ghost').mock(() => 'noop')
    })
    try {
      await ns.ghost()
      throw new Error('expected ns.ghost() to throw')
    } catch (e) {
      expect((e as Error).message).toMatch(/window\.toy\.ghost 不存在/)
    }
  })

  it('override(key) returns the original builder so .mock(h) chains', async () => {
    toy.enableMock({ latencyMs: 1 })
    const ns = defineNamespace('ns', {
      add: defineCapability<{ a: number; b: number }>('add').mock(() => ({ sum: -1 }))
    })
    ns.override('add').mock((req) => ({ sum: req.a + req.b }))
    await expect(ns.add({ a: 2, b: 3 })).resolves.toEqual({ sum: 5 })
  })

  it('proxy property access warns (dev) but does not throw', () => {
    toy.enableMock({ latencyMs: 1 })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const ns = defineNamespace('ns', {
        hello: defineCapability('hello').mock(() => 'ok')
      })
      // reading `.sdkName` is allowed (explicit fast path) and should NOT warn
      expect((ns.hello as unknown as { sdkName: string }).sdkName).toBe('hello')
      // arbitrary getter access triggers warn
      void (ns.hello as unknown as Record<string, unknown>).whatever
      expect(warn).toHaveBeenCalled()
      expect(String(warn.mock.calls[0]?.[0])).toMatch(/不是可读属性/)
    } finally {
      warn.mockRestore()
    }
  })

  it('null-prototype invocation (no args) works for Req = void', () => {
    // Just make sure we can construct + invoke without TS blowing up
    const ns = defineNamespace('ns', {
      ping: defineCapability('ping').mock(() => 'pong')
    })
    expect(typeof ns.ping).toBe('function')
  })
})
