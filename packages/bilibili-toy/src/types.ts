// filepath: packages/bilibili-toy/src/types.ts
//
// bilibili-toy 内部类型（与 ToySDK 公开类型解耦）。
//
// 设计：
//   - ToySDK.* 是官方 d.ts 的形态（玩具平台协议），我们只消费
//   - 本文件描述 SDK 这层"namespace 描述符 + mock handler"的私有协议
//   - 当 ToySDK 改名 / 加字段时，本文件不动，只动 namespaces/* 内的 mock 返回

// 转发 export，避免相对路径深嵌套
import type { MockCtx } from './mock/ctx'
export type { MockCtx } from './mock/ctx'

/**
 * 单个能力的描述。
 *
 * - `sdk`: window.toy 上的方法名（透传）
 * - `mock`: 可选 mock handler，dev / 预览模式下由 defineNamespace 自动路由到此
 */
export interface Capability<Req = unknown, Resp = unknown> {
  /** window.toy 上的方法名 */
  sdk: string
  /** dev 模式下的 mock handler；未实现时 dev 下会走真 SDK（可能 RPC 失败） */
  mock?: MockHandler<Req, Resp>
}

/**
 * useCapability 的返回类型。
 *
 * builder 不是 `Capability` 子类型 —— 它通过 `_mock` 内部槽位保存 handler
 *（如果调用了 `.mock(fn)`），而不是 `mock` 字段。这样接口上
 *   - `sdk` 是 value 字段
 *   - `mock` 是 method（用于链式挂 handler）
 *   - `_mock` 是 handler 真正存储位置
 *
 * 为什么不直接复用 `Capability.mock` 字段：同名成员在 TS interface 合并中冲突，
 * 且 method 与 MockHandler 是不同形态（method 自带 `this`，MockHandler 是二元函数）。
 */
export interface CapabilityBuilder<Req = unknown, Resp = unknown> {
  /** window.toy 上的方法名 */
  sdk: string
  /** 链式挂 mock handler；调用后内部 `_mock` 槽位填入 handler */
  mock: (handler: MockHandler<Req, Resp>) => CapabilityBuilder<Req, Resp>
  /** 内部槽位：已挂的 mock handler（defineNamespace 路由时使用） */
  _mock?: MockHandler<Req, Resp>
}

/**
 * mock handler 签名。
 *
 * 与 ToySDK 解耦 —— handler 返回任意形态，TS 类型由 namespace 文件
 * 在 Capability 的 Resp 泛型上保证。ctx 提供 store / 日志 / 延迟。
 */
export type MockHandler<Req = unknown, Resp = unknown> = (
  req: Req,
  ctx: MockCtx
) => Resp | Promise<Resp>
