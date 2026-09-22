// filepath: packages/bilibili-toy/tests/mock/store.test.ts
//
// Tests for the mock shared store + localStorage roundtrip.
//
// Each test backs up and restores `globalThis.localStorage` so we never leak
// stub state between cases. We also exercise the LS error paths (quota /
// disabled storage) by replacing `setItem` with a throwing impl.

import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test'
import {
  MOCK_DEFAULT_USER_ID,
  clearPersistedMock,
  createMockStore,
  persistCloud
} from '../../src/mock/store'

type LS = {
  getItem: (k: string) => string | null
  setItem: (k: string, v: string) => void
  removeItem: (k: string) => void
}

function makeMemoryLS(
  initial: Record<string, string> = {}
): LS & { _data: Record<string, string> } {
  const data: Record<string, string> = { ...initial }
  return {
    _data: data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = v
    },
    removeItem: (k) => {
      delete data[k]
    }
  }
}

function installLS(ls: LS): void {
  Object.defineProperty(globalThis, 'localStorage', {
    value: ls,
    configurable: true,
    writable: true
  })
}

function uninstallLS(): void {
  Reflect.deleteProperty(globalThis, 'localStorage')
}

describe('MOCK_DEFAULT_USER_ID', () => {
  it('is a positive integer', () => {
    expect(MOCK_DEFAULT_USER_ID).toBeGreaterThan(0)
    expect(Number.isInteger(MOCK_DEFAULT_USER_ID)).toBe(true)
  })
})

describe('createMockStore', () => {
  beforeEach(() => {
    installLS(makeMemoryLS())
  })
  afterEach(() => {
    uninstallLS()
  })

  it('returns an empty cloud KV when LS has nothing', () => {
    const s = createMockStore()
    expect(s.cloud.size).toBe(0)
    expect(s.mockUserId).toBe(MOCK_DEFAULT_USER_ID)
  })

  it('hydrates cloud KV from LS', () => {
    installLS(makeMemoryLS({ 'bilibili-toy:mock:cloud': '{"k1":"v1","k2":"v2"}' }))
    const s = createMockStore()
    expect(s.cloud.get('k1')).toBe('v1')
    expect(s.cloud.get('k2')).toBe('v2')
    expect(s.cloud.size).toBe(2)
  })

  it('treats corrupt LS JSON as empty', () => {
    installLS(makeMemoryLS({ 'bilibili-toy:mock:cloud': 'not-json' }))
    const s = createMockStore()
    expect(s.cloud.size).toBe(0)
  })
})

describe('persistCloud', () => {
  beforeEach(() => {
    installLS(makeMemoryLS())
  })
  afterEach(() => {
    uninstallLS()
  })

  it('round-trips a Map through LS as JSON', () => {
    const ls = (globalThis as unknown as { localStorage: LS }).localStorage
    const cloud = new Map<string, string>([
      ['a', '1'],
      ['b', '2']
    ])
    persistCloud(cloud)
    expect(ls.getItem('bilibili-toy:mock:cloud')).toBe('{"a":"1","b":"2"}')
  })

  it('silently ignores LS setItem quota errors', () => {
    installLS({
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceeded')
      },
      removeItem: () => {}
    })
    const cloud = new Map<string, string>([['a', '1']])
    expect(() => persistCloud(cloud)).not.toThrow()
  })
})

describe('clearPersistedMock', () => {
  beforeEach(() => {
    installLS(makeMemoryLS())
  })
  afterEach(() => {
    uninstallLS()
  })

  it('removes the cloud LS key', () => {
    const ls = (globalThis as unknown as { localStorage: LS & { _data: Record<string, string> } })
      .localStorage
    ls.setItem('bilibili-toy:mock:cloud', '{"x":"y"}')
    expect(ls._data['bilibili-toy:mock:cloud']).toBeDefined()
    clearPersistedMock()
    expect(ls._data['bilibili-toy:mock:cloud']).toBeUndefined()
  })

  it('silently ignores LS removeItem errors', () => {
    installLS({
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {
        throw new Error('disabled')
      }
    })
    expect(() => clearPersistedMock()).not.toThrow()
  })
})
