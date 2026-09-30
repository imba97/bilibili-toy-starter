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

// 数据源：「我」的签到分数 = cloud KV 的 ci_total（与签到页同一份真值）；
// 但**排行榜分数是服务端独立保存的「历史最高分」**，见下面的高分水位。
//
// 高分水位（high water mark）为什么必须独立于 cloud KV：
//   真 SDK 的 submitScore 只保留该榜位历史最高分，且这份记录在服务端、**只增不减**。
//   如果 mock 每次都从 cloud KV 现算分数，就等于假设「云存储永远是对的」—— 恰恰是
//   这个假设掩盖了真实事故（云存储被写坏成 1 时，mock 也跟着显示 1）。
//   所以 mock 用一份独立的水位来模拟服务端真值：它只在 submit 时抬升，
//   首次读取时从 cloud 播种（模拟「以前提交过但本地没记录」的历史数据）。

import { rank, MOCK_DEFAULT_USER_ID } from 'bilibili-toy'
import { getMockOthers, MOCK_SELF_AVATAR, MOCK_SELF_NICKNAME } from './data'

/** 内部带 mid 的榜单行 —— 仅 mock 内部用，对外脱掉 mid。 */
type InternalRankRow = ToySDK.RankItem & { mid: number }

/**
 * 服务端侧「历史最高分」水位，按榜位隔离（真 SDK 也是按 toy + 榜位 + 周期隔离）。
 * 只增不减；页面刷新（reload）后仍保留 —— 与真服务端一致。
 */
const highWaterMark = new Map<number, number>()

/**
 * 调试用：把水位「预置」成某个值，用来复现/验证「云存储被写坏、但服务端记录还在」。
 *
 *   localStorage.setItem('toy:mock:rank-score', '6')   // 让排行榜认为历史最高分是 6
 *
 * 只在 mock 环境读取，且只作用于默认榜位（本 Toy 只用一个榜位）。
 * 没有它就无法在本地复现签到页的数据自愈 —— 因为水位每次刷新都会从 cloud 重新播种
 * （本地没有真服务端那样持久的历史记录）。
 */
const RANK_SCORE_HINT_KEY = 'toy:mock:rank-score'

function debugSeed(): number | null {
  try {
    const raw = globalThis.localStorage?.getItem(RANK_SCORE_HINT_KEY)
    if (raw === null || raw === undefined) return null
    const n = Number(raw)
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : null
  } catch {
    return null
  }
}

/** 从 cloud KV 读取「我」的累计天数 —— 与签到页共享同一数据源。 */
function readMyScore(cloud: Map<string, string>): number {
  const raw = cloud.get('ci_total')
  return raw !== undefined && /^\d+$/.test(raw) ? Number(raw) : 0
}

/**
 * 取该榜位的历史最高分，并在首次读取时播种。
 *
 * 播种来源：先看调试预置值，否则用 cloud KV（模拟「以前提交过但本地没记录」）。
 * 播种只发生一次，之后水位独立演化 —— 所以云存储被写坏成更小的值时，排行榜
 * 仍然记得历史最高分，这正是签到页自愈（repairCheckinState）的依据。
 */
function highScore(board: number, cloud: Map<string, string>): number {
  const seeded = highWaterMark.get(board)
  if (seeded === undefined) {
    const fromHint = debugSeed()
    const initial = fromHint ?? readMyScore(cloud)
    highWaterMark.set(board, initial)
    return initial
  }
  return seeded
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
 * 注意这里**不读 cloud KV**：水位是服务端自己的记录。提交一个比水位低的分
 * （例如云存储被写坏后只能报出很小的值）不会把排行榜拉低 —— 与真 SDK 一致。
 */
rank.override('submit').mock((req, ctx) => {
  const board = req?.board ?? 1
  const next = Math.max(highScore(board, ctx.store.cloud), req.score)
  highWaterMark.set(board, next)
  return { score: next }
})

/**
 * getRankList mock：按服务端权威返回前 limit 名，「我」排不进就不出现。
 */
rank.override('list').mock((req, ctx) => {
  const limit = req?.limit ?? 10
  const myScore = highScore(req?.board ?? 1, ctx.store.cloud)
  return toRankItems(sortRank(myScore), limit)
})

/**
 * getMyRank mock：
 *   - 分数为 0 → ranked: false（未提交任何分数）
 *   - 分数 > 0 → ranked: true；rank = 我在服务端全量榜里的真实位置
 *     （不限制 limit —— 我可能在前 limit 之外，UI 用顶部横幅展示真实名次）
 *
 * 返回的 score 是**服务端历史最高分**，与 cloud KV 可能不一致（云存储被写坏时），
 * 签到页据此自愈，详见 src/composables/checkin.ts#repairCheckinState。
 */
rank.override('me').mock((req, ctx) => {
  const score = highScore(req?.board ?? 1, ctx.store.cloud)
  if (score <= 0) {
    return { ranked: false, rank: 0, score: 0 }
  }
  const sorted = sortRank(score)
  const idx = sorted.findIndex((r) => r.mid === MOCK_DEFAULT_USER_ID)
  const myRank = idx + 1 // idx = -1 ⇒ rank = 0 ⇒ ranked: false
  return { ranked: myRank > 0, rank: myRank, score }
})
