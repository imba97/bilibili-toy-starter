// filepath: packages/bilibili-toy/src/namespaces/user.ts
//
// 用户能力 —— 透传官方 getUserProfile。

import { createNamespace } from '../namespace'

/** 用户能力 —— 透传官方 getUserProfile。方法签名由 ToySDK.Toy 自动推导。 */
export const user = createNamespace({
  profile: 'getUserProfile'
} as const)
