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
  navigate: useCapability<ToySDK.NavigateReq | undefined>('navigate').mock(navigateDefault),
  to: useCapability<ToySDK.ShareReq | undefined>('share').mock(shareDefault),
  qrCode: useCapability<ToySDK.QrCodeReq | undefined>('getQrCode').mock(qrCodeDefault),
  saveImage: useCapability<ToySDK.SaveImageReq | undefined>('saveImageToAlbum').mock(
    saveImageDefault
  ),
  closeBrowser: useCapability('closeBrowser').mock(closeBrowserDefault)
})
