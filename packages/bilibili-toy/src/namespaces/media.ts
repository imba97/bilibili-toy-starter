// filepath: packages/bilibili-toy/src/namespaces/media.ts
//
// 媒体能力 —— SDK 骨架（不预置空 mock，浏览器 getUserMedia 走透传即可）。

import { defineNamespace, useCapability } from '../namespace'

export const media = defineNamespace('media', {
  requestCamera: useCapability<ToySDK.MediaRelayOptions | undefined>('requestCamera'),
  requestMicrophone: useCapability('requestMicrophone'),
  stopMedia: useCapability('stopMedia')
})
