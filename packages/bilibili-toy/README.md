<div align="center">

# 📦 bilibili-toy

**官方 Bilibili Toy JS SDK 的类型安全封装，原生支持 mock。**

[![npm version](https://img.shields.io/npm/v/bilibili-toy?color=cb3837&logo=npm&logoColor=white&label=npm)](https://www.npmjs.com/package/bilibili-toy)
[![npm bundle size](https://img.shields.io/bundlephobia/min/bilibili-toy?color=success&logo=webpack)](https://bundlephobia.com/package/bilibili-toy)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

[官网](https://github.com/imba97/bilibili-toy-starter) · [问题反馈](https://github.com/imba97/bilibili-toy-starter/issues) · [更新日志](https://github.com/imba97/bilibili-toy-starter/releases)

</div>

---

## 特性

- 🎯 **零运行时依赖** — 纯 TypeScript 实现，体积小、不污染依赖图
- 🍃 **扁平 API** — `import { rank, cloud, user } from 'bilibili-toy'`，开箱即用
- ⚡ **Proxy 动态转发** — 底层 SDK 新增方法无需改动封装，类型自动更新
- 🧪 **Mock 覆盖钩子** — 每个 namespace 方法都支持 `xxx.override(key).mock(handler)`
- 💾 **持久化 mock 存储** — 基于 `Map` 的 KV，自动写入 `localStorage`
- 🔁 **宿主就绪重试** — 对 `toy id not available on host` 竞态透明退避
- 🛡️ **错误归一化** — 统一 `[bilibili-toy]` 前缀；提供 `isToyHostNotReady` / `isToyError` / `isDeniedError` 用于类型化处理

---

## 目录

- [安装](#安装)
- [快速开始](#快速开始)
- [Mock 覆盖钩子](#mock-覆盖钩子)
- [API 参考](#api-参考)
  - [`toy` — 平台能力](#toy--平台能力)
  - [Namespace 列表](#namespace-列表)
- [错误处理](#错误处理)
- [重试策略](#重试策略)
- [Mock 基础设施导出](#mock-基础设施导出)
- [协议](#协议)

---

## 安装

```bash
# npm
npm install bilibili-toy

# pnpm
pnpm add bilibili-toy

# yarn
yarn add bilibili-toy
```

> **Node ≥ 18** · **TypeScript ≥ 5.0** · 零运行时依赖

---

## 快速开始

```ts
import { toy, rank, cloud, user } from 'bilibili-toy'

// 等待 window.toy 加载完成（默认超时 5000ms）
await toy.ready()

// 直接调用 namespace 方法
await rank.submit({ score: 100 }) // 提交分数
const list = await rank.list() // 获取排行榜
const me = await user.profile() // 获取当前用户
await cloud.set({ key: 'value' }) // 写入云端 KV
```

一行调用、一套类型 — 开发与生产同源代码。

---

## Mock 覆盖钩子

> 开发 / 预览模式下 **完全不发起真实 RPC**。开一个开关、注册几个处理器，即可获得数据完整的 UI，无需任何网络访问。

```ts
import { toy, rank, MOCK_DEFAULT_USER_ID } from 'bilibili-toy'
import { getMockOthers } from './data'

toy.enableMock() // 将 namespace 调用路由到 mock

rank.override('list').mock(async (req, ctx) => {
  const me = { rank: 0, score: ctx.store.cloud.get('ci_total'), mid: MOCK_DEFAULT_USER_ID }
  return [...getMockOthers(), me].sort((a, b) => b.score - a.score).slice(0, req?.limit ?? 10)
})
```

### `MockCtx` 字段

| 字段                   | 说明                                                              |
| ---------------------- | ----------------------------------------------------------------- |
| `store`                | 共享 `MockStore`（`cloud: Map`、`rank: RankState`、`mockUserId`） |
| `mockUserId`           | 当前 mock 用户 mid（等价于 `ctx.store.mockUserId`）               |
| `delay()`              | 在 `latencyMs`（默认 80ms）后 resolve — 模拟一次 RPC              |
| `log(ns, m, r, resp?)` | 在控制台打印 `[toy:mock] ns.method req=…`                         |

### 上下文控制

| 方法                                        | 说明                                                                    |
| ------------------------------------------- | ----------------------------------------------------------------------- |
| `toy.enableMock({ latencyMs, mockUserId })` | 启用 mock，可选配置                                                     |
| `toy.mockEnabled()`                         | 当前是否处于 mock 模式                                                  |
| `toy.resetMock()`                           | 仅清空持久化数据，启用标志保持不变                                      |
| `toy.disableMock()`                         | 关闭 mock，恢复 namespace 调用到真实 RPC                                |
| `persistCloud(store)`                       | 将 `store.cloud` 写入 `localStorage`（绕开 `cloud.set()` 时需手动调用） |

---

## API 参考

### `toy` — 平台能力

| 方法                     | 说明                                           |
| ------------------------ | ---------------------------------------------- |
| `toy.ready(timeoutMs?)`  | 等待 `window.toy`，并缓存单例。默认超时 5000ms |
| `toy.isAvailable()`      | 同步检测 `window.toy` 是否存在                 |
| `toy.isSupport(ability)` | 查询平台是否支持某个能力                       |
| `toy.enableMock(opts?)`  | 将 namespace 调用路由到 mock 处理器            |
| `toy.disableMock()`      | 关闭 mock，恢复 namespace 调用到真实 RPC       |
| `toy.mockEnabled()`      | 当前是否处于 mock 模式                         |
| `toy.resetMock()`        | 清空持久化的 mock 数据，启用标志保持不变       |

### Namespace 列表

| Namespace   | 方法                                                                               |
| ----------- | ---------------------------------------------------------------------------------- |
| `rank`      | `submit(req)` · `list(req?)` · `me(req?)`                                          |
| `cloud`     | `get(keys?)` · `set(items)` · `remove(keys)`                                       |
| `user`      | `profile()`                                                                        |
| `author`    | `profile()` · `videos(req)` · `relation()`                                         |
| `video`     | `actions(req)`                                                                     |
| `share`     | `navigate(req)` · `to(req)` · `qrCode(req?)` · `saveImage(req)` · `closeBrowser()` |
| `container` | `onChange(cb)` · `state()` · `setMode(req)`                                        |
| `media`     | `requestCamera(opts?)` · `requestMicrophone()` · `stopMedia(stream)`               |

> 每个 namespace 都暴露 `override(key).mock(handler)` 用于注册 mock 处理器。覆盖目标会按 namespace 声明的能力做类型推导，因此处理器的 `req` 参数类型可被正确推断。

---

## 错误处理

```ts
import {
  ToyNotAvailableError,
  isToyError,
  isDeniedError,
  isToyHostNotReady,
  toErrorMessage,
  normalizeToyError
} from 'bilibili-toy'

try {
  await rank.submit({ score: 100 })
} catch (err) {
  if (err instanceof ToyNotAvailableError) {
    // 不在 Toy 容器中运行
  } else if (isDeniedError(err)) {
    // 用户在平台授权弹窗中拒绝
  } else if (isToyHostNotReady(err)) {
    // Toy 宿主尚未注入元数据，稍后重试
  } else if (isToyError(err)) {
    // 通用 Toy 错误：可读取 err.status / err.code / err.name
  } else {
    // 未知错误
  }
}
```

### 错误帮助函数

| 帮助函数                 | 用途                                            |
| ------------------------ | ----------------------------------------------- |
| `ToyNotAvailableError`   | `window.toy` 缺失或握手超时                     |
| `isToyError(err)`        | 判断一个值是否是 Toy SDK 抛出的错误             |
| `isDeniedError(err)`     | 用户拒绝授权 / 上下文不可用                     |
| `isToyHostNotReady(err)` | 瞬态 `toy id not available on host` 竞态错误    |
| `normalizeToyError(err)` | 用 `[bilibili-toy]` 前缀包装并保留 Toy 错误字段 |
| `toErrorMessage(err)`    | 获取用于展示的字符串（等同于 `formatToyError`） |

---

## 重试策略

```ts
import { withRetry, isRetryableError } from 'bilibili-toy'

// 默认：仅当 ToyDataStatus === 'unavailable' 时重试（指数退避，最多 3 次）
await withRetry(() => rank.submit({ score: 100 }))

// 自定义策略
await withRetry(() => cloud.get(), {
  maxAttempts: 5,
  baseDelayMs: 500,
  shouldRetry: (err) => isToyHostNotReady(err) || isRetryableError(err)
})
```

> **宿主就绪竞态在 namespace 调用层已经自动处理** — `await rank.list()` 遇到 `toy id not available on host` 会透明退避，无需额外调用 `withRetry`。仅在更上层（如网络抖动、`unavailable` 风暴等）才需要手动 `withRetry`。

---

## Mock 基础设施导出

```ts
import {
  MOCK_DEFAULT_USER_ID,
  persistCloud,
  type CloudKV,
  type RankState,
  type MockStore
} from 'bilibili-toy'
```

这些导出供应用层 mock（`src/mock/<namespace>.ts`）复用，方便共享同一套 store 与持久化机制，避免重复实现。SDK 本身保持业务无关 — 用户池、昵称、头像都由应用层维护。

---

## 协议

[MIT](./LICENSE) © [imba97](https://github.com/imba97)
