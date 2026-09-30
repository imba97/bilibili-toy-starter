// filepath: src/composables/useRankStore.test.ts
//
// 「不上榜」偏好的端到端验证（mock SDK 真跑，不打桩）：
//   - 点击不上榜 → 云存储落一条 RANK_HIDE_KEY
//   - 渲染榜单（visibleList）不再含我，原始 list 仍是服务端真值
//   - 重新 load()（≈ 用户刷新页面）后依然不含我
//   - 恢复上榜 → key 删除，我又回到 visibleList
//
// 注意：useRankStore 的 ref 是模块级单例，所以本文件全程共用一个 store，
// 靠 beforeEach 清云存储来重置状态（而不是重建 store）。

import { beforeEach, describe, expect, it } from 'vite-plus/test'
import { cloud, toy } from 'bilibili-toy'
import '@/mock'
import { RANK_HIDE_KEY, useRankStore } from './useRankStore'

// mock 模式下 namespace 调用不依赖 window.toy；node 环境（vitest）下也能跑。
// 必须放在任何 namespace 调用之前。
toy.enableMock()

const store = useRankStore()
/** mock 其他人池最低分 17；25 分能让我排进前 10，方便断言「我在榜上」 */
const MY_SCORE = 25

describe('useRankStore 「不上榜」', () => {
  beforeEach(async () => {
    await cloud.remove(['ci_total', RANK_HIDE_KEY])
    await cloud.set({ ci_total: String(MY_SCORE) })
    await store.load()
  })

  it('默认上榜：我在 list 与 visibleList 里都在', () => {
    expect(store.hiddenFromRank.value).toBe(false)
    expect(store.list.value.some((e) => store.isMeEntry(e))).toBe(true)
    expect(store.visibleList.value.length).toBe(store.list.value.length)
  })

  it('点「不上榜」：写云存储、可见榜里没有我、原始榜不动', async () => {
    const before = store.list.value.length
    await store.setHiddenFromRank(true)

    expect(store.hiddenFromRank.value).toBe(true)
    expect(await cloud.get([RANK_HIDE_KEY])).toEqual({ [RANK_HIDE_KEY]: '1' })
    // 原始 list 保持服务端真值（含我），只有渲染用的 visibleList 少了我这一行
    expect(store.list.value.some((e) => store.isMeEntry(e))).toBe(true)
    expect(store.visibleList.value.some((e) => store.isMeEntry(e))).toBe(false)
    expect(store.visibleList.value.length).toBe(before - 1)
  })

  it('刷新（重新 load）后依然不展示我', async () => {
    await store.setHiddenFromRank(true)
    await store.load()

    expect(store.hiddenFromRank.value).toBe(true)
    expect(store.visibleList.value.some((e) => store.isMeEntry(e))).toBe(false)
  })

  it('恢复上榜：云存储 key 被删掉，我又回到可见榜', async () => {
    await store.setHiddenFromRank(true)
    await store.setHiddenFromRank(false)

    expect(store.hiddenFromRank.value).toBe(false)
    expect(await cloud.get([RANK_HIDE_KEY])).toEqual({})
    expect(store.visibleList.value.some((e) => store.isMeEntry(e))).toBe(true)
  })

  it('bumpMyScore 只改分数，不会把「不上榜」的我塞回可见榜', async () => {
    await store.setHiddenFromRank(true)
    store.bumpMyScore(1)

    expect(store.visibleList.value.some((e) => store.isMeEntry(e))).toBe(false)
  })
})
