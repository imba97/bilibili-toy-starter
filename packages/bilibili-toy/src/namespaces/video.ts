// filepath: packages/bilibili-toy/src/namespaces/video.ts
//
// 视频能力 —— 透传官方 getVideoUserActions。

import { createNamespace } from '../namespace'

/** 视频能力 —— 透传官方 getVideoUserActions。方法签名由 ToySDK.Toy 自动推导。 */
export const video = createNamespace({
  actions: 'getVideoUserActions'
} as const)
