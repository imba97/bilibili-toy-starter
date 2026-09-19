// filepath: packages/bilibili-toy/src/namespace.test.ts
//
// 验证 invokeWithHostBackoff 对 host 元信息未就绪错误的退避行为。
// 直接调纯函数、传 1ms backoff + noop sleep，避免 fake timer 时序坑。

import { describe, expect, it, vi } from 'vite-plus/test'
import { invokeWithHostBackoff } from './namespace'

const HOST_READY_MSG = '[ToySDK] toy id not available on host'
const FAST_BACKOFF = [1, 1, 1] as const
const noopSleep = (): Promise<void> => Promise.resolve()

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
})
