// filepath: packages/bilibili-toy/src/namespaces/cloud.ts
//
// 云存储能力 —— SDK 骨架。空响应兜底由 mock/defaults.ts 提供。

import { defineNamespace, defineCapability } from '../namespace'
import { cloudGetDefault, cloudRemoveDefault, cloudSetDefault } from '../mock/defaults'

export const cloud = defineNamespace('cloud', {
  // getCloudStorage：业务侧不传 keys 时返回整个 store —— req 可选
  get: defineCapability<string[] | undefined>('getCloudStorage').mock(cloudGetDefault),
  set: defineCapability<Record<string, string>>('setCloudStorage').mock(cloudSetDefault),
  remove: defineCapability<string[]>('removeCloudStorage').mock(cloudRemoveDefault)
})
