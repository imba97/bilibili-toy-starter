// filepath: packages/bilibili-toy/src/namespaces/cloud.ts
//
// 云存储能力 —— 透传官方 getCloudStorage / setCloudStorage / removeCloudStorage。

import { createNamespace } from '../namespace'

/**
 * 云存储能力 —— 透传官方 getCloudStorage / setCloudStorage / removeCloudStorage。
 * 方法签名由 ToySDK.Toy 自动推导，这里只声明方法名映射。
 */
export const cloud = createNamespace({
  get: 'getCloudStorage',
  set: 'setCloudStorage',
  remove: 'removeCloudStorage'
} as const)
