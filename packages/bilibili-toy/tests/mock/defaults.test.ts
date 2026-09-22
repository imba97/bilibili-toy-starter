// filepath: packages/bilibili-toy/tests/mock/defaults.test.ts
//
// Tests for every default mock handler in `mock/defaults.ts`. The contract:
// each handler must return a ToySDK-shaped empty response so the UI can render
// a fallback state instead of crashing. We don't exhaustively re-validate the
// ToySDK types here — we just assert the documented "shape" per handler.

import { describe, expect, it, vi } from 'vite-plus/test'
import {
  authorProfileDefault,
  authorRelationDefault,
  authorVideosDefault,
  cloudGetDefault,
  cloudRemoveDefault,
  cloudSetDefault,
  closeBrowserDefault,
  containerStateDefault,
  myRankDefault,
  navigateDefault,
  onContainerChangeDefault,
  qrCodeDefault,
  rankListDefault,
  saveImageDefault,
  setContainerModeDefault,
  shareDefault,
  submitScoreDefault,
  userProfileDefault,
  videoUserActionsDefault
} from '../../src/mock/defaults'

describe('share / navigate / qr / saveImage / closeBrowser defaults', () => {
  it('navigate: void + log', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    expect(() => navigateDefault({ type: 'video', id: 'BV1' })).not.toThrow()
    expect(spy).toHaveBeenCalled()
  })

  it('share: void + log', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    expect(() => shareDefault({ path: 'index.html' })).not.toThrow()
    expect(spy).toHaveBeenCalled()
  })

  it('qrCode: returns data URL + URL', () => {
    const r = qrCodeDefault({ path: 'index.html' })
    expect(r.base64.startsWith('data:image/png;base64,')).toBe(true)
    expect(typeof r.url).toBe('string')
    expect(r.url.length).toBeGreaterThan(0)
  })

  it('qrCode: defaults path to index.html when omitted', () => {
    const r = qrCodeDefault({})
    expect(r.base64.startsWith('data:image/png;base64,')).toBe(true)
  })

  it('saveImage: returns empty localPath + log', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const r = saveImageDefault({ url: 'https://example.com/x.png' })
    expect(r.localPath).toBe('')
    expect(spy).toHaveBeenCalled()
  })

  it('closeBrowser: void + log', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    expect(() => closeBrowserDefault()).not.toThrow()
    expect(spy).toHaveBeenCalled()
  })
})

describe('user / author / video defaults', () => {
  it('userProfile: returns anonymous placeholder', () => {
    const r = userProfileDefault()
    expect(r.avatar).toBe('')
    expect(r.nickname.length).toBeGreaterThan(0)
    expect(typeof r.toyOpenId).toBe('string')
  })

  it('authorProfile: status: unsupported', () => {
    expect(authorProfileDefault().status).toBe('unsupported')
  })

  it('authorVideos: status unsupported + empty items', () => {
    const r = authorVideosDefault()
    expect(r.status).toBe('unsupported')
    expect(Array.isArray(r.items)).toBe(true)
    expect(r.items.length).toBe(0)
  })

  it('authorRelation: status unsupported', () => {
    expect(authorRelationDefault().status).toBe('unsupported')
  })

  it('videoUserActions: status unsupported + empty items', () => {
    const r = videoUserActionsDefault({ aids: [1, 2] })
    expect(r.status).toBe('unsupported')
    expect(r.items).toEqual([])
  })
})

describe('rank defaults', () => {
  it('submitScore: returns score: 0', () => {
    expect(submitScoreDefault().score).toBe(0)
  })

  it('rankList: returns empty array', () => {
    expect(rankListDefault()).toEqual([])
  })

  it('myRank: ranked: false + rank 0 + score 0', () => {
    const r = myRankDefault()
    expect(r).toEqual({ ranked: false, rank: 0, score: 0 })
  })
})

describe('cloud defaults', () => {
  it('getCloudStorage: returns empty KV', () => {
    expect(cloudGetDefault()).toEqual({})
  })

  it('setCloudStorage: no return + log', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    expect(cloudSetDefault({ a: '1' })).toBeUndefined()
    expect(spy).toHaveBeenCalled()
  })

  it('removeCloudStorage: no return + log', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    expect(cloudRemoveDefault(['a', 'b'])).toBeUndefined()
    expect(spy).toHaveBeenCalled()
  })
})

describe('container defaults', () => {
  it('containerState: returns a ToyContainerState with empty changedFields', () => {
    const s = containerStateDefault()
    expect(s.changedFields).toEqual([])
    expect(typeof s.immersive).toBe('boolean')
    expect(typeof s.deviceType).toBe('string')
  })

  it('setContainerMode: no return + log', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    expect(setContainerModeDefault({ immersive: true })).toBeUndefined()
    expect(spy).toHaveBeenCalled()
  })

  it('onContainerChange: returns a noop unsubscribe', () => {
    const off = onContainerChangeDefault()
    expect(typeof off).toBe('function')
    expect(() => off()).not.toThrow()
  })
})
