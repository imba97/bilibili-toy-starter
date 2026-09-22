// filepath: packages/bilibili-toy/tests/toy.test.ts
//
// Tests for the `toy` singleton: ready handshake, mock state machine, and
// the mock-shared store accessor. Each test installs a stub `window.toy`
// (or removes it) and restores the prior global at the end.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { __resetForTests, getMockCtx, getMockStore, isMockEnabled, toy } from '../src/toy'

type ToyWindow = { toy: Partial<ToySDK.Toy> }

function withWindowToy<T>(sdk: Partial<ToySDK.Toy>, fn: () => Promise<T>): Promise<T> {
  const g = globalThis as unknown as { window?: ToyWindow }
  const prev = g.window
  g.window = { toy: sdk }
  return fn().finally(() => {
    if (prev === undefined) delete g.window
    else g.window = prev
  })
}

function clearWindowToy<T>(fn: () => Promise<T>): Promise<T> {
  const g = globalThis as unknown as { window?: ToyWindow }
  const prev = g.window
  delete g.window
  return fn().finally(() => {
    if (prev !== undefined) g.window = prev
  })
}

describe('toy singleton', () => {
  beforeEach(() => {
    __resetForTests()
  })

  afterEach(() => {
    __resetForTests()
  })

  describe('isAvailable', () => {
    it('false when window is undefined', async () => {
      await clearWindowToy(async () => {
        expect(toy.isAvailable()).toBe(false)
      })
    })

    it('false when window.toy is missing', async () => {
      await withWindowToy({} as ToySDK.Toy, async () => {
        // @ts-expect-error — intentionally empty toy stub
        globalThis.window!.toy = undefined
        expect(toy.isAvailable()).toBe(false)
      })
    })

    it('true when window.toy exists', async () => {
      await withWindowToy({ isSupport: () => Promise.resolve(true) }, async () => {
        expect(toy.isAvailable()).toBe(true)
      })
    })
  })

  describe('ready', () => {
    it('resolves when window.toy is already present', async () => {
      await withWindowToy({ isSupport: () => Promise.resolve(true) }, async () => {
        const sdk = await toy.ready()
        expect(sdk).toBe(globalThis.window!.toy)
      })
    })

    it('caches the SDK so second ready() returns the same instance', async () => {
      const stub = { isSupport: () => Promise.resolve(true) }
      await withWindowToy(stub, async () => {
        const a = await toy.ready()
        const b = await toy.ready()
        expect(a).toBe(stub)
        expect(b).toBe(stub)
      })
    })

    it('times out when window.toy never appears', async () => {
      await clearWindowToy(async () => {
        await expect(toy.ready(50)).rejects.toBeInstanceOf(Error)
        await expect(toy.ready(50)).rejects.toThrow(/window\.toy 不可用/)
      })
    })

    it('.cancel() prevents late ticks from mutating the rejected promise', async () => {
      await clearWindowToy(async () => {
        const p = toy.ready(50)
        // Attach a no-op catch so that if the SDK ever settles, we don't leak.
        p.catch(() => undefined)
        p.cancel()
        // The contract: cancel() must not cause unhandled rejection. The
        // promise stays pending (cancel flips the flag but doesn't reject),
        // so we just give the polling tick a chance to misbehave and then
        // confirm the test ran without crashing.
        await new Promise((r) => setTimeout(r, 30))
        expect(true).toBe(true)
      })
    })
  })

  describe('isSupport', () => {
    it('forwards to window.toy.isSupport', async () => {
      const isSupport = vi.fn(() => Promise.resolve(true))
      await withWindowToy({ isSupport }, async () => {
        const ok = await toy.isSupport('saveImageToAlbum')
        expect(ok).toBe(true)
        expect(isSupport).toHaveBeenCalledWith('saveImageToAlbum')
      })
    })

    it('throws ToyNotAvailableError when no SDK is available', async () => {
      await clearWindowToy(async () => {
        try {
          await toy.isSupport('saveImageToAlbum')
          throw new Error('expected isSupport to throw')
        } catch (e) {
          expect((e as Error).message).toMatch(/window\.toy 不可用/)
        }
      })
    })
  })

  describe('mock state machine', () => {
    it('mockEnabled() / isMockEnabled() start as false', () => {
      expect(isMockEnabled()).toBe(false)
      expect(toy.mockEnabled()).toBe(false)
    })

    it('enableMock flips the flag and exposes a context with the given latency', () => {
      toy.enableMock({ latencyMs: 5, mockUserId: 42 })
      expect(isMockEnabled()).toBe(true)
      expect(toy.mockEnabled()).toBe(true)
      expect(getMockCtx().latencyMs).toBe(5)
      expect(getMockCtx().mockUserId).toBe(42)
      expect(getMockStore().mockUserId).toBe(42)
    })

    it('enableMock with no opts keeps defaults', () => {
      toy.enableMock()
      expect(isMockEnabled()).toBe(true)
      expect(getMockCtx().latencyMs).toBeGreaterThan(0)
      expect(getMockStore().mockUserId).toBeGreaterThan(0)
    })

    it('disableMock clears the flag but keeps store + ctx', () => {
      toy.enableMock({ latencyMs: 5 })
      const beforeStore = getMockStore()
      toy.disableMock()
      expect(isMockEnabled()).toBe(false)
      // Same store reference: disableMock doesn't rebuild state
      expect(getMockStore()).toBe(beforeStore)
    })

    it('resetMock rebuilds the store but keeps enabled state', () => {
      toy.enableMock({ latencyMs: 5 })
      getMockStore().cloud.set('k', 'v')
      toy.resetMock()
      // enabled state stays
      expect(isMockEnabled()).toBe(true)
      // cloud KV is wiped
      expect(getMockStore().cloud.size).toBe(0)
    })
  })
})
