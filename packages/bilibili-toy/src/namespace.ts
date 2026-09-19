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
 *
 * 调用 `rank.submit({ score })` 时：
 *   1. Proxy 拦截 `submit` 访问
 *   2. 通过 bindings 找到 ToySDK 方法名 `submitScore`
 *   3. 调用 `getSdk().submitScore(...)`
 *   4. Promise reject 时统一过 normalizeToyError
 */
export function createNamespace<T extends object>(bindings: Record<keyof T, keyof ToySDK.Toy>): T {
  return new Proxy({} as T, {
    get(_target, prop: string) {
      const sdkMethod = bindings[prop as keyof T]
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
