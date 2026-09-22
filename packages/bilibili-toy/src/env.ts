// filepath: packages/bilibili-toy/src/env.ts
//
// window.toy 检测 + 环境判定 —— 不做任何业务假设。
//
// 仅在浏览器侧返回有效实例；Node 端（SSR / 单元测试）返回 null。

export function detectToy(): ToySDK.Toy | null {
  if (typeof window === 'undefined') return null
  return window.toy ?? null
}

/**
 * 当前是否运行在生产构建。
 *
 * tsdown / Vite 在打包时会静态替换 `process.env.NODE_ENV`，所以这里靠
 * 构建期常量推断。Node 单测 / SSR 环境下 `process` 可能未定义，做一次
 * typeof 兜底。dev 模式下打印 dev-only 警告。
 */
export const isProd: boolean = (() => {
  try {
    return process.env.NODE_ENV === 'production'
  } catch {
    return false
  }
})()
