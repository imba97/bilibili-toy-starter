// filepath: src/lib/toy/retry.ts
//
// 云存储 / 排行榜按 Toy 共享额度限流，超限 reject：
//   error.type === 'http_error' && error.code === 307044
// 原样立即重试会把偶发限流放大成持续限流（content-checklist §7-5），
// 这里统一做指数退避。阈值不对外公开且线上可调 —— 不要写死数字做本地节流。

import { isToyError } from './types'

export const RATE_LIMIT_CODE = 307044

export function isRateLimited(error: unknown): boolean {
  return isToyError(error) && error.type === 'http_error' && error.code === RATE_LIMIT_CODE
}

export interface RetryOptions {
  /** 最大尝试次数（含首次），默认 3 */
  maxAttempts?: number
  /** 首次退避毫秒数，之后翻倍。默认 1000 */
  baseDelayMs?: number
  /** 命中限流时的回调（用于给玩家提示） */
  onRateLimited?: (attempt: number) => void
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * 带 307044 指数退避的调用封装。非限流错误直接抛出，不重试。
 * 退避次数用尽仍限流时，抛出最后一次的错误交由调用方提示。
 */
export async function withRateLimitRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxAttempts = 3, baseDelayMs = 1000, onRateLimited } = options
  let lastError: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (!isRateLimited(error) || attempt === maxAttempts) throw error
      onRateLimited?.(attempt)
      await sleep(baseDelayMs * 2 ** (attempt - 1))
    }
  }
  throw lastError
}
