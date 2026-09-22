// filepath: packages/bilibili-toy/tests/mock/ctx.test.ts
//
// Tests for `createMockCtx`: store aliasing, delay() timing, and log() output.
//
// Latency is kept small (1ms) for the timing test; logging is verified via
// `console.log` spies which we restore after each test.

import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { createMockCtx } from '../../src/mock/ctx'
import { createMockStore } from '../../src/mock/store'

describe('createMockCtx', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('aliases the store + mockUserId', () => {
    const store = createMockStore()
    const ctx = createMockCtx({ store })
    expect(ctx.store).toBe(store)
    expect(ctx.mockUserId).toBe(store.mockUserId)
  })

  it('uses DEFAULT_LATENCY_MS (~80) when latencyMs not given', () => {
    const ctx = createMockCtx({ store: createMockStore() })
    expect(ctx.latencyMs).toBe(80)
  })

  it('honours custom latencyMs', () => {
    const ctx = createMockCtx({ store: createMockStore(), latencyMs: 250 })
    expect(ctx.latencyMs).toBe(250)
  })

  it('delay() actually waits approximately latencyMs', async () => {
    const ctx = createMockCtx({ store: createMockStore(), latencyMs: 10 })
    const t0 = Date.now()
    await ctx.delay()
    expect(Date.now() - t0).toBeGreaterThanOrEqual(8)
  })

  it('log() prints namespace.method + req', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const ctx = createMockCtx({ store: createMockStore() })
    ctx.log('rank', 'submit', { score: 7 })
    expect(spy).toHaveBeenCalledTimes(1)
    expect(String(spy.mock.calls[0]?.[0])).toBe('[toy:mock] rank.submit req={"score":7}')
  })

  it('log() omits req segment when req is undefined', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const ctx = createMockCtx({ store: createMockStore() })
    ctx.log('user', 'profile')
    expect(String(spy.mock.calls[0]?.[0])).toBe('[toy:mock] user.profile')
  })

  it('log() prints resp on a second line when provided', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const ctx = createMockCtx({ store: createMockStore() })
    ctx.log('rank', 'submit', { score: 1 }, { score: 1 })
    expect(spy).toHaveBeenCalledTimes(2)
    expect(String(spy.mock.calls[1]?.[0])).toMatch(/→/)
  })

  it('log() survives circular refs without throwing', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const ctx = createMockCtx({ store: createMockStore() })
    const obj: Record<string, unknown> = {}
    obj.self = obj
    expect(() => ctx.log('rank', 'submit', obj)).not.toThrow()
    expect(spy).toHaveBeenCalledTimes(1)
  })
})
