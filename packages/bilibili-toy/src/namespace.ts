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

import type { Capability, CapabilityBuilder, MockHandler, AwaitedPromise } from './types'
import { isProd } from './env'
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
 * - `Resp` 由 `.mock(h)` 的 `Awaited<ReturnType<H>>` 推导并回填到 *新* builder。
 *   也就是说 `.mock(h)` 之后拿到的新 builder 类型上 Resp 已经是推导后的具体类型，
 *   namespace 方法签名随即变成 `(req: Req) => Promise<Resp>`，消费方拿到的就是精确类型
 *   （如 `rank.list` 返回 `Promise<RankItem[]>`）。
 * - 原 builder（`.mock(h)` 调用前的那个）Resp 仍是 `unknown`：此时 namespace 方法签名
 *   是 `(req: Req) => Promise<unknown>`，调用方需断言。设计意图是「不能跳过 mock 注册」——
 *   必须先 .mock(h) 才能拿到精确类型。
 * - `ctx` 永远是 `MockCtx`，handler 内可用 store / mockUserId / delay() / log() 等
 * - 业务侧 `override(key).mock(h)` 会原地替换默认 handler，优先级最高
 *
 * 实现要点：`.mock(h)` 必须返回一个 *新* 对象，因为 TypeScript 的 CapabilityBuilder
 * 接口把 Resp 放在泛型里；同一对象上换 Resp 不会改变外部拿到的类型（外部拿到的是原
 * builder 的类型实例）。
 */
export function defineCapability<Req = void>(sdk: string): CapabilityBuilder<Req, unknown> {
  // builder 实例只挂 sdk / mock：handler 闭包变量不被新 builder 共享，
  // 因此下面 buildCapabilityProxy 拿不到。改用 attached-state 模式：
  // 让每个 builder 实例自己持有 handler，新 builder 复制旧 handler 引用。
  const handlerSlot: { current: MockHandler<Req> | undefined } = { current: undefined }
  const makeBuilder = <R>(): CapabilityBuilder<Req, R> => {
    const b = {
      sdk,
      mock<R>(
        h: (req: Req, ctx: import('./types').MockCtx) => R
      ): CapabilityBuilder<Req, Awaited<R>> {
        handlerSlot.current = h
        return makeBuilder<Awaited<R>>()
      }
    } as CapabilityBuilder<Req, R>
    // 路由层读 _getMock() 取 handler；enumerable:false 避免泄漏到 JSON 序列化
    Object.defineProperty(b, '_getMock', {
      value: (): MockHandler<Req> | undefined => handlerSlot.current,
      enumerable: false
    })
    return b
  }
  return makeBuilder<unknown>()
}

/**
 * 从 CapabilityBuilder<Req, Resp> 推出 namespace 方法签名：
 *   - Req = void      → (req?: void) => AwaitedPromise<Resp>
 *   - Req = T         → (req: T) => AwaitedPromise<Resp>
 * 两者都被展开为统一形式 `(req?: Req) => AwaitedPromise<Resp>`：
 *   - Req = void      → `(req?: void) => ...` → 调用方 `f()` 不传参（void 作可省参数合法）
 *   - Req = T         → `(req?: T) => ...` → 调用方可选传，与 ToySDK 官方 `req?: T` 对齐
 * 即使 ToySDK 官方声明 Req 必填，SDK 层统一把参数放宽为可选 —— 调用方想传就传、不传也行，
 * mock handler 自己处理 `req` 为 undefined 的兜底逻辑（默认 mock 都做了）。
 */
type CapabilityMethod<B extends CapabilityBuilder<any, any>> =
  B extends CapabilityBuilder<infer Req, infer Resp> ? (req?: Req) => AwaitedPromise<Resp> : never

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
 * - 每个方法签名从 `CapabilityBuilder<Req, Resp>` 推导为 `(req: Req) => Promise<Awaited<Resp>>`，
 *   消费方 `await rank.list()` / `await user.profile()` 直接拿到具体业务类型
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
  readonly [K in keyof B]: CapabilityMethod<B[K]>
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
    readonly [K in keyof B]: CapabilityMethod<B[K]>
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
      // dev-only 友好提示：误把方法当 getter 用（比如 `rank.submit`）不要直接抛错，
      // 避免 `console.log(rank.submit)` / 调试器展开时炸日志窗口。dev 模式给 warn，
      // 生产静默返回 undefined（沿用 Proxy 默认行为）。
      if (!isProd) {
        // eslint-disable-next-line no-console
        console.warn(
          `[bilibili-toy] ${namespaceName}.${methodName} 不是可读属性（按 method 调用，如 ${namespaceName}.${methodName}()）`
        )
      }
      return undefined
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
        // mock 路径强制归一：mock handler 是业务代码，抛出的 Error
        // 不一定带 ToySDK 前缀；统一加 [bilibili-toy] 前缀便于业务侧识别
        // 「这是 SDK 链路里的错误」并定位 namespace.method。
        const wrapped = normalizeToyError(err)
        if (wrapped instanceof Error && !wrapped.message.startsWith('[bilibili-toy]')) {
          wrapped.message = `[bilibili-toy] ${namespaceName}.${methodName} mock handler 抛错: ${wrapped.message}`
        }
        throw wrapped
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
