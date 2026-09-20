// filepath: packages/bilibili-toy/src/namespaces/rank.ts
//
// 排行榜能力 —— SDK 骨架。空响应兜底由 mock/defaults.ts 提供。

import { defineNamespace, useCapability } from '../namespace'
import { myRankDefault, rankListDefault, submitScoreDefault } from '../mock/defaults'

export const rank = defineNamespace('rank', {
  submit: useCapability<ToySDK.SubmitScoreReq>('submitScore').mock(submitScoreDefault),
  list: useCapability<ToySDK.RankListReq>('getRankList').mock(rankListDefault),
  me: useCapability<ToySDK.MyRankReq>('getMyRank').mock(myRankDefault)
})
