// filepath: packages/bilibili-toy/src/namespaces/share.ts
//
// 分享与跳转能力 —— 透传官方 navigate / share / getQrCode / saveImageToAlbum / closeBrowser。

import { createNamespace } from '../namespace'

/** 分享与跳转能力 —— 透传官方 navigate / share / getQrCode / saveImageToAlbum / closeBrowser。方法签名由 ToySDK.Toy 自动推导。 */
export const share = createNamespace({
  navigate: 'navigate',
  to: 'share',
  qrCode: 'getQrCode',
  saveImage: 'saveImageToAlbum',
  closeBrowser: 'closeBrowser'
} as const)
