// filepath: src/mock/author.ts
//
// 注册「作者资料」业务 mock —— 通过 SDK 暴露的 `author.override(key).mock(h)` 挂载。
//
// 真 SDK getAuthorProfile / getAuthorVideos / getAuthorRelation 是无授权即可调用的
// 「公开数据」能力，dev / preview 模式下用本地假数据模拟服务端响应。

import { author } from 'bilibili-toy'
import { buildMockAuthorProfile, buildMockAuthorRelation, buildMockAuthorVideos } from './data'

author.override('profile').mock((req, ctx) => {
  // getAuthorProfile() 不带参；某些预览场景会传 { mid } —— 兼容两种
  const mid = (req as { mid?: number } | undefined | null)?.mid ?? ctx.mockUserId
  return buildMockAuthorProfile(mid)
})

author.override('videos').mock((req, ctx) => {
  // 从请求的 videos[0] 反推 mid（mock 简化：所有视频视为同一作者）
  const ref = (req as { videos?: Array<{ aid?: number }> } | undefined | null)?.videos?.[0]
  const mid = ref?.aid !== undefined ? Math.floor(ref.aid / 100) : ctx.mockUserId
  return buildMockAuthorVideos(mid)
})

author.override('relation').mock((_req, ctx) => buildMockAuthorRelation(ctx.mockUserId))
