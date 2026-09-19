// filepath: packages/bilibili-toy/src/namespace.ts
//
// namespace 工厂 + capability 描述符。
//
// 两层入口：
//   1. useCapability<Req>(sdk)         —— 声明一个能力
//      .mock(handler)                   —— 可选挂 mock handler（仅 dev / 预览模式生效）
//   2. defineNamespace(name, bindings)  —— 把一组能力装配成可调用的 namespace Proxy
//
// 路由策略（Proxy.get 内统一）：
//   1. mock 启用 + 该能力有 mock → 自动延迟 + log + 错误归一 + handler
//   2. 否则透传 window.toy[capability.sdk]
//
// 调用方零分支：
//   await rank.submit({ score: 7 })  // 真容器走 RPC，dev 模式走 mock

import type { CapabilityBuilder, MockHandler } from './types'
import { getSdk, isMockEnabled, getMockCtx } from './toy'
import { isToyHostNotReady, normalizeToyError } from './error'

/** 判断值是不是 Promise-like */
const isPromiseLike = (v: unknown): v is PromiseLike<unknown> =>
  typeof v === 'object' &&
  v !== null &&
  'then' in v &&
  typeof (v as { then?: unknown }).then === 'function'

/**
 * 声明一个能力。
 *
 * 用法：
 *   // 纯透传
 *   navigate: useCapability('navigate')
 *
 *   // 自带 mock（仅 dev / 预览模式生效；真容器下忽略）
 *   submit: useCapability<SubmitScoreReq>('submitScore').mock((req, ctx) => ({ score: 7 }))
 *
 * - `Req` 泛型声明请求类型，handler 内 `req` 自动有类型
 * - `Resp` 不写泛型 —— 从 handler 返回值自动推导
 * - `ctx` 永远是 `MockCtx`，handler 内可用 store / mockUserId / delay() / log() 等
 * - SDK 内置默认空 mock 用 `.mock(defaultHandler)` 挂载，业务侧 `override(key).mock(h)`
 *   会原地替换 _mock，优先级最高
 */
export function useCapability<Req = unknown>(sdk: string): CapabilityBuilder<Req, unknown> {
  const builder: CapabilityBuilder<Req, unknown> = {
    sdk,
    mock(handler: MockHandler<Req, unknown>) {
      builder._mock = handler
      return builder
    }
  }
  return builder
}

/**
 * 声明一个 namespace。
 *
 * 用法：
 *   export const rank = defineNamespace('rank', {
 *     submit: useCapability<SubmitScoreReq>('submitScore').mock((req, ctx) => {...}),
 *     list:   useCapability<RankListReq | undefined>('getRankList').mock(fn),
 *     me:     useCapability<MyRankReq | undefined>('getMyRank').mock(fn)
 *   })
 *
 * `namespaceName` 用于 mock 日志前缀 `[toy:mock] <name>.<method>`。
 *
 * 返回对象上挂了 `override(key)` 方法，供业务侧替换 SDK 默认 mock：
 *   rank.override('my').mock((req, ctx) => ({ rank: 7 }))
 *
 * - `K extends keyof B` 约束保证 key 必须是该 namespace 已声明的能力
 * - 返回 `B[K]`（原始 CapabilityBuilder），业务侧 `.mock(h)` 链式调用
 *   时 handler 的入参 `req` 仍由 useCapability<Req>(...) 泛型决定
 */
export function defineNamespace<B extends Record<string, CapabilityBuilder<any, any>>>(
  namespaceName: string,
  bindings: B
): {
  [K in keyof B]: unknown
} & {
  /**
   * 获取某个能力对应的 CapabilityBuilder，供外部挂载新的 mock handler
   * （替换 SDK 默认）。返回的 builder 可继续链式 `.mock(handler)`。
   *
   * @example
   *   rank.override('my').mock(async (req, ctx) => ({ rank: 7 }))
   */
  override<K extends keyof B>(key: K): B[K]
} {
  // builder 单例必须放进 def 而不是快照：业务侧 `xxx.override(key).mock(h)` 原地
  // 改 builder._mock，路由层每次 lookup 都看到最新值；如果快照则 override 永远不生效。
  const def: Record<string, unknown> = {}
  for (const k of Object.keys(bindings)) {
    def[k] = bindings[k]
  }
  // override 是 namespace 元方法，进 def 与 capability 共用同一张表，单一数据源。
  def.override = <K extends keyof B>(key: K): B[K] => bindings[key]
  return buildProxy(namespaceName, def) as {
    [K in keyof B]: unknown
  } & { override: <K extends keyof B>(key: K) => B[K] }
}

// ────────────────────────────────────────────────────────────────────────
// Proxy 构建
// ────────────────────────────────────────────────────────────────────────

function buildProxy(namespaceName: string, def: Record<string, unknown>): object {
  return new Proxy({} as object, {
    get(_target, prop: string) {
      // override 是 namespace 元方法，优先返回、不进 capability 路由（也跳过诊断日志）
      if (prop === 'override') {
        return def.override
      }
      const cap = def[prop] as { sdk: string; _mock?: MockHandler } | undefined
      if (!cap) {
        throw new Error(`[bilibili-toy] unknown namespace method: ${prop}`)
      }

      // 路由层真实查的 mock handler 是 builder 的 `_mock` 内部槽位。
      // 这点很关键：业务侧 override().mock(h) 原地改 builder._mock，
      // 必须让路由层直接读 builder 才能拿到最新值。
      const mockHandler = cap._mock

      // 1. mock 启用 + 该能力有 mock → 走工厂层包装（延迟 + 日志 + 错误归一）
      if (isMockEnabled() && mockHandler) {
        // 仅 mock 模式下打路由诊断日志 —— 真容器不该刷任何 [toy:debug] 输出
        // eslint-disable-next-line no-console
        console.log('%c[toy:debug] route', 'color:#0ea5e9;font-weight:bold', {
          namespace: namespaceName,
          method: String(prop),
          sdkKey: cap.sdk,
          route: 'mock'
        })
        return async (req: unknown) => {
          const ctx = getMockCtx()
          await ctx.delay()
          ctx.log(namespaceName, prop, req)
          try {
            return await mockHandler(req, ctx)
          } catch (err) {
            throw normalizeToyError(err)
          }
        }
      }

      // 2. 否则透传真实 SDK
      const sdk = getSdk()
      const fn = (sdk as unknown as Record<string, unknown>)[cap.sdk]
      if (typeof fn !== 'function') {
        throw new Error(
          `[bilibili-toy] window.toy.${cap.sdk} 不存在 —— 当前 Toy SDK 可能未实现该方法`
        )
      }

      // Toy host 元信息（toy id）注入存在 race condition：SDK 已挂在 window.toy
      // 上、但 host 还没把 toy id 传给运行时，调用就被 reject 成
      // "toy id not available on host"。这是 host 加载顺序问题，不是业务错误，
      // 几百毫秒内自动恢复 —— 在透传层做短期退避（200 → 400 → 800ms），避免
      // 一进页面就同时 reject getCloudStorage / getRankList / getMyRank 等。
      return (...args: unknown[]) =>
        invokeWithHostBackoff(() => (fn as (...a: unknown[]) => unknown).apply(sdk, args))
    }
  })
}

/** 生产侧 host 未就绪的退避档位（毫秒）。200 → 400 → 800，合计 ~1.4s 上限。 */
export const HOST_READY_BACKOFF_MS: ReadonlyArray<number> = [200, 400, 800]

const defaultSleep = (ms: number): Promise<void> =>
  new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * 调用真 SDK，对 "toy id not available on host" 错误做短期退避。
 *
 * - 同步返回值直接透传；非 host 未就绪错误立即抛出（已经过 normalizeToyError 归一化）
 * - 命中 host 未就绪时按 backoff 数组重试；用尽仍命中则把最后一次错误抛出
 * - `sleep` 可注入，测试可传入 1ms 数组避免等真实时长
 */
function diagFromError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack?.split('\n').slice(0, 3).join(' | ')
    }
  }
  return { value: String(err) }
}

export async function invokeWithHostBackoff(
  invoke: () => unknown,
  backoffMs: ReadonlyArray<number> = HOST_READY_BACKOFF_MS,
  sleep: (ms: number) => Promise<void> = defaultSleep
): Promise<unknown> {
  let lastError: unknown
  for (let attempt = 0; attempt <= backoffMs.length; attempt++) {
    try {
      const ret = invoke()
      if (isPromiseLike(ret)) {
        return await (ret as PromiseLike<unknown>)
      }
      return ret
    } catch (err) {
      lastError = err
      const hostReady = isToyHostNotReady(err)
      // 诊断日志仅 mock 模式下输出（真容器下 host 稳了不进 catch，即使进了也不刷 console）
      if (isMockEnabled()) {
        // eslint-disable-next-line no-console
        console.log('%c[toy:debug] invoke:fail', 'color:#ef4444;font-weight:bold', {
          attempt,
          hostReady,
          err: diagFromError(err)
        })
      }
      if (!hostReady || attempt === backoffMs.length) {
        if (hostReady && isMockEnabled()) {
          // eslint-disable-next-line no-console
          console.log('%c[toy:debug] invoke:gave-up', 'color:#ef4444;font-weight:bold', {
            sdkKeys:
              typeof window !== 'undefined' && window.toy
                ? Object.keys(window.toy).slice(0, 30)
                : '<no window.toy>',
            toyId:
              typeof window !== 'undefined' && window.toy
                ? (window.toy as unknown as Record<string, unknown>).toyId
                : null,
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : ''
          })
        }
        throw normalizeToyError(err)
      }
      await sleep(backoffMs[attempt])
    }
  }
  throw normalizeToyError(lastError)
}
