// filepath: packages/bilibili-toy/src/namespaces/user.ts
//
// 用户能力 —— 透传官方 getUserProfile。

import { createNamespace } from '../namespace'

export interface UserNamespace {
  profile: () => Promise<ToySDK.UserProfileResp>
}

export const user = createNamespace<UserNamespace>({
  profile: 'getUserProfile'
} as const)
