// filepath: src/composables/useRankStore.test.ts
//
// 「不上榜」偏好的端到端验证（mock SDK 真跑，不打桩）：
//   - 点击不上榜 → 云存储落一条 RANK_HIDE_KEY
//   - 渲染榜单（visibleList）不再含我，原始 list 仍是服务端真值
//   - 剔除后名次重新编号：不留空洞，后面的人依次向前
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

  it('默认上榜：我在 list 与 visibleList 里都在，名次保持服务端值', () => {
    expect(store.hiddenFromRank.value).toBe(false)
    expect(store.list.value.some((e) => store.isMeEntry(e))).toBe(true)
    expect(store.visibleList.value.length).toBe(store.list.value.length)
    expect(store.visibleList.value.map((e) => e.rank)).toEqual(store.list.value.map((e) => e.rank))
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

  it('不上榜后名次重新编号：不留空洞，后面的人依次向前', async () => {
    // 25 分 ⇒ 服务端第 5 名（前面 30 / 28 / 26 / 25）
    expect(store.myRank.value?.rank).toBe(5)
    const sixth = store.list.value.find((e) => e.rank === 6)
    expect(sixth).toBeDefined()

    await store.setHiddenFromRank(true)
    const ranks = store.visibleList.value.map((e) => e.rank)

    // 连续 1..N，没有 1 2 3 4 6 这种空洞
    expect(ranks).toEqual(Array.from({ length: ranks.length }, (_, i) => i + 1))
    // 原来的第 6 名顶到第 5 名（顺序不变，只是整体前移）
    expect(store.visibleList.value.find((e) => e.nickname === sixth?.nickname)?.rank).toBe(5)
    expect(store.visibleList.value.length).toBe(store.list.value.length - 1)
  })

  it('重新编号只发生在展示层：服务端 list / myRank 一个字段都不变', async () => {
    // 冻结服务端返回的快照（含我的第 5 名与完整 1..10 名次）
    const listBefore = JSON.parse(JSON.stringify(store.list.value))
    const myRankBefore = JSON.parse(JSON.stringify(store.myRank.value))
    const storageBefore = await cloud.get()

    await store.setHiddenFromRank(true)

    // list 深比较相等 —— 值、顺序、名次都没被改写（也没有回写任何接口）
    expect(store.list.value).toEqual(listBefore)
    expect(store.list.value.map((e) => e.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    // myRank 保持服务端值，仍是我的真实名次
    expect(store.myRank.value).toEqual(myRankBefore)
    expect(store.myRank.value?.rank).toBe(5)
    // 云存储只多了一条不上榜偏好，分数等业务数据没被动过
    expect(await cloud.get()).toEqual({ ...storageBefore, [RANK_HIDE_KEY]: '1' })
  })

  it('刷新（重新 load）后依然不展示我，名次依然连续', async () => {
    await store.setHiddenFromRank(true)
    await store.load()

    expect(store.hiddenFromRank.value).toBe(true)
    expect(store.visibleList.value.some((e) => store.isMeEntry(e))).toBe(false)
    expect(store.visibleList.value.map((e) => e.rank)).toEqual(
      Array.from({ length: store.visibleList.value.length }, (_, i) => i + 1)
    )
  })

  it('恢复上榜：云存储 key 被删掉，我又回到可见榜且名次与服务端一致', async () => {
    await store.setHiddenFromRank(true)
    await store.setHiddenFromRank(false)

    expect(store.hiddenFromRank.value).toBe(false)
    expect(await cloud.get([RANK_HIDE_KEY])).toEqual({})
    expect(store.visibleList.value.some((e) => store.isMeEntry(e))).toBe(true)
    expect(store.visibleList.value.map((e) => e.rank)).toEqual(store.list.value.map((e) => e.rank))
  })

  it('bumpMyScore 只改分数，不会把「不上榜」的我塞回可见榜', async () => {
    await store.setHiddenFromRank(true)
    store.bumpMyScore(1)

    expect(store.visibleList.value.some((e) => store.isMeEntry(e))).toBe(false)
  })
})
