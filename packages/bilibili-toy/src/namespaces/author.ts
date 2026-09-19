// filepath: packages/bilibili-toy/src/namespaces/author.ts
//
// 作者能力 —— SDK 骨架。空响应兜底由 mock/defaults.ts 提供。

import { defineNamespace, useCapability } from '../namespace'
import { authorProfileDefault, authorRelationDefault, authorVideosDefault } from '../mock/defaults'

export const author = defineNamespace('author', {
  profile: useCapability('getAuthorProfile').mock(authorProfileDefault),
  videos: useCapability('getAuthorVideos').mock(authorVideosDefault),
  relation: useCapability('getAuthorRelation').mock(authorRelationDefault)
})
