// filepath: packages/bilibili-toy/src/namespaces/author.ts
//
// 作者能力 —— SDK 骨架。空响应兜底由 mock/defaults.ts 提供。

import { defineNamespace, defineCapability } from '../namespace'
import { authorProfileDefault, authorRelationDefault, authorVideosDefault } from '../mock/defaults'

export const author = defineNamespace('author', {
  profile: defineCapability('getAuthorProfile').mock(authorProfileDefault),
  videos: defineCapability('getAuthorVideos').mock(authorVideosDefault),
  relation: defineCapability('getAuthorRelation').mock(authorRelationDefault)
})
