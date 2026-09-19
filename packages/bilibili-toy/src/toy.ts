// filepath: packages/bilibili-toy/src/toy.ts
//
// toy 单例 —— 提供 ready / isAvailable / isSupport 等"对 toy 平台本身"的操作。
//
// 设计：
//   - ready() 是握手入口：探测 window.toy 出现，超时抛 ToyNotAvailableError
//   - 不做任何 mock 或 fallback；不可用就抛错，业务侧自己决定提示什么
//   - namespace 转发时通过 getSdk() 拿单例，避免每次访问都走 Proxy 探测

import { detectToy } from './env'
import { ToyNotAvailableError } from './error'

let cachedSdk: ToySDK.Toy | null = null
let readyPromise: Promise<ToySDK.Toy> | null = null

/** 等 window.toy 出现并缓存。超时抛 ToyNotAvailableError。 */
function waitForToy(timeoutMs: number, onTimeout: () => void): Promise<ToySDK.Toy> {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    const tick = () => {
      const sdk = detectToy()
      if (sdk) {
        cachedSdk = sdk
        resolve(sdk)
        return
      }
      if (Date.now() - start > timeoutMs) {
        onTimeout()
        reject(new ToyNotAvailableError())
        return
      }
      setTimeout(tick, 100)
    }
    tick()
  })
}

/** 内部用：拿已 ready 的 SDK 单例。未 ready 抛 ToyNotAvailableError。 */
export function getSdk(): ToySDK.Toy {
  const sdk = cachedSdk ?? detectToy()
  if (!sdk) throw new ToyNotAvailableError()
  return sdk
}

/**
 * 顶层 namespace —— 平台本身的能力。
 * 8 个 namespace（rank / cloud / user / ...）从 namespaces/ 单独导出。
 */
export const toy = {
  /** 探测 window.toy 是否存在（同步，不等待） */
  isAvailable: (): boolean => detectToy() !== null,

  /**
   * 等待 window.toy 出现并缓存。多次调用共用同一个 Promise。
   * 超时抛 ToyNotAvailableError。默认超时 5000ms。
   *
   * 超时后会清空内部缓存 —— 下一次调用 ready() 会重新探测，
   * 避免拿到永远 reject 的同一个 Promise。
   */
  ready: (timeoutMs = 5000): Promise<ToySDK.Toy> => {
    if (cachedSdk) return Promise.resolve(cachedSdk)
    readyPromise ??= waitForToy(timeoutMs, () => {
      // 超时清空缓存，让后续 ready() 重新探测。
      readyPromise = null
      cachedSdk = null
    }).catch((err) => {
      readyPromise = null
      throw err
    })
    return readyPromise
  },

  /** Toy 平台是否支持某个能力（透传官方 isSupport） */
  isSupport: (ability: string): Promise<boolean> => getSdk().isSupport(ability)
}
