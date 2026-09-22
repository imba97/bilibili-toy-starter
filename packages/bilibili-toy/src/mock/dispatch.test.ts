// filepath: packages/bilibili-toy/src/mock/dispatch.test.ts
//
// mock 路由集成测试 —— 覆盖 enableMock → override → dispatch → handler → 错误归一
// 整条链路；同时验证 disableMock 后回到透传（用 stub 替代 window.toy）。

import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test'
import { toy, isMockEnabled } from '../toy'
import { defineNamespace, defineCapability } from '../namespace'

const FAST_LATENCY = { latencyMs: 1 }

/** 把 stub 注入 window.toy，闭包内用 try/finally 保证还原。 */
function withToyStub<T>(sdk: Record<string, unknown>, fn: () => Promise<T>): Promise<T> {
  const w = globalThis as unknown as { window?: Record<string, unknown> }
  const prev = w.window
  w.window = { toy: sdk }
  return fn().finally(() => {
    if (prev === undefined) {
      delete w.window
    } else {
      w.window = prev
    }
  })
}

describe('mock dispatch integration', () => {
  beforeEach(() => {
    toy.disableMock()
    toy.resetMock()
  })

  afterEach(() => {
    toy.disableMock()
    toy.resetMock()
  })

  it('enableMock 后路由打到默认 mock handler —— 返回内置占位', async () => {
    toy.enableMock(FAST_LATENCY)
    expect(isMockEnabled()).toBe(true)

    // 直接构造临时 namespace，避免依赖具体业务 namespace 的状态
    const echo = defineNamespace('echo', {
      hello: defineCapability<{ name: string }>('echoHello').mock((req) => ({
        greeting: `hi, ${req.name}`
      }))
    })

    const result = await echo.hello({ name: 'toy' })
    expect(result).toEqual({ greeting: 'hi, toy' })
  })

  it('override 替换默认 handler —— 优先级高于内置 mock', async () => {
    toy.enableMock(FAST_LATENCY)

    const ns = defineNamespace('ns', {
      add: defineCapability<{ a: number; b: number }>('add').mock(() => ({
        sum: -1
      }))
    })

    ns.override('add').mock((req) => ({ sum: req.a + req.b }))

    await expect(ns.add({ a: 2, b: 3 })).resolves.toEqual({ sum: 5 })
  })

  it('mock handler 抛错时归一化为带 [bilibili-toy] 前缀的 Error', async () => {
    toy.enableMock(FAST_LATENCY)

    const ns = defineNamespace('err', {
      boom: defineCapability('boom').mock(() => {
        throw new Error('kaboom')
      })
    })

    // mock 路径强制加 [bilibili-toy] 前缀 + namespace.method 定位信息
    await expect(ns.boom()).rejects.toThrow(
      /^\[bilibili-toy\] err\.boom mock handler 抛错: kaboom$/
    )
  })

  it('mock handler 返回 Promise.reject —— 也走归一化', async () => {
    toy.enableMock(FAST_LATENCY)

    const ns = defineNamespace('rej', {
      asyncFail: defineCapability('asyncFail').mock(async () => {
        throw new Error('async-fail')
      })
    })

    await expect(ns.asyncFail()).rejects.toThrow(
      /^\[bilibili-toy\] rej\.asyncFail mock handler 抛错: async-fail$/
    )
  })

  it('disableMock 后回到透传 —— 调用 window.toy[capability.sdk]', async () => {
    toy.enableMock(FAST_LATENCY)
    toy.disableMock()
    expect(isMockEnabled()).toBe(false)

    const sdkStub = {
      echoHello: async (req: { name: string }) => ({ greeting: `real, ${req.name}` })
    }
    await withToyStub(sdkStub, async () => {
      const echo = defineNamespace('echo', {
        hello: defineCapability<{ name: string }>('echoHello').mock(() => ({
          greeting: 'mock-only'
        }))
      })

      const result = await echo.hello({ name: 'toy' })
      expect(result).toEqual({ greeting: 'real, toy' })
    })
  })

  it('无参能力（Req = void）mock handler 不需要 req 参数', async () => {
    toy.enableMock(FAST_LATENCY)

    const ns = defineNamespace('zero', {
      ping: defineCapability('ping').mock(() => 'pong')
    })

    await expect(ns.ping()).resolves.toBe('pong')
  })

  it('handler req 入参严格匹配 Req 泛型 —— 多写字段应类型层拦下', async () => {
    // 这条测试纯类型层 —— 运行时不强校验。注释里提示：业务侧 override
    // 时传错类型会被 tsc 拦下；这里只 smoke 一下 mock 链路不会把 req 二次包装。
    toy.enableMock(FAST_LATENCY)

    const ns = defineNamespace('strict', {
      echo: defineCapability<{ a: number }>('echo').mock((req) => ({ doubled: req.a * 2 }))
    })

    await expect(ns.echo({ a: 21 })).resolves.toEqual({ doubled: 42 })
  })
})
