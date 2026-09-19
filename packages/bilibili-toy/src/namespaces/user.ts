// filepath: packages/bilibili-toy/src/namespaces/user.ts
//
// 用户信息能力 —— SDK 骨架。空响应兜底由 mock/defaults.ts 提供。

import { defineNamespace, useCapability } from '../namespace'
import { userProfileDefault } from '../mock/defaults'

export const user = defineNamespace('user', {
  profile: useCapability('getUserProfile').mock(userProfileDefault)
})
