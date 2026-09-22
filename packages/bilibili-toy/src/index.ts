// filepath: packages/bilibili-toy/src/index.ts
//
// 公开入口 —— 业务侧从这里导入。
//
// 用法：
//   import { toy, rank, cloud, user } from 'bilibili-toy'
//   await toy.ready()
//   await rank.submit({ score: 100 })
//   const list = await rank.list()
//   const me = await user.profile()
//
// 设计：
//   - 顶层只放 namespace（toy / rank / cloud / ...），不放通用词
//   - ready / isAvailable / isSupport 挂在 toy 下
//   - 错误处理 / 重试是通用工具，业务侧按需组合

// --- toy 单例：平台本身能力 + 握手入口 ---
export { toy } from './toy'

// --- 8 个能力 namespace（骨架）---
// 每个 namespace 都是可 override 的"绑定 API"：业务侧用 `xxx.override(key).mock(h)`
// 注册业务专属 mock handler。不 override 时：
//   - dev 模式：走内置空数据 mock（见 mock/defaults.ts）—— 业务侧不挂 mock 也能渲染
//   - 预览/真容器：透传到真实 SDK
//
// media namespace 是 SDK 唯一一个不预置 mock 的（requestCamera / requestMicrophone /
// stopMedia）—— 这些能力在浏览器原生走 getUserMedia / track.stop()，dev 模式无 host
// 也能正常工作。
export { rank } from './namespaces/rank'
export { cloud } from './namespaces/cloud'
export { user } from './namespaces/user'
export { author } from './namespaces/author'
export { video } from './namespaces/video'
export { share } from './namespaces/share'
export { container } from './namespaces/container'
export { media } from './namespaces/media'

// --- mock 基础设施 ---
// 业务侧写 src/mock/*.ts 时需要：
//   - 默认 user mid（用于其他人池"我"的标识）
//   - store 类型（CloudKV / MockStore 等）
//   - persistCloud：写 mock 后同步到 localStorage 的持久化 helper
// SDK 只暴露"容器 + 持久化机制"，不暴露业务数据（其他人池/昵称/头像均在业务侧）。
export { MOCK_DEFAULT_USER_ID, persistCloud } from './mock/store'
export type { CloudKV, MockStore } from './mock/store'

// --- 通用工具 ---
export type { RetryOptions } from './retry'
export { withRetry, isRetryableError } from './retry'

export type { ToyErrorLike } from './error'
export {
  isToyError,
  isDeniedError,
  formatToyError,
  toErrorMessage,
  normalizeToyError,
  ToyNotAvailableError
} from './error'

// --- 探测（高级用） ---
export { detectToy } from './env'
