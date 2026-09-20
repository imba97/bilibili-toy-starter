// filepath: packages/bilibili-toy/src/namespaces/video.ts
//
// 视频能力 —— SDK 骨架。空响应兜底由 mock/defaults.ts 提供。

import { defineNamespace, useCapability } from '../namespace'
import { videoUserActionsDefault } from '../mock/defaults'

export const video = defineNamespace('video', {
  actions:
    useCapability<ToySDK.VideoUserActionsReq>('getVideoUserActions').mock(videoUserActionsDefault)
})
