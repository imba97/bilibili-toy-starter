// filepath: packages/bilibili-toy/src/namespaces/container.ts
//
// 容器能力 —— 透传官方 onContainerChange / getContainerState / setContainerMode。

import { createNamespace } from '../namespace'

/** 容器能力 —— 透传官方 onContainerChange / getContainerState / setContainerMode。方法签名由 ToySDK.Toy 自动推导。 */
export const container = createNamespace({
  onChange: 'onContainerChange',
  state: 'getContainerState',
  setMode: 'setContainerMode'
} as const)
