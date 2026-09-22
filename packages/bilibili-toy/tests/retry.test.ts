// filepath: packages/bilibili-toy/tests/retry.test.ts
//
// Tests for the generic exponential-backoff wrapper (`withRetry`) and the
// retry-classifier helper (`isRetryableError`). Vitest fake timers are NOT
// used here — instead the test invokes `withRetry` with a tiny `baseDelayMs`
// so the suite stays fast and timing-stable.

import { describe, expect, it, vi } from 'vite-plus/test'
import { isRetryableError, withRetry } from '../src/retry'

describe('isRetryableError', () => {
  it('retries ToyDataStatus === unavailable', () => {
    expect(isRetryableError({ status: 'unavailable' })).toBe(true)
  })

  it('does NOT retry other ToyDataStatus values', () => {
    for (const status of [
      'ok',
      'denied',
      'unauthorized',
      'unsupported',
      'partial',
      'author_mismatch',
      'video_not_found',
      'video_invisible',
      'toy_context_unavailable',
      'invalid_argument'
    ]) {
      expect(isRetryableError({ status })).toBe(false)
    }
  })

  it('false on non-Toy errors', () => {
    expect(isRetryableError(new Error('boom'))).toBe(false)
    expect(isRetryableError(null)).toBe(false)
    expect(isRetryableError(undefined)).toBe(false)
    expect(isRetryableError('unavailable')).toBe(false)
  })

  it('false on Toy-shaped errors without status', () => {
    // type+code envelope: not retryable per ToyDataStatus rule
    expect(isRetryableError({ type: 'http_error', code: 500 })).toBe(false)
    // media error name only
    expect(isRetryableError({ name: 'BusinessDenied' })).toBe(false)
  })
})

describe('withRetry', () => {
  it('returns the value on first success', async () => {
    const fn = vi.fn(() => Promise.resolve('ok'))
    await expect(withRetry(fn)).resolves.toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries up to maxAttempts on retryable errors and eventually returns', async () => {
    let calls = 0
    const fn = vi.fn(() => {
      calls += 1
      if (calls < 3) return Promise.reject({ status: 'unavailable' })
      return Promise.resolve('finally')
    })
    await expect(withRetry(fn, { maxAttempts: 3, baseDelayMs: 1 })).resolves.toBe('finally')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('does NOT retry non-retryable errors and throws immediately', async () => {
    const fn = vi.fn(() => Promise.reject({ status: 'denied' }))
    await expect(withRetry(fn, { maxAttempts: 5, baseDelayMs: 1 })).rejects.toEqual({
      status: 'denied'
    })
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('throws the last error when retries are exhausted', async () => {
    const fn = vi.fn(() => Promise.reject({ status: 'unavailable', attempt: true }))
    await expect(withRetry(fn, { maxAttempts: 3, baseDelayMs: 1 })).rejects.toEqual({
      status: 'unavailable',
      attempt: true
    })
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('respects custom shouldRetry', async () => {
    let calls = 0
    const fn = vi.fn(() => {
      calls += 1
      if (calls < 2) return Promise.reject({ custom: true })
      return Promise.resolve('ok')
    })
    const shouldRetry = (e: unknown): boolean =>
      typeof e === 'object' && e !== null && 'custom' in (e as Record<string, unknown>)
    await expect(withRetry(fn, { maxAttempts: 3, baseDelayMs: 1, shouldRetry })).resolves.toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('wraps synchronous throws via Promise rejection path', async () => {
    const fn = vi.fn(() => Promise.reject(new Error('sync-throw')))
    await expect(withRetry(fn, { maxAttempts: 2, baseDelayMs: 1 })).rejects.toThrow('sync-throw')
    expect(fn).toHaveBeenCalledTimes(1) // non-retryable → single attempt
  })

  it('default maxAttempts is 3', async () => {
    const fn = vi.fn(() => Promise.reject({ status: 'unavailable' }))
    await expect(withRetry(fn, { baseDelayMs: 1 })).rejects.toEqual({ status: 'unavailable' })
    expect(fn).toHaveBeenCalledTimes(3)
  })
})
