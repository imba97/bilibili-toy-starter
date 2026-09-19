// filepath: packages/bilibili-toy/src/namespaces/rank.ts
//
// 排行榜能力 —— 透传官方 submitScore / getRankList / getMyRank。

import { createNamespace } from '../namespace'

export interface RankNamespace {
  submit: (req: ToySDK.SubmitScoreReq) => Promise<ToySDK.SubmitScoreResp>
  list: (req?: ToySDK.RankListReq) => Promise<ToySDK.RankItem[]>
  me: (req?: ToySDK.MyRankReq) => Promise<ToySDK.MyRankResp>
}

export const rank = createNamespace<RankNamespace>({
  submit: 'submitScore',
  list: 'getRankList',
  me: 'getMyRank'
} as const)
