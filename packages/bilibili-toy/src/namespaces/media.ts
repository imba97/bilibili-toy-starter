// filepath: packages/bilibili-toy/src/namespaces/media.ts
//
// 媒体能力 —— 透传官方 requestCamera / requestMicrophone / stopMedia。

import { createNamespace } from '../namespace'

/** 媒体能力 —— 透传官方 requestCamera / requestMicrophone / stopMedia。方法签名由 ToySDK.Toy 自动推导。 */
export const media = createNamespace({
  requestCamera: 'requestCamera',
  requestMicrophone: 'requestMicrophone',
  stopMedia: 'stopMedia'
} as const)
