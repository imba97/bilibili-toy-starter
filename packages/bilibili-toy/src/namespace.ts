// filepath: packages/bilibili-toy/src/namespace.ts
//
// namespace 工厂 —— 用 Proxy 把 namespace 方法动态转发到 window.toy 的同名方法。
//
// 每个 namespace 文件只需要 ~6 行：
//   export const rank = createNamespace({
//     submit: 'submitScore',
//     list: 'getRankList',
//     me: 'getMyRank'
//   } as const)
//
// 新增 SDK 方法时只改对应 namespace 文件，不需要碰这里。

import { getSdk } from './toy'
import { normalizeToyError } from './error'

/** 判断值是不是 Promise-like（ToySDK 大部分方法返回 Promise，少数同步） */
const isPromiseLike = (v: unknown): v is PromiseLike<unknown> =>
  typeof v === 'object' && v !== null && 'then' in v && typeof (v as any).then === 'function'

/**
 * 通用 namespace 工厂。
 *
 * @param bindings namespace 内部方法名 → ToySDK.Toy 的方法名映射
 *            必须 `as const`，让 TS 把值识别为字面量类型。
 *
 * 调用 `rank.submit({ score })` 时：
 *   1. Proxy 拦截 `submit` 访问
 *   2. 通过 bindings 找到 ToySDK 方法名 `submitScore`
 *   3. 调用 `getSdk().submitScore(...)`
 *   4. Promise reject 时统一过 normalizeToyError
 *
 * 类型：bindings 每个值的字面量类型（SDK 方法名）会映射到
 * `ToySDK.Toy` 上对应方法的签名。返回类型的形状是：
 *   { [K in keyof Bindings]: ToySDK.Toy[Bindings[K]] }
 * 例如 `{ submit: 'submitScore' }` 让 `submit` 自动具备
 * `(req: SubmitScoreReq) => Promise<SubmitScoreResp>` 的签名。
 */
export function createNamespace<B extends Record<string, keyof ToySDK.Toy>>(
  bindings: B
): {
  [K in keyof B]: ToySDK.Toy[B[K]]
} {
  return new Proxy({} as { [K in keyof B]: ToySDK.Toy[B[K]] }, {
    get(_target, prop: string) {
      const sdkMethod = bindings[prop as keyof B]
      if (!sdkMethod) {
        throw new Error(`[bilibili-toy] unknown namespace method: ${String(prop)}`)
      }

      // 每次调用都通过 getSdk() 拿 —— 保证 ready() 后才允许调用
      const sdk = getSdk()
      const fn = (sdk as unknown as Record<string, unknown>)[sdkMethod as string]
      if (typeof fn !== 'function') return fn

      return (...args: unknown[]) => {
        try {
          const ret = (fn as (...a: unknown[]) => unknown).apply(sdk, args)
          // ToySDK 大部分方法返回 Promise，reject 统一过 normalizeToyError
          if (isPromiseLike(ret)) {
            return ret.then(undefined, (err: unknown) => {
              throw normalizeToyError(err)
            })
          }
          return ret
        } catch (err) {
          throw normalizeToyError(err)
        }
      }
    }
  })
}
