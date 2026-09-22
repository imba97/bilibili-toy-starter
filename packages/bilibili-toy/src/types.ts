// filepath: packages/bilibili-toy/src/types.ts
//
// bilibili-toy 内部类型（与 ToySDK 公开类型解耦）。
//
// 设计：
//   - ToySDK.* 是官方 d.ts 的形态（玩具平台协议），我们只消费
//   - 本文件描述 SDK 这层"namespace 描述符 + mock handler"的私有协议
//   - 当 ToySDK 改名 / 加字段时，本文件不动，只动 namespaces/* 内的 mock 返回

import type { MockCtx } from './mock/ctx'
export type { MockCtx } from './mock/ctx'

/**
 * 单个能力的运行时描述（闭包持有 mock handler）。
 *
 * - `sdk`: window.toy 上的方法名（透传）
 * - 真正的 mock handler 由 `defineCapability` 内部闭包持有，类型层不暴露
 *
 * 本接口不带 Req/Resp 泛型 —— 它是「描述」而不是「构建」，
 * Req/Resp 泛型只在 `CapabilityBuilder` / `MockHandler` 上有意义。
 */
export interface Capability {
  /** window.toy 上的方法名 */
  sdk: string
}

/**
 * 把 Resp 解开为消费方拿到的最终 Promise<Awaited<Resp>>。
 *
 * 例：handler 返回 `{ score: 0 }` → 消费方 `rank.submit(...)` 拿到 `Promise<{ score: number }>`
 * 例：handler 返回 `Promise<undefined>` → 消费方拿到 `Promise<void>`
 *
 * 默认 `unknown`：不写 Resp 时拿到 `Promise<unknown>`，迫使消费方明确断言；
 * 避免与「项目禁用 any」的约束冲突。
 */
export type AwaitedPromise<Resp = unknown> = Promise<Awaited<Resp>>

/**
 * `defineCapability` 的返回类型 —— 链式挂 mock handler。
 *
 *   - `sdk`             window.toy 方法名
 *   - `mock(h)`         挂 handler（替换默认），返回新 builder 支持继续链式
 *   - `mock` 的入参类型由 `defineCapability<Req>` 决定，Req 缺省 = void
 *   - `mock` 的返回类型回填到新 builder 的 Resp 泛型，让 namespace 方法拿到精确签名
 *
 * `Resp` 从 `mock(h)` 的 `Awaited<ReturnType<H>>` 推导：
 *   - `defineCapability<Req>('foo').mock(h)` → 新 builder 的 Resp = Awaited<ReturnType<typeof h>>
 *   - 不调 `.mock(h)` 时 Resp 仍是 unknown（namespace 方法签名回到 Promise<unknown>，
 *     调用方需要自己断言；典型场景是 `media.requestCamera` 这种「无内置 mock、走透传」）
 *
 * 设计：去掉原本的 `_mock` 内部槽位。`mock()` 用闭包变量持有 handler，路由层
 * 通过 getter 拿，业务侧 `override(key).mock(h)` 仍能原地替换。
 */
/**
 * phantom field —— 仅承载 Resp 类型（让 defineNamespace 通过 builder 类型
 * 推导出 `(req?: Req) => Promise<Resp>`），运行时永远不会被读取。
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface CapabilityBuilder<Req = void, Resp = unknown> {
  /** window.toy 上的方法名 */
  readonly sdk: string
  /**
   * 类型层 phantom：从未被运行时读取，仅让 Resp 泛型在 builder 上有承载点，
   * 供 `defineNamespace` 推导方法签名。
   */
  readonly _resp?: Resp
  /**
   * 挂 mock handler；返回新 builder，新 Resp = Awaited<R>，R 从 handler 的
   * 返回类型反推。
   *
   * 注意：不能用 `<H extends (req: Req, ctx: MockCtx) => any>(handler: H)`
   * 然后 `ReturnType<H>` —— H 的形参上界会把 ReturnType<H> 擦成 any，
   * 实参的真实返回类型进不来。改用「无约束 R」+「handler 类型签名在形参
   * 位置上下文推断 R」的模式，让 TS 直接从 `(req): ToySDK.X => ({...})`
   * 这种实参标注拿 Resp。
   *
   * Req 类型校验由 handler 形参 `(req: Req, ctx: MockCtx)` 上下文承担。
   */
  mock<R>(handler: (req: Req, ctx: MockCtx) => R): CapabilityBuilder<Req, Awaited<R>>
}

/**
 * mock handler 签名。
 *
 * 形式 `(req, ctx) => unknown`：
 *   - handler 实际返回值由调用方按 ToySDK 契约返回，类型层不约束
 *   - 最终返回类型靠 `.mock(h)` 内部 `Awaited<ReturnType<H>>` 从函数体推导，
 *     再回填到 builder 的 Resp 泛型
 *
 * `Req` 缺省 `void`：无参能力（closeBrowser / stopMedia 等）直接写
 *   `() => ({ ... })`，不必再写 `(_req: void) => ...`。
 */
export type MockHandler<Req = void> = (req: Req, ctx: MockCtx) => unknown
