// filepath: packages/bilibili-toy/src/env.ts
//
// window.toy 检测 —— 不做任何业务假设。
//
// 仅在浏览器侧返回有效实例；Node 端（SSR / 单元测试）返回 null。

export function detectToy(): ToySDK.Toy | null {
  if (typeof window === 'undefined') return null
  return window.toy ?? null
}
