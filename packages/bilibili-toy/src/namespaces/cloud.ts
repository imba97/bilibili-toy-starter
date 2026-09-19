// filepath: packages/bilibili-toy/src/namespaces/cloud.ts
//
// 云存储能力 —— 透传官方 getCloudStorage / setCloudStorage / removeCloudStorage。

import { createNamespace } from '../namespace'

export interface CloudNamespace {
  /** 读取；不传或传空数组读全部，未命中 key 不出现在结果中 */
  get: (keys?: string[]) => Promise<Record<string, string>>
  /** 批量 upsert，同 key 覆盖；items 必须是普通对象 */
  set: (items: Record<string, string>) => Promise<void>
  /** 批量删除 */
  remove: (keys: string[]) => Promise<void>
}

export const cloud = createNamespace<CloudNamespace>({
  get: 'getCloudStorage',
  set: 'setCloudStorage',
  remove: 'removeCloudStorage'
} as const)
