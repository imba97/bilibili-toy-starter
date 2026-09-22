// filepath: packages/bilibili-toy/src/toy.ts
//
// toy 单例 + mock 状态机。
//
// 三块职责：
//   1. 真 SDK 握手：toy.ready() 探测 window.toy（真容器内 resolve，dev下超时抛 ToyNotAvailableError）
//   2. mock 启用：toy.enableMock({ latencyMs }) 开启后，所有 namespace 走 mock handler
//   3. mock 共享状态：toy.resetMock() 重置；toy.mockEnabled() / getMockCtx() 内部用
//
// 设计：mock 与真 SDK 完全独立。toy.enableMock() 后 toy.ready() 仍然会探测 window.toy
// （用于检测"真容器开了预览模式"等场景），但 namespace 不会再走它。

import { detectToy } from './env'
import { ToyNotAvailableError } from './error'
import type { MockCtx } from './mock/ctx'
import { clearPersistedMock } from './mock/store'
import { createMockCtx } from './mock/ctx'
import { createMockStore, type MockStore } from './mock/store'

// ────────────────────────────────────────────────────────────────────────
// 错误路径诊断日志：仅 SDK 握手失败（timeout / miss）时调用，业务侧排查用。
// 成功路径上的 debug 日志全部移除 —— 生产环境不应刷任何 [toy:debug] 输出。
// 临时静默可在 console 跑 `localStorage.toy_debug = '0'` 刷新即生效。
// ────────────────────────────────────────────────────────────────────────
function debugLog(label: string, payload?: Record<string, unknown>): void {
  try {
    if (typeof localStorage !== 'undefined' && localStorage.toy_debug === '0') return
  } catch {
    /* SSR */
  }
  // eslint-disable-next-line no-console
  console.log(`%c[toy:debug] ${label}`, 'color:#6366f1;font-weight:bold', payload ?? '')
}

// ────────────────────────────────────────────────────────────────────────
// 真 SDK 状态
// ────────────────────────────────────────────────────────────────────────
let cachedSdk: ToySDK.Toy | null = null
let readyPromise: CancellablePromise<ToySDK.Toy> | null = null

/**
 * 内部用：带 `.cancel()` 的 Promise，SPA 路由切换 / 组件卸载时可主动停掉
 * 还在排队的 `setTimeout` 轮询，避免后续 tick 在已 reject 的 Promise 上 resolve
 * 触发 unhandled rejection。
 */
interface CancellablePromise<T> extends Promise<T> {
  cancel(): void
}

/**
 * 内部轮询 `window.toy` —— 超时抛 `ToyNotAvailableError`，命中即 resolve。
 *
 * 用 `setTimeout` 递归而不是 `setInterval`：超时 reject 后已经排队的 tick
 * 会在下一个事件循环里被 cancelled 标记拦下，不会再触发副作用。
 */
function waitForToy(timeoutMs: number, onTimeout: () => void): CancellablePromise<ToySDK.Toy> {
  let cancelled = false
  const promise = new Promise<ToySDK.Toy>((resolve, reject) => {
    const start = Date.now()
    const tick = (): void => {
      if (cancelled) return
      const sdk = detectToy()
      if (sdk) {
        cachedSdk = sdk
        resolve(sdk)
        return
      }
      if (Date.now() - start > timeoutMs) {
        debugLog('ready:timeout', { elapsedMs: Date.now() - start })
        onTimeout()
        reject(new ToyNotAvailableError())
        return
      }
      setTimeout(tick, 100)
    }
    tick()
  })
  ;(promise as CancellablePromise<ToySDK.Toy>).cancel = (): void => {
    cancelled = true
  }
  return promise as CancellablePromise<ToySDK.Toy>
}

/** 内部用：拿已 ready 的 SDK 单例。未 ready 抛 ToyNotAvailableError。 */
export function getSdk(): ToySDK.Toy {
  const sdk = cachedSdk ?? detectToy()
  if (!sdk) {
    debugLog('getSdk:miss', {
      cachedSdkExists: cachedSdk !== null,
      hasWindowToy: typeof window !== 'undefined' && typeof window.toy !== 'undefined'
    })
    throw new ToyNotAvailableError()
  }
  return sdk
}

// ────────────────────────────────────────────────────────────────────────
// mock 状态（模块单例，dev 模式下整个 SPA 共用）
// ────────────────────────────────────────────────────────────────────────
let mockEnabled = false
let mockStore: MockStore = createMockStore()
let mockCtx: MockCtx = createMockCtx({ store: mockStore })

export function isMockEnabled(): boolean {
  return mockEnabled
}

export function getMockStore(): MockStore {
  return mockStore
}

export function getMockCtx(): MockCtx {
  return mockCtx
}

// ────────────────────────────────────────────────────────────────────────
// 公开 API
// ────────────────────────────────────────────────────────────────────────

export interface EnableMockOptions {
  /** 模拟一次网络往返的延迟（毫秒）。默认 80。 */
  latencyMs?: number
  /** 自定义当前 mock 用户 mid（默认见 mock/store 的 MOCK_DEFAULT_USER_ID） */
  mockUserId?: number
}

export const toy = {
  /** 探测 window.toy 是否存在（同步，不等待）。mock 启用时不依赖此判断。 */
  isAvailable: (): boolean => detectToy() !== null,

  /**
   * 等待 window.toy 出现并缓存。多次调用共用同一个 Promise。
   * 超时抛 ToyNotAvailableError。默认超时 5000ms。
   *
   * 返回 Promise 上挂了 `.cancel()`（仅在等待中的 promise 上有意义）；
   * 调用方可在 SPA 路由切换 / 组件卸载时主动停掉轮询。
   */
  ready: (timeoutMs = 5000): CancellablePromise<ToySDK.Toy> => {
    if (cachedSdk) {
      const p = Promise.resolve(cachedSdk) as CancellablePromise<ToySDK.Toy>
      p.cancel = (): void => {}
      return p
    }
    if (!readyPromise) {
      const p = waitForToy(timeoutMs, () => {
        // 超时清理：onTimeout 时 readyPromise 还指向自己，先标 null 让下一次 ready 重新探测
        readyPromise = null
        cachedSdk = null
      })
      p.then(
        () => {
          readyPromise = null
        },
        () => {
          readyPromise = null
        }
      )
      readyPromise = p
    }
    return readyPromise
  },

  /** Toy 平台是否支持某个能力（透传官方 isSupport） */
  isSupport: (ability: string): Promise<boolean> => getSdk().isSupport(ability),

  /**
   * 启用 mock —— 所有 namespace 方法将走 mock handler 而非真实 RPC。
   *
   * 业务侧使用：
   *   if (import.meta.env.DEV) toy.enableMock()
   *
   * 调用方零分支：await author.profile() 在 mock 与真容器下行为不同，但调用代码相同。
   */
  enableMock: (opts: EnableMockOptions = {}): void => {
    if (opts.mockUserId !== undefined) {
      mockStore.mockUserId = opts.mockUserId
    }
    mockCtx = createMockCtx({ store: mockStore, latencyMs: opts.latencyMs })
    mockEnabled = true
    // eslint-disable-next-line no-console
    console.log('[toy:mock] enabled', opts)
  },

  /** 关闭 mock —— namespace 回到透传真实 SDK。store 与 ctx 不重置。 */
  disableMock: (): void => {
    mockEnabled = false
    // eslint-disable-next-line no-console
    console.log('[toy:mock] disabled')
  },

  /** 重置 mock 状态到默认值（清空 localStorage 中的 cloud KV）。不改变 enabled 状态。 */
  resetMock: (): void => {
    clearPersistedMock()
    mockStore = createMockStore()
    mockCtx = createMockCtx({ store: mockStore })
    // eslint-disable-next-line no-console
    console.log('[toy:mock] store reset')
  },

  /** 当前是否启用了 mock（同步，便于业务侧做条件渲染） */
  mockEnabled: (): boolean => mockEnabled
}

/**
 * 测试专用：清空模块单例状态（cachedSdk + readyPromise + mock store/ctx）。
 *
 * 生产代码不应该调用；它的存在纯粹是因为 `cachedSdk` / `readyPromise` 是
 * 模块级变量，单测间无法直接重置，只能通过这个口子统一清理。
 *
 * 不属于 `toy` 公开 API —— 业务侧 import 它会拿到一个明确命名 `__resetForTests`，
 * 不会和真正的 `toy.ready()` / `toy.disableMock()` 等业务方法混淆。
 */
export function __resetForTests(): void {
  cachedSdk = null
  readyPromise = null
  mockEnabled = false
  mockStore = createMockStore()
  mockCtx = createMockCtx({ store: mockStore })
}
