// filepath: src/mock/rank.ts
//
// 注册「排行榜」业务 mock —— 通过 SDK 暴露的 `rank.override(key).mock(h)` 挂载。
//
// 反推真实 SDK 后的 mock 设计：
//
//   真实 SDK 的 getRankList / getMyRank 是「服务端权威」：前端拿到的是已排好序的
//   RankItem[]，name 不重复、rank 唯一不并列。中间步骤（合并其他人 + 排序 + 编号）
//   都不在前端。前端 mock 必须自行承担这部分「服务端」工作。
//
//   - 其他人池：以 mid 为稳定 key（10..21），昵称/头像/分数固定，不随我浮动 ——
//     这才符合"反推官方"的语义。其他人的分数是真 SDK 服务端固有的快照。
//   - 我：用 mid = MOCK_DEFAULT_USER_ID 作为唯一标识，跨 list / me 共享。
//   - 服务端排序：分数倒序，同分 mid 升序（先到者优先的近似约定）。
//   - 上榜判定：以 MyRankResp.ranked 为准（d.ts 强调不能用 score 判断）。
//   - list 严格取前 limit 名：排不进 limit 就不会出现在 list 里（与真 SDK 一致）。
//     「我」的真实名次由 me() 给出，UI 在顶部横幅展示 —— 不硬挤入榜。
//
// 数据源：「我」的 score = cloud KV 的 ci_total（与签到页同一份真值）。

import { rank, MOCK_DEFAULT_USER_ID } from 'bilibili-toy'
import { getMockOthers, MOCK_SELF_AVATAR, MOCK_SELF_NICKNAME } from './data'

/** 内部带 mid 的榜单行 —— 仅 mock 内部用，对外脱掉 mid。 */
type InternalRankRow = ToySDK.RankItem & { mid: number }

/** 从 cloud KV 读取「我」的累计天数 —— 与签到页共享同一数据源。 */
function readMyScore(cloud: Map<string, string>): number {
  const raw = cloud.get('ci_total')
  return raw !== undefined && /^\d+$/.test(raw) ? Number(raw) : 0
}

/** 「我」作为服务端榜单里的独立一行。 */
function meRow(score: number): InternalRankRow {
  return {
    rank: 0,
    score,
    nickname: MOCK_SELF_NICKNAME,
    avatar: MOCK_SELF_AVATAR,
    mid: MOCK_DEFAULT_USER_ID
  }
}

/**
 * 模拟服务端：把其他人池 + 「我」按服务端规则排好。
 *
 * 服务端排序规则（按 d.ts + mock 约定）：
 *   - 主键 score 降序
 *   - 次键 mid 升序（同分按 mid 小的靠前，对应"先到者优先"）
 *
 * 返回数组含 mid 锚点，便于调用方找「我」的位置。
 */
function sortRank(myScore: number): InternalRankRow[] {
  const all: InternalRankRow[] = getMockOthers().map<InternalRankRow>((u) => ({
    rank: 0,
    score: u.score,
    nickname: u.nickname,
    avatar: u.avatar,
    mid: u.mid
  }))
  if (myScore > 0) {
    all.push(meRow(myScore))
  }
  return all.sort((a, b) => b.score - a.score || a.mid - b.mid)
}

/**
 * 给排序后的总榜重新编号（rank 1 起），并切片到 limit。
 *
 * 与真 SDK 严格一致：取前 limit 名，不为「我」破例。
 *   - myScore = 0：「我」根本不在 sorted 里，直接 slice
 *   - myScore > 0：在 limit 内才出现，否则被切掉；「我」的真实名次由 me() 给出
 */
function toRankItems(sorted: InternalRankRow[], limit: number): ToySDK.RankItem[] {
  return sorted.slice(0, limit).map(({ mid: _mid, ...rest }, i) => ({ ...rest, rank: i + 1 }))
}

/**
 * submitScore mock：服务端只保留该榜位的历史最高分，本次更低不覆盖。
 *
 * 「我」的分数 = ci_total（与签到页共享）。submit 等价于上报累计签到天数。
 */
rank.override('submit').mock((req, ctx) => {
  const current = readMyScore(ctx.store.cloud)
  const next = Math.max(current, req.score)
  if (next > current) {
    ctx.store.cloud.set('ci_total', String(next))
  }
  return { score: next }
})

/**
 * getRankList mock：按服务端权威返回前 limit 名，「我」排不进就不出现。
 */
rank.override('list').mock((req, ctx) => {
  const limit = req?.limit ?? 10
  const myScore = readMyScore(ctx.store.cloud)
  return toRankItems(sortRank(myScore), limit)
})

/**
 * getMyRank mock：
 *   - score = 0 → ranked: false（未提交任何分数）
 *   - score > 0 → ranked: true；rank = 我在服务端全量榜里的真实位置
 *     （不限制 limit —— 我可能在前 limit 之外，UI 用顶部横幅展示真实名次）
 */
rank.override('me').mock((_req, ctx) => {
  const score = readMyScore(ctx.store.cloud)
  if (score <= 0) {
    return { ranked: false, rank: 0, score: 0 }
  }
  const sorted = sortRank(score)
  const idx = sorted.findIndex((r) => r.mid === MOCK_DEFAULT_USER_ID)
  const myRank = idx + 1 // idx = -1 ⇒ rank = 0 ⇒ ranked: false
  return { ranked: myRank > 0, rank: myRank, score }
})
