// filepath: packages/bilibili-toy/src/namespace.ts
//
// namespace 工厂 + capability 描述符。
//
// 两层入口：
//   1. defineCapability<Req>(sdk)       —— 声明一个能力
//      .mock(handler)                   —— 可选挂 mock handler（仅 dev / 预览模式生效）
//   2. defineNamespace(name, bindings)  —— 把一组能力装配成可调用的 namespace Proxy
//
// 路由策略（每个能力一个 Proxy）：
//   1. mock 启用 + 该能力有 mock → 自动延迟 + log + 错误归一 + handler
//   2. 否则透传 window.toy[capability.sdk]
//
// 调用方零分支：
//   await rank.submit({ score: 7 })  // 真容器走 RPC，dev 模式走 mock

import type { Capability, CapabilityBuilder, MockHandler } from './types'
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
 *   // 无参纯透传
 *   closeBrowser: defineCapability('closeBrowser')
 *
 *   // 带默认 mock
 *   submit: defineCapability<SubmitScoreReq>('submitScore')
 *     .mock((req, ctx) => ({ score: 7 }))
 *
 * - `Req` 泛型声明请求类型，handler 内 `req` 自动有类型。缺省 `void`。
 * - `Resp` 不写泛型 —— lambda 返回值自动推导（Resp 默认 `any` 是无约束桥）
 * - `ctx` 永远是 `MockCtx`，handler 内可用 store / mockUserId / delay() / log() 等
 * - 业务侧 `override(key).mock(h)` 会原地替换默认 handler，优先级最高
 */
export function defineCapability<Req = void, Resp = unknown>(
  sdk: string
): CapabilityBuilder<Req, Resp> {
  let handler: MockHandler<Req, Resp> | undefined
  const builder: CapabilityBuilder<Req, Resp> = {
    sdk,
    mock(h: MockHandler<Req, Resp>) {
      handler = h
      return builder
    }
  }
  // 把 handler getter 挂在 builder 上 —— 路由层读它来分发
  // 不放进类型，避免外部代码触碰。
  Object.defineProperty(builder, '_getMock', {
    value: (): MockHandler<Req, Resp> | undefined => handler,
    enumerable: false
  })
  return builder
}

/**
 * 声明一个 namespace。
 *
 * 用法：
 *   export const rank = defineNamespace('rank', {
 *     submit: defineCapability<SubmitScoreReq>('submitScore').mock(submitScoreDefault),
 *     list:   defineCapability<RankListReq>('getRankList').mock(rankListDefault),
 *     me:     defineCapability<MyRankReq>('getMyRank').mock(myRankDefault)
 *   })
 *
 * `namespaceName` 用于 mock 日志前缀 `[toy:mock] <name>.<method>`。
 *
 * 返回对象上挂了 `override(key)` 方法，供业务侧替换 SDK 默认 mock：
 *   rank.override('submit').mock(async (req, ctx) => ({ score: 7 }))
 *
 * - 类型层 key 严格收窄：override('submit') 拿到 SubmitScoreReq 的 builder，
 *   业务侧 .mock(h) 的 h 入参自动是 SubmitScoreReq，无需手动标注
 * - 返回对象上每个方法都是 Proxy：handler 真存在才走 mock，否则透传 window.toy
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function defineNamespace<
  Name extends string,
  B extends Record<string, CapabilityBuilder<any, any>>
>(
  namespaceName: Name,
  bindings: B
): {
  readonly [K in keyof B]: (...args: unknown[]) => unknown
} & {
  /**
   * 拿到某个能力对应的 builder，链式 `.mock(h)` 原地替换默认 handler。
   * 严格类型：`override('submit')` 拿到 SubmitScoreReq 的 builder。
   *
   * @example
   *   rank.override('submit').mock(async (req, ctx) => ({ score: 7 }))
   */
  override<K extends keyof B>(key: K): B[K]
} {
  const def: Record<string, unknown> = {}
  for (const k of Object.keys(bindings)) {
    const cap = bindings[k]
    // 每个 capability 单独 buildProxy —— 闭包变量持有 handler，
    // proxy.get 命中 method 名时按 isMockEnabled 分发。
    def[k] = buildCapabilityProxy(namespaceName, String(k), cap)
  }
  // override 是 namespace 元方法，绕过 capability 路由、跳过诊断日志。
  def.override = <K extends keyof B>(key: K): B[K] => bindings[key]
  return def as {
    readonly [K in keyof B]: (...args: unknown[]) => unknown
  } & { override: <K extends keyof B>(key: K) => B[K] }
}

// ────────────────────────────────────────────────────────────────────────
// 单个 capability 的 Proxy：method 名永远是自身
// ────────────────────────────────────────────────────────────────────────

function buildCapabilityProxy(
  namespaceName: string,
  methodName: string,
  cap: Capability
): (...args: unknown[]) => unknown {
  return new Proxy((..._args: unknown[]) => undefined, {
    get(_target, prop: string | symbol) {
      if (prop === 'self' || prop === Symbol.toPrimitive) return undefined
      if (prop === 'sdkName') return cap.sdk
      throw new Error(
        `[bilibili-toy] ${namespaceName}.${methodName} 不是可读属性（按 method 调用）`
      )
    },
    apply(_target, _thisArg, args: unknown[]) {
      return dispatch(namespaceName, methodName, cap, args)
    }
  }) as (...args: unknown[]) => unknown
}

/**
 * 路由分发：mock 启用 + 有 handler 走 mock，否则透传真 SDK。
 */
function dispatch(
  namespaceName: string,
  methodName: string,
  cap: Capability,
  args: unknown[]
): unknown {
  // 闭包里的 handler getter（绕过类型层）
  const getMock = (cap as unknown as { _getMock?: () => MockHandler | undefined })._getMock
  const mockHandler = getMock?.()

  // 1. mock 启用 + 该能力有 mock → 工厂层包装（延迟 + 日志 + 错误归一）
  if (isMockEnabled() && mockHandler) {
    // 仅 mock 模式下打路由诊断日志 —— 真容器不该刷任何 [toy:debug] 输出
    // eslint-disable-next-line no-console
    console.log('%c[toy:debug] route', 'color:#0ea5e9;font-weight:bold', {
      namespace: namespaceName,
      method: methodName,
      sdkKey: cap.sdk,
      route: 'mock'
    })
    return (async (): Promise<unknown> => {
      const ctx = getMockCtx()
      await ctx.delay()
      // 单参能力直接传 args[0]；零参能力传 undefined（mockHandler 的 req: void 接收 undefined）
      const req = args.length > 0 ? args[0] : undefined
      ctx.log(namespaceName, methodName, req)
      try {
        return await mockHandler(req as never, ctx)
      } catch (err) {
        throw normalizeToyError(err)
      }
    })()
  }

  // 2. 否则透传真实 SDK
  const sdk = getSdk()
  const fn = (sdk as unknown as Record<string, unknown>)[cap.sdk]
  if (typeof fn !== 'function') {
    throw new Error(`[bilibili-toy] window.toy.${cap.sdk} 不存在 —— 当前 Toy SDK 可能未实现该方法`)
  }

  // Toy host 元信息（toy id）注入存在 race condition：SDK 已挂在 window.toy
  // 上、但 host 还没把 toy id 传给运行时，调用就被 reject 成
  // "toy id not available on host"。这是 host 加载顺序问题，不是业务错误，
  // 几百毫秒内自动恢复 —— 在透传层做短期退避（200 → 400 → 800ms），避免
  // 一进页面就同时 reject getCloudStorage / getRankList / getMyRank 等。
  return invokeWithHostBackoff(() => (fn as (...a: unknown[]) => unknown).apply(sdk, args))
}

// ────────────────────────────────────────────────────────────────────────
// Toy host 未就绪退避
// ────────────────────────────────────────────────────────────────────────

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
      if (!isToyHostNotReady(err)) throw err
      if (attempt === backoffMs.length) break
      await sleep(backoffMs[attempt])
    }
  }
  throw lastError
}
