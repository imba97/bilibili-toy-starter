// filepath: src/components/Hello.test.ts
//
// Smoke test for the starter. Edit / delete freely — this is here only to
// prove `vp test` works out of the box.

import { describe, expect, it } from 'vitest'

describe('starter smoke test', () => {
  it('runs vitest', () => {
    expect(1 + 1).toBe(2)
  })

  it('exposes the Toy-friendly B 站 colour', () => {
    const bilibiliPink = '#fb7299'
    expect(bilibiliPink).toMatch(/^#[0-9a-f]{6}$/i)
  })
})
