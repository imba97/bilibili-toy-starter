// filepath: packages/bilibili-toy/src/namespaces/cloud.ts
//
// 云存储能力 —— SDK 骨架。空响应兜底由 mock/defaults.ts 提供。

import { defineNamespace, useCapability } from '../namespace'
import { cloudGetDefault, cloudRemoveDefault, cloudSetDefault } from '../mock/defaults'

export const cloud = defineNamespace('cloud', {
  get: useCapability<string[] | undefined>('getCloudStorage').mock(cloudGetDefault),
  set: useCapability<Record<string, string> | undefined>('setCloudStorage').mock(cloudSetDefault),
  remove: useCapability<string[] | undefined>('removeCloudStorage').mock(cloudRemoveDefault)
})
