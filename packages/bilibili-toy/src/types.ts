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
 * `defineCapability` 的返回类型 —— 链式挂 mock handler。
 *
 *   - `sdk`             window.toy 方法名
 *   - `mock(h)`         挂 handler（替换默认），返回 builder 支持继续链式
 *   - `mock` 的入参类型由 `defineCapability<Req>` 决定，Req 缺省 = void
 *
 * 设计：去掉原本的 `_mock` 内部槽位。`mock()` 用闭包变量持有 handler，路由层
 * 通过 getter 拿，业务侧 `override(key).mock(h)` 仍能原地替换。
 *
 * `Resp` 用 `any`：mock lambda 返回值类型由函数体推导；Resp 仅充当
 * builder ↔ handler 的「无约束桥」，与 lambda 体返回值类型推导互不影响。
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface CapabilityBuilder<Req = void, Resp = any> {
  /** window.toy 上的方法名 */
  readonly sdk: string
  /** 挂 mock handler；返回 builder 可继续链式 */
  mock(handler: MockHandler<Req, Resp>): CapabilityBuilder<Req, Resp>
}

/**
 * mock handler 签名。
 *
 * 与 ToySDK 解耦 —— handler 返回任意形态，TS 类型由 namespace 文件
 * 在 Capability 的 Resp 泛型上保证。ctx 提供 store / 日志 / 延迟。
 *
 * `Req` 缺省 `void`：无参能力（closeBrowser / stopMedia 等）直接写
 *   `() => ({ ... })`，不必再写 `(_req: void) => ...`。
 *
 * `Resp` 缺省 `any`：lambda 返回值由函数体自动推导；Resp 仅作无约束桥。
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MockHandler<Req = void, Resp = any> = (req: Req, ctx: MockCtx) => Resp | Promise<Resp>
