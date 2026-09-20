// filepath: packages/bilibili-toy/src/namespaces/container.ts
//
// 容器能力 —— SDK 骨架。空响应兜底由 mock/defaults.ts 提供。

import { defineNamespace, defineCapability } from '../namespace'
import {
  containerStateDefault,
  onContainerChangeDefault,
  setContainerModeDefault
} from '../mock/defaults'

export const container = defineNamespace('container', {
  onChange:
    defineCapability<ToySDK.ContainerStateListener>('onContainerChange').mock(
      onContainerChangeDefault
    ),
  state: defineCapability('getContainerState').mock(containerStateDefault),
  setMode:
    defineCapability<ToySDK.SetContainerModeReq>('setContainerMode').mock(setContainerModeDefault)
})
