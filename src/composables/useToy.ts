// filepath: src/composables/useToy.ts
//
// 业务侧 Toy 工具 —— 握手状态 + 错误提示。
// 不是 SDK 封装，是业务专属的工具函数。

import { toy } from 'bilibili-toy'
import { ref } from 'vue'

/** Toy 平台是否可用（未 ready 或不可用为 false） */
export const isToyAvailable = ref(false)

/**
 * 初始化 Toy SDK。页面首个 SDK 请求前 await 它即可。
 *
 * dev + mock 模式：main.ts 已调用 toy.enableMock()，namespace 直接走 mock handler，
 * 不依赖 ready() 结果。本函数退化为快速 resolve，避免 dev 模式下 5s 探测等待。
 *
 * 生产模式：调用 toy.ready()，超时抛 ToyNotAvailableError → isToyAvailable=false，
 * 业务侧据此渲染降级骨架。
 */
export async function initToy(): Promise<void> {
  if (toy.mockEnabled()) {
    isToyAvailable.value = true
    return
  }
  // 已经握手成功过就不再探测：业务里有多个入口（每个页面都有登录门卫）都会 await
  // 本函数，重复调 toy.ready() 虽然命中 SDK 内部缓存，但没必要多绕一层。
  if (isToyAvailable.value) return
  try {
    await toy.ready()
    isToyAvailable.value = true
  } catch {
    isToyAvailable.value = false
  }
}

/** 限流错误码 */
const RATE_LIMIT_CODE = 307044

/** 业务侧统一的错误提示文案：限流给中文友好提示 */
export function toErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message.includes('[bilibili-toy]')) {
    return err.message.replace('[bilibili-toy] ', '')
  }
  if (isRateLimitError(err)) {
    return '请求过于频繁，请稍后再试'
  }
  return err instanceof Error ? err.message : String(err)
}

/**
 * 「这次调用是未登录导致的」判定 —— 登录门卫（LoginGate）唯一依赖的判据。
 *
 * 为什么不能只用 `isDeniedError`：数据类能力用 `status: 'unauthorized'` 表达未登录，
 * 但云存储 / 排行榜这类「失败即 reject」的能力，host 是直接抛 Error 的，错误形态是
 * `[ToySDK] cloud storage request failed: 未登录` —— 既没有 `status` 字段，也没有稳定的
 * 错误码。`isDeniedError(err)` 只看 `status`，会漏判这类错误，于是页面上就冒出
 * 「读取签到数据失败：未登录」这种红灯。
 *
 * 判定口径（命中任一即认为需要先登录）：
 *   1. `status === 'unauthorized'` —— SDK 数据类能力的标准形态
 *   2. `status === 'unsupported'` —— 端外手机浏览器：没有登录入口，SDK 会引导打开 App
 *      （区别只体现在文案上，见 isUnsupportedAuthError）
 *   3. `code` 是 401 / -101 —— B 站网关的未登录码（-101 是 account not login）
 *   4. message 里出现 未登录 / 请先登录 / not login / unauthorized
 *      文本匹配是兜底：message 由 host 生成，措辞可能变化，但它**只会用来
 *      决定「展示登录卡片」还是「展示报错」** —— 判错的后果是降级体验，不是数据损坏。
 */
export function isAuthError(err: unknown): boolean {
  if (
    err instanceof Error &&
    /未登录|请先登录|not\s*login|unauthorized|账号未登录/i.test(err.message)
  ) {
    return true
  }
  if (typeof err !== 'object' || err === null) return false
  const e = err as { status?: unknown; code?: unknown; message?: unknown }
  if (e.status === 'unauthorized' || e.status === 'unsupported') return true
  if (typeof e.code === 'number' && (e.code === 401 || e.code === -101)) return true
  return (
    typeof e.message === 'string' && /未登录|请先登录|not\s*login|unauthorized/i.test(e.message)
  )
}

/**
 * 「当前环境根本没登录入口」—— 端外手机浏览器：SDK 会先引导打开 B 站 App。
 * 这时给「点登录」按钮是骗人的，文案要换成「请在 B 站 App 内打开」。
 *
 * 注意只认 SDK 的 `status` 字段：靠 message 里出现 "unsupported" 来猜太脆，
 * 而且真在 App 内运行时不会是这个分支。
 */
export function isUnsupportedAuthError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { status?: unknown }).status === 'unsupported'
  )
}

/**
 * 限流错误判断：B 站 / Toy 网关约定错误码 307044 为限流。
 * 用类型守卫替代 `as any`：先确认是对象、再确认 code 是 number。
 *
 * 设计选择：严格 `code === RATE_LIMIT_CODE`（number），不转换 / 不宽松。
 *   - SDK 在抛出时已经把 code 强制规整为 number（参见 bilibili-toy/src/error.ts），
 *     所以不会遇到字符串 "307044" 或浮点 307044.0。
 *   - 不要"好心"改成 `Number(code) === 307044` 或 `==` —— 一旦 B 站新增邻近码
 *     （如 3070441）会被误判，回归成本远高于现在多写一行类型守卫。
 */
function isRateLimitError(err: unknown): boolean {
  if (typeof err !== 'object' || err === null || !('code' in err)) return false
  const code = (err as { code?: unknown }).code
  return typeof code === 'number' && code === RATE_LIMIT_CODE
}
