// filepath: packages/bilibili-toy/src/namespaces/rank.ts
//
// 排行榜能力 —— 透传官方 submitScore / getRankList / getMyRank。
//
// 注意：线上 getRankList 实际返回 `{ code, data: { list: [{ rank, score, user_info }] } }`，
// 与 d.ts 承诺的扁平 RankItem 不一致，list() 内部做一层归一化。

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

// 通过 as const 让 createNamespace 自动从 ToySDK.Toy 推导方法签名。
// list 的真实线上返回结构与 d.ts 不一致，在二次归一化处做类型断言。
const rawRank = createNamespace({
  submit: 'submitScore',
  list: 'getRankList',
  me: 'getMyRank'
} as const)

export const rank: RankNamespace = {
  submit: (req) => rawRank.submit(req),

  list: async (req) => {
    const resp = (await rawRank.list(req)) as RawRankListResp | ToySDK.RankItem[]

    // 线上实测：{ code, data: { list: [{ rank, score, user_info }] } }
    if (!Array.isArray(resp) && Array.isArray(resp?.data?.list)) {
      return resp.data.list.map(normalizeRankEntry)
    }

    // 防御：若后端改回 d.ts 承诺的扁平数组，原样透传，避免退化为空。
    if (Array.isArray(resp)) {
      return resp as ToySDK.RankItem[]
    }

    return []
  },

  me: (req) => rawRank.me(req)
}
