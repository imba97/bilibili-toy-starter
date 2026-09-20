// filepath: packages/bilibili-toy/src/namespaces/rank.ts
//
// 排行榜能力 —— SDK 骨架。空响应兜底由 mock/defaults.ts 提供。

import { defineNamespace, defineCapability } from '../namespace'
import { myRankDefault, rankListDefault, submitScoreDefault } from '../mock/defaults'

export const rank = defineNamespace('rank', {
  submit: defineCapability<ToySDK.SubmitScoreReq>('submitScore').mock(submitScoreDefault),
  list: defineCapability<ToySDK.RankListReq>('getRankList').mock(rankListDefault),
  me: defineCapability<ToySDK.MyRankReq>('getMyRank').mock(myRankDefault)
})
