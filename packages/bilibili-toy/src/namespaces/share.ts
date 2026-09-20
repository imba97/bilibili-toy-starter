// filepath: packages/bilibili-toy/src/namespaces/share.ts
//
// 分享与跳转能力 —— SDK 骨架。空响应兜底由 mock/defaults.ts 提供。

import { defineNamespace, defineCapability } from '../namespace'
import {
  closeBrowserDefault,
  navigateDefault,
  qrCodeDefault,
  saveImageDefault,
  shareDefault
} from '../mock/defaults'

export const share = defineNamespace('share', {
  navigate: defineCapability<ToySDK.NavigateReq>('navigate').mock(navigateDefault),
  to: defineCapability<ToySDK.ShareReq>('share').mock(shareDefault),
  qrCode: defineCapability<ToySDK.QrCodeReq>('getQrCode').mock(qrCodeDefault),
  saveImage: defineCapability<ToySDK.SaveImageReq>('saveImageToAlbum').mock(saveImageDefault),
  // closeBrowser 无参 —— Req 走 void 默认值
  closeBrowser: defineCapability('closeBrowser').mock(closeBrowserDefault)
})
