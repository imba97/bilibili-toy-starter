// filepath: packages/bilibili-toy/src/namespaces/rank.ts
//
// 排行榜能力 —— 透传官方 submitScore / getRankList / getMyRank。
//
// 注意（2026-09-19 实测）：线上 getRankList 返回的是原始 HTTP 响应包，
// 且条目字段未按 d.ts 承诺映射 —— 实际是
//   { code, message, ttl, data: { list: [{ rank, score, user_info: { name, face } }] } }
// 而不是 d.ts 里的扁平 { rank, score, nickname, avatar }。
// 所以 list() 做一层归一化，对外仍暴露 RankItem。

import { createNamespace } from '../namespace'

export interface RankNamespace {
  submit: (req: ToySDK.SubmitScoreReq) => Promise<ToySDK.SubmitScoreResp>
  list: (req?: ToySDK.RankListReq) => Promise<ToySDK.RankItem[]>
  me: (req?: ToySDK.MyRankReq) => Promise<ToySDK.MyRankResp>
}

/** 线上实际返回的单条榜单条目（未按 d.ts 归一化） */
interface RawRankEntry {
  rank: number
  score: number
  user_info?: {
    name?: string
    face?: string
  }
}

/** 线上实际返回的响应包结构 */
interface RawRankListResp {
  code?: number
  data?: {
    list?: RawRankEntry[]
  }
}

/**
 * 把线上原始条目归一化成 RankItem。
 * 头像域名以平台/SDK 归一化结果为准，这里只做字段映射，不再改写 URL。
 */
function normalizeRankEntry(entry: RawRankEntry): ToySDK.RankItem {
  return {
    rank: entry.rank,
    score: entry.score,
    nickname: entry.user_info?.name ?? '',
    avatar: entry.user_info?.face ?? ''
  }
}

const rawRank = createNamespace<{
  submit: (req: ToySDK.SubmitScoreReq) => Promise<ToySDK.SubmitScoreResp>
  list: (req?: ToySDK.RankListReq) => Promise<RawRankListResp | ToySDK.RankItem[]>
  me: (req?: ToySDK.MyRankReq) => Promise<ToySDK.MyRankResp>
}>({
  submit: 'submitScore',
  list: 'getRankList',
  me: 'getMyRank'
} as const)

export const rank: RankNamespace = {
  submit: (req) => rawRank.submit(req),

  list: async (req) => {
    const resp = await rawRank.list(req)

    // 线上实测结构：{ code, data: { list: [...] } }，条目是 { rank, score, user_info }
    if (!Array.isArray(resp) && Array.isArray(resp?.data?.list)) {
      return resp.data.list.map(normalizeRankEntry)
    }

    // 防御：若某天 SDK 修好了，按 d.ts 直接返回扁平数组，原样透传
    if (Array.isArray(resp)) {
      return resp
    }

    return []
  },

  me: (req) => rawRank.me(req)
}
