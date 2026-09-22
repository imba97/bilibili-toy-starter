// filepath: packages/bilibili-toy/src/retry.ts
//
// 通用指数退避工具。
//
// SDK 命名空间方法不内置 retry —— 业务侧按需用 withRetry(() => toy.cloud.get(...))
// 显式 wrap。SDK 只提供一个"按 ToyDataStatus 判定是否需要重试"的判定函数，
// 默认只对 `unavailable` 触发退避；`unauthorized` / `denied` / `partial` 等
// 业务可恢复的状态不重试。

import { isToyError, type ToyErrorLike } from './error'

/** 触发自动重试的状态集合 */
export const RETRY_STATUSES: ReadonlySet<ToySDK.ToyDataStatus> = new Set(['unavailable'])

/** 默认只对 ToyDataStatus === 'unavailable' 触发 */
export function isRetryableError(err: unknown): boolean {
  if (!isToyError(err)) return false
  const status = (err as ToyErrorLike).status
  return status !== undefined && RETRY_STATUSES.has(status)
}

export interface RetryOptions {
  /** 最大尝试次数（含首次），默认 3 */
  maxAttempts?: number
  /** 首次退避毫秒数，之后翻倍。默认 1000 */
  baseDelayMs?: number
  /** 自定义重试判定（默认 isRetryableError） */
  shouldRetry?: (err: unknown) => boolean
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * 通用指数退避包装。
 *   - 默认只对 `ToyDataStatus === 'unavailable'` 触发退避
 *   - 用尽仍命中时，把最后一次的错误抛给调用方
 *   - 不命中时，原错误原样向上抛
 *
 * ⚠️ **写操作副作用警告**：
 * 默认重试对读操作是安全的；对写操作（`cloud.set` / `cloud.remove` /
 * `rank.submit`）直接套 `withRetry` 可能在 RPC 已经落库但响应超时时被
 * 重投，造成计数翻倍 / KV 错乱。需要重试请：
 *   - 自定义 `shouldRetry` 严格控制重试条件
 *   - 或在调用方做幂等性保护（如 KV 用 `setIfAbsent` 语义）
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { maxAttempts = 3, baseDelayMs = 1000, shouldRetry = isRetryableError } = options

  let lastError: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (!shouldRetry(error) || attempt === maxAttempts) throw error
      await sleep(baseDelayMs * 2 ** (attempt - 1))
    }
  }
  throw lastError
}
