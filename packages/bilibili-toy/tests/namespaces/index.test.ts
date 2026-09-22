// filepath: packages/bilibili-toy/tests/namespaces/index.test.ts
//
// Smoke tests for every public namespace exposed by `bilibili-toy`.
//
// Goal: prove the SDK-to-namespace wiring is correct end-to-end:
//   - mock enabled  → each binding hits its default mock handler
//   - mock disabled → each binding forwards to `window.toy[sdkName]`
//
// Each namespace test installs a stub `window.toy` whose methods are spies
// that return recognisable sentinel values, then exercises both branches.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { toy, __resetForTests } from '../../src/toy'
import { author } from '../../src/namespaces/author'
import { cloud } from '../../src/namespaces/cloud'
import { container } from '../../src/namespaces/container'
import { media } from '../../src/namespaces/media'
import { rank } from '../../src/namespaces/rank'
import { share } from '../../src/namespaces/share'
import { user } from '../../src/namespaces/user'
import { video } from '../../src/namespaces/video'

function withToyStub<T>(sdk: ToySDK.Toy, fn: () => Promise<T>): Promise<T> {
  const g = globalThis as unknown as { window?: { toy: ToySDK.Toy } }
  const prev = g.window
  g.window = { toy: sdk }
  return fn().finally(() => {
    if (prev === undefined) delete g.window
    else g.window = prev
  })
}

describe('namespace wiring', () => {
  beforeEach(() => {
    __resetForTests()
    delete (globalThis as { window?: unknown }).window
  })

  afterEach(() => {
    __resetForTests()
    delete (globalThis as { window?: unknown }).window
  })

  describe('user', () => {
    it('mock enabled → default handler returns anonymous placeholder', async () => {
      toy.enableMock({ latencyMs: 1 })
      const r = await user.profile()
      expect(r.nickname.length).toBeGreaterThan(0)
    })

    it('mock disabled → forwards to window.toy.getUserProfile', async () => {
      const getUserProfile = vi.fn(() =>
        Promise.resolve({ avatar: 'a', nickname: 'real', toyOpenId: 'real-id' })
      )
      await withToyStub({ getUserProfile } as unknown as ToySDK.Toy, async () => {
        const r = await user.profile()
        expect(r.nickname).toBe('real')
        expect(getUserProfile).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('author', () => {
    it('mock enabled → all three bindings return default empty payloads', async () => {
      toy.enableMock({ latencyMs: 1 })
      expect((await author.profile()).status).toBe('unsupported')
      expect((await author.videos()).items).toEqual([])
      expect((await author.relation()).status).toBe('unsupported')
    })

    it('mock disabled → forwards to getAuthorProfile / Videos / Relation', async () => {
      const getAuthorProfile = vi.fn(() => Promise.resolve({ status: 'ok', data: {} as never }))
      const getAuthorVideos = vi.fn(() => Promise.resolve({ status: 'ok', items: [] as never[] }))
      const getAuthorRelation = vi.fn(() => Promise.resolve({ status: 'ok', data: {} as never }))
      await withToyStub(
        { getAuthorProfile, getAuthorVideos, getAuthorRelation } as unknown as ToySDK.Toy,
        async () => {
          await author.profile()
          await author.videos()
          await author.relation()
          expect(getAuthorProfile).toHaveBeenCalledTimes(1)
          expect(getAuthorVideos).toHaveBeenCalledTimes(1)
          expect(getAuthorVideos).toHaveBeenCalledWith()
          expect(getAuthorRelation).toHaveBeenCalledTimes(1)
        }
      )
    })
  })

  describe('rank', () => {
    it('mock enabled → submit/list/me return default empty payloads', async () => {
      toy.enableMock({ latencyMs: 1 })
      expect((await rank.submit({ score: 7 })).score).toBe(0)
      expect(await rank.list()).toEqual([])
      expect(await rank.me()).toEqual({ ranked: false, rank: 0, score: 0 })
    })

    it('mock disabled → forwards to submitScore / getRankList / getMyRank with correct args', async () => {
      const submitScore = vi.fn(() => Promise.resolve({ score: 100 }))
      const getRankList = vi.fn(() => Promise.resolve([] as ToySDK.RankItem[]))
      const getMyRank = vi.fn(() => Promise.resolve({ ranked: true, rank: 1, score: 99 }))
      await withToyStub(
        { submitScore, getRankList, getMyRank } as unknown as ToySDK.Toy,
        async () => {
          expect(await rank.submit({ score: 100 })).toEqual({ score: 100 })
          expect(await rank.list({ board: 1 })).toEqual([])
          expect(await rank.me({ period: 'week' })).toEqual({
            ranked: true,
            rank: 1,
            score: 99
          })
          expect(submitScore).toHaveBeenCalledWith({ score: 100 })
          expect(getRankList).toHaveBeenCalledWith({ board: 1 })
          expect(getMyRank).toHaveBeenCalledWith({ period: 'week' })
        }
      )
    })
  })

  describe('cloud', () => {
    it('mock enabled → get/set/remove return default empty payloads', async () => {
      toy.enableMock({ latencyMs: 1 })
      expect(await cloud.get()).toEqual({})
      expect(await cloud.set({ a: '1' })).toBeUndefined()
      expect(await cloud.remove(['a'])).toBeUndefined()
    })

    it('mock disabled → forwards to getCloudStorage / setCloudStorage / removeCloudStorage', async () => {
      const getCloudStorage = vi.fn(() => Promise.resolve({ a: '1' }))
      const setCloudStorage = vi.fn(() => Promise.resolve())
      const removeCloudStorage = vi.fn(() => Promise.resolve())
      await withToyStub(
        { getCloudStorage, setCloudStorage, removeCloudStorage } as unknown as ToySDK.Toy,
        async () => {
          expect(await cloud.get(['a'])).toEqual({ a: '1' })
          await cloud.set({ b: '2' })
          await cloud.remove(['a'])
          expect(getCloudStorage).toHaveBeenCalledWith(['a'])
          expect(setCloudStorage).toHaveBeenCalledWith({ b: '2' })
          expect(removeCloudStorage).toHaveBeenCalledWith(['a'])
        }
      )
    })
  })

  describe('share', () => {
    it('mock enabled → all five bindings return defaults', async () => {
      toy.enableMock({ latencyMs: 1 })
      expect(await share.navigate({ type: 'video', id: 'BV1' })).toBeUndefined()
      expect(await share.to({ path: 'index.html' })).toBeUndefined()
      const qr = await share.qrCode({ path: 'index.html' })
      expect(qr.base64.startsWith('data:image/png;base64,')).toBe(true)
      const si = await share.saveImage({ url: 'https://x' })
      expect(si.localPath).toBe('')
      expect(await share.closeBrowser()).toBeUndefined()
    })

    it('mock disabled → forwards to navigate / share / getQrCode / saveImageToAlbum / closeBrowser', async () => {
      const navigate = vi.fn(() => Promise.resolve())
      const shareFn = vi.fn(() => Promise.resolve())
      const getQrCode = vi.fn(() => Promise.resolve({ base64: 'real-png', url: 'https://real' }))
      const saveImageToAlbum = vi.fn(() => Promise.resolve({ localPath: '/tmp/x' }))
      const closeBrowser = vi.fn(() => Promise.resolve())
      await withToyStub(
        {
          navigate,
          share: shareFn,
          getQrCode,
          saveImageToAlbum,
          closeBrowser
        } as unknown as ToySDK.Toy,
        async () => {
          await share.navigate({ type: 'video', id: 'BV1' })
          await share.to({ path: 'index.html' })
          expect(await share.qrCode({ path: 'a' })).toEqual({
            base64: 'real-png',
            url: 'https://real'
          })
          expect(await share.saveImage({ url: 'u' })).toEqual({ localPath: '/tmp/x' })
          await share.closeBrowser()
          expect(navigate).toHaveBeenCalledWith({ type: 'video', id: 'BV1' })
          expect(shareFn).toHaveBeenCalledWith({ path: 'index.html' })
          expect(closeBrowser).toHaveBeenCalledTimes(1)
        }
      )
    })
  })

  describe('container', () => {
    it('mock enabled → state / onChange / setMode return defaults', async () => {
      toy.enableMock({ latencyMs: 1 })
      const state = await container.state()
      expect(state.changedFields).toEqual([])
      const off = await container.onChange(() => {})
      expect(typeof off).toBe('function')
      off()
      expect(await container.setMode({ immersive: true })).toBeUndefined()
    })

    it('mock disabled → forwards to getContainerState / onContainerChange / setContainerMode', async () => {
      const sentinel: ToySDK.ToyContainerState = {
        deviceType: 'phone',
        viewport: { width: 1, height: 2 },
        orientation: 'portrait',
        immersive: true,
        safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
        changedFields: []
      }
      const getContainerState = vi.fn(() => Promise.resolve(sentinel))
      const cancel = () => 'cancelled'
      const onContainerChange = vi.fn(() => cancel)
      const setContainerMode = vi.fn(() => Promise.resolve())
      await withToyStub(
        { getContainerState, onContainerChange, setContainerMode } as unknown as ToySDK.Toy,
        async () => {
          expect(await container.state()).toBe(sentinel)
          const off = await container.onChange(() => {})
          // off is the unsubscribe function itself; calling it returns whatever
          // the platform returns ('cancelled' in this stub).
          expect(typeof off).toBe('function')
          expect((off as unknown as () => string)()).toBe('cancelled')
          await container.setMode({ immersive: true })
          expect(getContainerState).toHaveBeenCalledTimes(1)
          expect(onContainerChange).toHaveBeenCalledTimes(1)
          expect(setContainerMode).toHaveBeenCalledWith({ immersive: true })
        }
      )
    })
  })

  describe('video', () => {
    it('mock enabled → actions returns default empty payload', async () => {
      toy.enableMock({ latencyMs: 1 })
      const r = await video.actions({ aids: [1, 2] })
      expect(r.status).toBe('unsupported')
      expect(r.items).toEqual([])
    })

    it('mock disabled → forwards to getVideoUserActions with typed req', async () => {
      const getVideoUserActions = vi.fn(() =>
        Promise.resolve({ status: 'ok', items: [] as never[] })
      )
      await withToyStub({ getVideoUserActions } as unknown as ToySDK.Toy, async () => {
        const r = await video.actions({ aids: [1] })
        expect(r.status).toBe('ok')
        expect(getVideoUserActions).toHaveBeenCalledWith({ aids: [1] })
      })
    })
  })

  describe('media', () => {
    it('mock enabled → no default handler; falls back to window.toy passthrough', async () => {
      toy.enableMock({ latencyMs: 1 })
      const stopMedia = vi.fn(() => Promise.resolve())
      const requestMicrophone = vi.fn(() => Promise.resolve('mic-stream' as never))
      const requestCamera = vi.fn(() => Promise.resolve('cam-stream' as never))
      await withToyStub(
        { requestCamera, requestMicrophone, stopMedia } as unknown as ToySDK.Toy,
        async () => {
          // even when mock is on, media has no built-in handler → goes to window.toy
          expect(await media.requestCamera({ facingMode: 'user' })).toBe('cam-stream')
          expect(await media.requestMicrophone()).toBe('mic-stream')
          await media.stopMedia({} as never)
          expect(stopMedia).toHaveBeenCalled()
        }
      )
    })

    it('mock disabled + no window.toy → throws ToyNotAvailableError', async () => {
      toy.disableMock()
      delete (globalThis as { window?: unknown }).window
      try {
        await media.requestMicrophone()
        throw new Error('expected requestMicrophone to throw')
      } catch (e) {
        expect((e as Error).message).toMatch(/window\.toy 不可用/)
      }
    })
  })
})
