// filepath: packages/bilibili-toy/src/mock/ctx.ts
//
// MockCtx —— mock handler 调用时的运行时上下文。
//
// 职责：
//   - 暴露 store 给 handler 共享状态
//   - 提供延迟模拟（让 UI 有真实网络请求的 loading 节奏）
//   - 统一日志输出，方便调试哪个 handler 被调过
//
// 设计：handler 是纯函数 + ctx（依赖注入），而不是闭包捕获全局变量。
// 这样 handler 可单测、可换实现、可在多个 namespace 间组合。

import type { MockStore } from './store'

export interface MockCtx {
  /** 共享 store（cloud KV、rank 状态、mockUserId） */
  store: MockStore
  /** 当前访问用户的 mid */
  mockUserId: number
  /** 模拟一次网络往返的默认延迟（毫秒），可用 enableMock({ latencyMs }) 覆盖 */
  latencyMs: number
  /** 模拟一次响应的延迟（resolve 前等待），便于 UI 看到 loading 状态 */
  delay(): Promise<void>
  /**
   * 统一日志：控制台打 `[toy:mock] namespace.method` 前缀。
   * 业务侧 dev 模式下可一眼看出"哪些 mock 被调过"。
   */
  log(namespace: string, method: string, req?: unknown, resp?: unknown): void
}

export interface CreateMockCtxOptions {
  store: MockStore
  latencyMs?: number
}

/** 默认延迟：模拟一次网络往返，约 80ms */
const DEFAULT_LATENCY_MS = 80

export function createMockCtx(opts: CreateMockCtxOptions): MockCtx {
  const latencyMs = opts.latencyMs ?? DEFAULT_LATENCY_MS
  return {
    store: opts.store,
    mockUserId: opts.store.mockUserId,
    latencyMs,
    delay() {
      return new Promise<void>((resolve) => setTimeout(resolve, latencyMs))
    },
    log(namespace, method, req, resp) {
      // 精简日志：仅打印 method + req，resp 在 toy.resetMock() 等管理场景由业务自己 console.log
      const reqStr = req === undefined ? '' : ` req=${safeStringify(req)}`
      // eslint-disable-next-line no-console
      console.log(`[toy:mock] ${namespace}.${method}${reqStr}`)
      if (resp !== undefined) {
        // eslint-disable-next-line no-console
        console.log(`[toy:mock] ${namespace}.${method} →`, resp)
      }
    }
  }
}

/** 安全 stringify：循环引用不会崩 */
function safeStringify(v: unknown): string {
  try {
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
}
