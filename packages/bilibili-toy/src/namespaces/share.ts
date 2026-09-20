// filepath: packages/bilibili-toy/src/namespaces/share.ts
//
// 分享与跳转能力 —— SDK 骨架。空响应兜底由 mock/defaults.ts 提供。

import { defineNamespace, useCapability } from '../namespace'
import {
  closeBrowserDefault,
  navigateDefault,
  qrCodeDefault,
  saveImageDefault,
  shareDefault
} from '../mock/defaults'

export const share = defineNamespace('share', {
  navigate: useCapability<ToySDK.NavigateReq>('navigate').mock(navigateDefault),
  to: useCapability<ToySDK.ShareReq>('share').mock(shareDefault),
  qrCode: useCapability<ToySDK.QrCodeReq>('getQrCode').mock(qrCodeDefault),
  saveImage: useCapability<ToySDK.SaveImageReq>('saveImageToAlbum').mock(saveImageDefault),
  // closeBrowser 无参 —— Req 走 void 默认值
  closeBrowser: useCapability('closeBrowser').mock(closeBrowserDefault)
})
