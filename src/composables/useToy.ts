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
