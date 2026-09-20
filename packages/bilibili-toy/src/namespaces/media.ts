// filepath: packages/bilibili-toy/src/namespaces/media.ts
//
// 媒体能力 —— SDK 骨架（不预置空 mock，浏览器 getUserMedia 走透传即可）。

import { defineNamespace, defineCapability } from '../namespace'

export const media = defineNamespace('media', {
  requestCamera: defineCapability<ToySDK.MediaRelayOptions>('requestCamera'),
  // 无参能力 —— Req 走 void 默认值
  requestMicrophone: defineCapability('requestMicrophone'),
  stopMedia: defineCapability('stopMedia')
})
