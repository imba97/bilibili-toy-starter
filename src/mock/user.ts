// filepath: src/mock/user.ts
//
// 注册「用户信息」业务 mock —— 通过 SDK 暴露的 `user.override(key).mock(h)` 挂载。
//
// getUserProfile() 无需授权（与作者 / 视频数据类不同），
// 真 SDK 在外部浏览器会返回 status: 'unsupported'，在 B站 App WebView 返回 ok。
// mock 直接返回 ok + mockUserId 对应的昵称 / 头像。

import { user } from 'bilibili-toy'
import { buildMockUserProfile } from './data'

user.override('profile').mock((_req, ctx) => buildMockUserProfile(ctx.mockUserId))
