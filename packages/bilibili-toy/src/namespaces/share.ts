// filepath: packages/bilibili-toy/src/namespaces/share.ts
//
// 分享与跳转能力 —— 透传官方 navigate / share / getQrCode / saveImageToAlbum / closeBrowser。

import { createNamespace } from '../namespace'

export interface ShareNamespace {
  navigate: (req: ToySDK.NavigateReq) => Promise<void>
  /** 拉起分享面板，仅 App 内 */
  to: (req: ToySDK.ShareReq) => Promise<void>
  /** 生成当前 Toy 内页面二维码，App / Web 均可用 */
  qrCode: (req?: ToySDK.QrCodeReq) => Promise<ToySDK.QrCodeResp>
  /** 保存图片到相册，仅 App 内 */
  saveImage: (req: ToySDK.SaveImageReq) => Promise<ToySDK.SaveImageResp>
  /** 关闭 WebView，仅 App 内 */
  closeBrowser: () => Promise<void>
}

export const share = createNamespace<ShareNamespace>({
  navigate: 'navigate',
  to: 'share',
  qrCode: 'getQrCode',
  saveImage: 'saveImageToAlbum',
  closeBrowser: 'closeBrowser'
} as const)
