// filepath: src/composables/useRankStore.ts
//
// 排行榜全局共享状态 —— 在 App 挂载时首次加载一次，rank.vue 与 index.vue 共享。
//
// 动机：签到后立即跳到排行榜页时，由于服务端存储/同步存在延迟，如果每次进页
// 都重新拉一次，可能看到旧的天数。改为：首屏在 App 层就拉一次，之后榜单状态
// 在本地维护；签到成功直接本地 +1，排行榜页无需重新拉即反映新分数。
//
// 设计：
//   - 模块级 ref + load() 是单例，整个 SPA 共享同一份榜单。
//   - "我"的匹配锚点仍是 nickname（与 rank.vue 历史实现一致）；
//     rankItem 本身不带 toyOpenId/mid，所以 nickname 是当前唯一可用的稳定标识。
//   - bumpMyScore(delta) 走「本地优先」策略：找到 list 中 nickname === me.nickname 的
//     行就 +delta；找不到（未上榜 / nick 不匹配）则跳过 list 更新，但 myRank 的
//     score 仍然同步 +delta 以反映真实累计天数。
//   - load() 走服务端真实拉取，供首次加载 + 手动刷新使用；仍保持幂等。
//
// 类型：直接使用全局 `ToySDK.*` 命名空间。声明的权威源在 `bilibili-toy` 包内
// (`bilibili-toy/types/toy-sdk.d.ts`，通过 package.json#exports 暴露)，本仓库
// 通过 `src/types/toy-sdk.d.ts` 这个 shim 用 `/// <reference />` 转发过来。
// 与 src/pages/* / src/mock/* 一致。`bilibili-toy` 包本身没有 export ToySDK。

import { ref } from 'vue'
import { rank, user } from '@/mock'
import { initToy, toErrorMessage } from './useToy'

/**
 * 排行榜模块级共享状态 —— 模块首次访问时实例化，App 整个生命周期内复用。
 *
 * 测试注意：模块级 ref 在 `import` 时即实例化，意味着
 *   - 在 vitest 里若两个 test file 都 import 这个模块，它们会共享同一份
 *     list / myRank / me —— vi.resetModules() 或 beforeEach 显式赋值是
 *     必要的隔离手段。
 *   - 单 SPA 实例里这是想要的：App.vue load() 一次，所有页共享。
 */
const list = ref<ToySDK.RankItem[]>([])
const myRank = ref<ToySDK.MyRankResp | null>(null)
const me = ref<ToySDK.UserProfileResp | null>(null)

const loading = ref(true)
const refreshing = ref(false)
const errorMessage = ref('')
/** 是否有一次成功的首次加载 —— 用于让消费者区分「还没拉过」与「拉过为空」 */
const hasLoaded = ref(false)
/**
 * runId：每次 load() 入口自增，旧的 load() 在 await 回来后若发现 runId 已变，
 * 直接丢弃自己的结果 —— 保证「最后一次调用」覆盖所有更早的调用，避免
 * 路由快速切换 / 用户狂点刷新时旧响应污染最新状态。
 */
let runId = 0

/**
 * 首次加载或重新拉取榜单。list / me / myRank 三路并行；任一失败抛错由调用方决定
 * 是否展示。`initToy` 必须在调用前确保 toy 已 ready（mock 模式下是 no-op）。
 *
 * 并发策略：不去互斥排队，而是用 runId 让旧调用"无害化" —— 首次挂载与手动刷新
 * 都能各自进入，并各自完成；最晚回来的那次覆盖结果。
 */
async function load(): Promise<void> {
  const myRun = ++runId
  refreshing.value = true
  errorMessage.value = ''
  try {
    await initToy()
    // rank.list / rank.me / user.profile 的 Resp 类型由 bilibili-toy dist 签名保证，
    // 无需任何断言；profile 失败回退到 null 不阻塞榜单展示 —— 与 rank.vue 保持一致
    const [rankList, mine, profile] = await Promise.all([
      rank.list(),
      rank.me(),
      user.profile().catch((): ToySDK.UserProfileResp | null => null)
    ])
    if (myRun !== runId) return // 更新的 load() 已经盖过我了，写结果反而会回滚
    list.value = rankList
    myRank.value = mine
    me.value = profile
    hasLoaded.value = true
  } catch (err) {
    if (myRun !== runId) return
    errorMessage.value = toErrorMessage(err)
    throw err
  } finally {
    if (myRun === runId) {
      refreshing.value = false
      loading.value = false
    }
  }
}

/**
 * 本地 +delta：我上榜了就把 list 里那行的 score 同步增加；myRank 始终反映。
 *
 * 不发起任何网络请求 —— 服务端的真实 score 已在签到时通过 rank.submit 上报。
 * 仅作为「在服务端分数到达前的瞬时视图修正」，下次 reload() 仍以服务端为准。
 *
 * 「未上榜 / nick 不匹配」两种情况下不影响 list：list 是 top-N 固定切片，
 * 把「我」强行塞进去会破坏 rank 编号 / 顺序，违背 SDK 语义。
 *
 * @param delta  累加增量（签到固定传 +1）
 */
function bumpMyScore(delta: number): void {
  if (delta === 0) return
  const meNick = me.value?.nickname
  // 1) 找到「我」在 list 里的位置 → 同步 +delta，按 score 重排，重算名次
  let foundLocalRank = -1
  if (meNick) {
    const idx = list.value.findIndex((e: ToySDK.RankItem) => e.nickname === meNick)
    if (idx !== -1) {
      const updated = list.value.map((e, i) => (i === idx ? { ...e, score: e.score + delta } : e))
      // 重新按 score 降序排序，避免 +delta 后位次错乱
      updated.sort((a, b) => b.score - a.score)
      list.value = updated
      foundLocalRank = updated.findIndex((e) => e.nickname === meNick)
    }
  }
  // 2) myRank 同步：ranked 只在 list 内能找到「我」时才置 true（不要让 score>0
  //    误触发"已上榜"分支，避免未上榜用户的横幅切换成"已上榜"）
  if (myRank.value) {
    const next: ToySDK.MyRankResp = {
      ranked: myRank.value.ranked || foundLocalRank !== -1,
      // 本地名次：以排序后的 list 位置为准；list 外（top-N 之外）保持原值，
      //   待下次 reload() 才反映服务端真值
      rank: foundLocalRank !== -1 ? foundLocalRank + 1 : myRank.value.rank,
      score: myRank.value.score + delta
    }
    myRank.value = next
  }
}

export function useRankStore() {
  return {
    list,
    myRank,
    me,
    loading,
    refreshing,
    errorMessage,
    hasLoaded,
    load,
    bumpMyScore
  }
}
