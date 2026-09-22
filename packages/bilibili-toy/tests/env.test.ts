// filepath: packages/bilibili-toy/tests/env.test.ts
//
// Tests for the platform-agnostic environment helpers (`detectToy`, `isProd`).
//
// `detectToy` only resolves a value when `window` exists; on Node it's null.
// `isProd` is a build-time constant, but the file still imports it so we get
// coverage that the export is callable and non-throwing in this environment.

import { describe, expect, it } from 'vite-plus/test'
import { detectToy, isProd } from '../src/env'

describe('detectToy', () => {
  it('returns null in Node (no `window`)', () => {
    expect(detectToy()).toBeNull()
  })

  it('returns window.toy when present', () => {
    const stub = { hello: () => 'world' }
    const g = globalThis as unknown as { window?: { toy?: unknown } }
    const prev = g.window
    g.window = { toy: stub }
    try {
      expect(detectToy()).toBe(stub)
    } finally {
      if (prev === undefined) delete g.window
      else g.window = prev
    }
  })

  it('returns null when window exists but window.toy is undefined', () => {
    const g = globalThis as unknown as { window?: { toy?: unknown } }
    const prev = g.window
    g.window = {}
    try {
      expect(detectToy()).toBeNull()
    } finally {
      if (prev === undefined) delete g.window
      else g.window = prev
    }
  })
})

describe('isProd', () => {
  it('is a boolean', () => {
    expect(typeof isProd).toBe('boolean')
  })
})
