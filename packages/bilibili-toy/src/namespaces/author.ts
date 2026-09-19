// filepath: packages/bilibili-toy/src/namespaces/author.ts
//
// 作者能力 —— 透传官方 getAuthorProfile / getAuthorVideos / getAuthorRelation。

import { createNamespace } from '../namespace'

/** 作者能力 —— 透传官方 getAuthorProfile / getAuthorVideos / getAuthorRelation。方法签名由 ToySDK.Toy 自动推导。 */
export const author = createNamespace({
  profile: 'getAuthorProfile',
  videos: 'getAuthorVideos',
  relation: 'getAuthorRelation'
} as const)
