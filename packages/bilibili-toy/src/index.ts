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

// --- 8 个能力 namespace ---
export { rank } from './namespaces/rank'
export { cloud } from './namespaces/cloud'
export { user } from './namespaces/user'
export { author } from './namespaces/author'
export { video } from './namespaces/video'
export { share } from './namespaces/share'
export { container } from './namespaces/container'
export { media } from './namespaces/media'

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
