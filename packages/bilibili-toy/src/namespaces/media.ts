// filepath: packages/bilibili-toy/src/namespaces/media.ts
//
// 媒体能力 —— 透传官方 requestCamera / requestMicrophone / stopMedia。

import { createNamespace } from '../namespace'

export interface MediaNamespace {
  /** 需用户手势触发；首次申请平台弹授权框 */
  requestCamera: (options?: ToySDK.MediaRelayOptions) => Promise<MediaStream>
  /** 需用户手势触发；与摄像头分别独立授权 */
  requestMicrophone: () => Promise<MediaStream>
  /** 释放摄像头 / 麦克风流 */
  stopMedia: (stream: MediaStream) => Promise<void>
}

export const media = createNamespace<MediaNamespace>({
  requestCamera: 'requestCamera',
  requestMicrophone: 'requestMicrophone',
  stopMedia: 'stopMedia'
} as const)
