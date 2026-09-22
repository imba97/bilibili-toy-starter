// filepath: packages/bilibili-toy/src/error.ts
//
// Toy SDK 错误的统一识别与展示。
//
// 官方 d.ts 中错误呈现三种形态：
//   1. `status: ToyDataStatus`     —— 数据类能力（用户/作者/视频互动）
//   2. `code: number`              —— 旧版 http_error envelope
//   3. `name: string`              —— 媒体能力（BusinessDenied 等）
// 本文件只做"形态识别 + 文本归一化"，不判断"是否可重试"。
// 重试判定在 `retry.ts` 里按 ToyDataStatus === 'unavailable' 二次过滤。

export interface ToyErrorLike {
  /** 错误分类标签（旧版 envelope 形态） */
  type?: string
  /** 错误代码（旧版 envelope 形态） */
  code?: number
  /** 数据类能力的整体状态（新版 d.ts 形态） */
  status?: ToySDK.ToyDataStatus
  /** 任意错误都可能被附带的可读文本 */
  message?: string
  /** 媒体类能力的标准错误名 */
  name?: string
}

/** window.toy 不可用（不在 Toy 容器内、SSR、加载超时等）时抛出 */
export class ToyNotAvailableError extends Error {
  constructor() {
    super('[bilibili-toy] window.toy 不可用 —— 请在 B 站 Toy 容器中运行')
    this.name = 'ToyNotAvailableError'
  }
}

/** 把任意错误归一化为带 [bilibili-toy] 前缀的 Error，方便定位。 */
export function normalizeToyError(err: unknown): Error {
  if (err instanceof ToyNotAvailableError) return err
  if (err instanceof Error) {
    if (err.message.startsWith('[bilibili-toy]')) return err
    if (err.message.startsWith('[ToySDK]')) {
      const wrapped = new Error(`[bilibili-toy] ${err.message}`)
      wrapped.name = err.name
      // 显式拷贝 Toy SDK 错误的附加字段，避免 Object.assign 触发 getter
      // 副作用以及丢失不可枚举属性。
      for (const key of ['type', 'code', 'status'] as const) {
        const value = (err as unknown as Record<string, unknown>)[key]
        if (value !== undefined) {
          ;(wrapped as unknown as Record<string, unknown>)[key] = value
        }
      }
      return wrapped
    }
    return err
  }
  return new Error(String(err))
}

/**
 * 判定任意值是否"看起来像" Toy SDK 抛出的错误。
 *
 * 判定边界：以下任一命中即视为 Toy 错误（与 plan 决策 D 一致）：
 *   - `status` 字段存在
 *   - 同时有 `type` 与 `code`（旧版 envelope）
 *   - `name` 字段存在且为字符串
 *
 * 业务侧可根据需要进一步在 `shouldRetry` 中按字段细化。
 */
export function isToyError(err: unknown): err is ToyErrorLike {
  if (typeof err !== 'object' || err === null) return false
  const e = err as Record<string, unknown>
  if (typeof e.status === 'string') return true
  if (typeof e.name === 'string' && e.name.length > 0) return true
  if ('type' in e && typeof e.code === 'number') return true
  return false
}

/**
 * 判定 Toy 错误是否属于"用户拒绝 / 拿不到资料"这一类。
 *
 * 覆盖三种来源：
 *   - 数据类能力的 `ToyDataStatus === 'denied'` —— 用户在数据确认弹窗拒绝
 *   - `unauthorized` / `unsupported` —— 同样无法拿到资料
 *   - 媒体类能力的 `error.name === 'BusinessDenied' | 'NotAllowedError'` —— 摄像头/麦克风被拒
 *
 * **不包括** `toy_context_unavailable`：那是 host 元信息未就绪（与
 * `isToyHostNotReady` 重叠），几百毫秒内自动恢复，不该被业务侧当成"用户拒绝"
 * 去做降级骨架。需要单独判断可用 `isToyHostNotReady`。
 *
 * 业务侧典型用法：用户拒绝授权信息后，在签到按钮旁渲染一个"重新授权用户信息"按钮，
 * 点击时再次调用 `user.profile()` 由平台弹窗。
 */
export function isDeniedError(err: unknown): boolean {
  if (!isToyError(err)) return false
  if (err.status === 'denied') return true
  if (err.status === 'unauthorized') return true
  if (err.status === 'unsupported') return true
  if (err.name === 'BusinessDenied' || err.name === 'NotAllowedError') return true
  return false
}

/** 把 Toy 错误归一化为可展示的字符串 */
export function formatToyError(err: unknown): string {
  if (isToyError(err)) {
    if (err.message) return err.message
    if (err.status) return `Toy 错误：${err.status}`
    if (err.name) return `Toy 错误：${err.name}`
    if (typeof err.code === 'number') return `Toy 错误（${err.code}）`
  }
  if (err instanceof Error) return err.message
  return String(err)
}

/** 业务侧最常用的入口：toast / 错误提示直接调它 */
export function toErrorMessage(err: unknown): string {
  return formatToyError(err)
}

/**
 * Toy host 元信息（toy id）尚未注入完毕 —— Toy 运行时 SDK 在 host 还在加载时
 * 会被调用的能力 reject 此错误。等几百毫秒重试通常即可恢复。
 *
 * 形如 `[ToySDK] toy id not available on host`（也可能不带 `[ToySDK]` 前缀）。
 */
export function isToyHostNotReady(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  return err.message.includes('toy id not available on host')
}
