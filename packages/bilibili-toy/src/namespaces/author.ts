// filepath: packages/bilibili-toy/src/namespaces/author.ts
//
// 作者能力 —— 透传官方 getAuthorProfile / getAuthorVideos / getAuthorRelation。

import { createNamespace } from '../namespace'

export interface AuthorNamespace {
  profile: () => Promise<ToySDK.AuthorProfileResp>
  videos: (req: ToySDK.AuthorVideosReq) => Promise<ToySDK.AuthorVideosResp>
  relation: () => Promise<ToySDK.AuthorRelationResp>
}

export const author = createNamespace<AuthorNamespace>({
  profile: 'getAuthorProfile',
  videos: 'getAuthorVideos',
  relation: 'getAuthorRelation'
} as const)
