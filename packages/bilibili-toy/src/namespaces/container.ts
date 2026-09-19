// filepath: packages/bilibili-toy/src/namespaces/container.ts
//
// 容器能力 —— 透传官方 onContainerChange / getContainerState / setContainerMode。

import { createNamespace } from '../namespace'

export interface ContainerNamespace {
  /** 立即返回取消函数；先收到一次完整状态，之后仅在变化时通知 */
  onChange: (listener: ToySDK.ContainerStateListener) => () => void
  state: () => Promise<ToySDK.ToyContainerState>
  setMode: (req: ToySDK.SetContainerModeReq) => Promise<void>
}

export const container = createNamespace<ContainerNamespace>({
  onChange: 'onContainerChange',
  state: 'getContainerState',
  setMode: 'setContainerMode'
} as const)
