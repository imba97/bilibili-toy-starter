// filepath: packages/bilibili-toy/tests/error.test.ts
//
// Tests for the Toy SDK error helpers: classification, normalisation, formatting,
// denial detection, and host-not-ready detection.
//
// Pure functions — no `window.toy` stub needed. Covers all three SDK error shapes
// (status / code+type / name) plus the cross-cutting helpers.

import { describe, expect, it } from 'vite-plus/test'
import {
  ToyNotAvailableError,
  formatToyError,
  isDeniedError,
  isToyError,
  isToyHostNotReady,
  normalizeToyError,
  toErrorMessage
} from '../src/error'

describe('ToyNotAvailableError', () => {
  it('is an Error subclass with the SDK prefix', () => {
    const err = new ToyNotAvailableError()
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(ToyNotAvailableError)
    expect(err.name).toBe('ToyNotAvailableError')
    expect(err.message).toMatch(/^\[bilibili-toy\]/)
  })
})

describe('normalizeToyError', () => {
  it('returns ToyNotAvailableError untouched (identity)', () => {
    const err = new ToyNotAvailableError()
    expect(normalizeToyError(err)).toBe(err)
  })

  it('returns Error already prefixed with [bilibili-toy] as-is', () => {
    const err = new Error('[bilibili-toy] keep me')
    expect(normalizeToyError(err)).toBe(err)
  })

  it('rewraps [ToySDK] Error under [bilibili-toy] prefix and copies status/code/type', () => {
    const original = new Error('[ToySDK] something broke') as Error & {
      status?: string
      code?: number
      type?: string
    }
    original.status = 'denied'
    original.code = 401
    original.type = 'http_error'

    const wrapped = normalizeToyError(original) as Error & {
      status?: string
      code?: number
      type?: string
    }

    expect(wrapped).not.toBe(original)
    expect(wrapped.message.startsWith('[bilibili-toy] [ToySDK]')).toBe(true)
    expect(wrapped.status).toBe('denied')
    expect(wrapped.code).toBe(401)
    expect(wrapped.type).toBe('http_error')
  })

  it('keeps the original name when wrapping', () => {
    const original = Object.assign(new Error('[ToySDK] boom'), { name: 'NotAllowedError' })
    const wrapped = normalizeToyError(original) as Error
    expect(wrapped.name).toBe('NotAllowedError')
  })

  it('returns plain Error as-is (no [bilibili-toy] / [ToySDK] prefix)', () => {
    const err = new Error('random')
    expect(normalizeToyError(err)).toBe(err)
  })

  it('wraps non-Error values into Error', () => {
    expect(normalizeToyError('oops')).toBeInstanceOf(Error)
    expect((normalizeToyError('oops') as Error).message).toBe('oops')
    expect(normalizeToyError(42).message).toBe('42')
    expect(normalizeToyError(null).message).toBe('null')
    expect(normalizeToyError(undefined).message).toBe('undefined')
    expect(normalizeToyError({ code: 1 }).message).toBe('[object Object]')
  })

  it('omits copy of type/code/status when they are undefined on the original', () => {
    const original = new Error('[ToySDK] plain')
    const wrapped = normalizeToyError(original) as Error & {
      status?: unknown
      code?: unknown
      type?: unknown
    }
    expect(wrapped.status).toBeUndefined()
    expect(wrapped.code).toBeUndefined()
    expect(wrapped.type).toBeUndefined()
  })
})

describe('isToyError', () => {
  it('true when status is a string', () => {
    expect(isToyError({ status: 'denied' })).toBe(true)
    expect(isToyError({ status: 'ok', data: {} })).toBe(true)
  })

  it('true when name is a non-empty string', () => {
    expect(isToyError({ name: 'BusinessDenied' })).toBe(true)
    expect(isToyError({ name: 'NotFoundError' })).toBe(true)
  })

  it('true when type + code are both present (legacy envelope)', () => {
    expect(isToyError({ type: 'http_error', code: 401 })).toBe(true)
  })

  it('false when only type without code', () => {
    expect(isToyError({ type: 'http_error' })).toBe(false)
  })

  it('false when only code without type', () => {
    expect(isToyError({ code: 500 })).toBe(false)
  })

  it('false when name is empty string', () => {
    expect(isToyError({ name: '' })).toBe(false)
  })

  it('false on null / non-objects / primitives', () => {
    expect(isToyError(null)).toBe(false)
    expect(isToyError(undefined)).toBe(false)
    expect(isToyError('error')).toBe(false)
    expect(isToyError(42)).toBe(false)
  })
})

describe('isDeniedError', () => {
  it('flags ToyDataStatus: denied', () => {
    expect(isDeniedError({ status: 'denied' })).toBe(true)
  })

  it('flags ToyDataStatus: unauthorized / unsupported', () => {
    expect(isDeniedError({ status: 'unauthorized' })).toBe(true)
    expect(isDeniedError({ status: 'unsupported' })).toBe(true)
  })

  it('does NOT flag ToyDataStatus: toy_context_unavailable (host race, not user denial)', () => {
    expect(isDeniedError({ status: 'toy_context_unavailable' })).toBe(false)
  })

  it('flags media error.name === BusinessDenied / NotAllowedError', () => {
    expect(isDeniedError({ name: 'BusinessDenied' })).toBe(true)
    expect(isDeniedError({ name: 'NotAllowedError' })).toBe(true)
  })

  it('does NOT flag other error.name values', () => {
    expect(isDeniedError({ name: 'NotFoundError' })).toBe(false)
    expect(isDeniedError({ name: 'AbortError' })).toBe(false)
  })

  it('false on non-Toy-error inputs', () => {
    expect(isDeniedError(null)).toBe(false)
    expect(isDeniedError(new Error('hi'))).toBe(false)
    expect(isDeniedError('denied')).toBe(false)
  })
})

describe('formatToyError / toErrorMessage', () => {
  it('prefers ToyError.message when present', () => {
    expect(formatToyError({ status: 'denied', message: 'no way' })).toBe('no way')
  })

  it('falls back to status when message absent', () => {
    expect(formatToyError({ status: 'unsupported' })).toBe('Toy 错误：unsupported')
  })

  it('falls back to name when status absent', () => {
    expect(formatToyError({ name: 'BusinessDenied' })).toBe('Toy 错误：BusinessDenied')
  })

  it('falls back to code when message / status / name absent', () => {
    expect(formatToyError({ type: 'http_error', code: 503 })).toBe('Toy 错误（503）')
  })

  it('returns Error.message for plain Errors', () => {
    expect(formatToyError(new Error('boom'))).toBe('boom')
  })

  it('returns String(err) for non-objects', () => {
    expect(formatToyError('plain')).toBe('plain')
  })

  it('toErrorMessage is an alias for formatToyError', () => {
    expect(toErrorMessage({ status: 'denied', message: 'x' })).toBe(
      formatToyError({ status: 'denied', message: 'x' })
    )
  })
})

describe('isToyHostNotReady', () => {
  it('matches the canonical message', () => {
    expect(isToyHostNotReady(new Error('[ToySDK] toy id not available on host'))).toBe(true)
  })

  it('matches even without [ToySDK] prefix', () => {
    expect(isToyHostNotReady(new Error('toy id not available on host'))).toBe(true)
  })

  it('does NOT match unrelated Toy errors', () => {
    expect(isToyHostNotReady(new Error('[ToySDK] unauthorized'))).toBe(false)
    expect(isToyHostNotReady(new Error('some other failure'))).toBe(false)
  })

  it('false on non-Error values', () => {
    expect(isToyHostNotReady('toy id not available on host')).toBe(false)
    expect(isToyHostNotReady(null)).toBe(false)
    expect(isToyHostNotReady({ message: 'toy id not available on host' })).toBe(false)
  })
})
