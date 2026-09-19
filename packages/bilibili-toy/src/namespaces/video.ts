// filepath: packages/bilibili-toy/src/namespaces/video.ts
//
// 视频能力 —— 透传官方 getVideoUserActions。

import { createNamespace } from '../namespace'

export interface VideoNamespace {
  actions: (req: ToySDK.VideoUserActionsReq) => Promise<ToySDK.VideoUserActionsResp>
}

export const video = createNamespace<VideoNamespace>({
  actions: 'getVideoUserActions'
} as const)
