// filepath: src/composables/useToy.ts
//
// 业务侧 Toy 工具 —— 握手状态 + 错误提示。
// 不是 SDK 封装，是业务专属的工具函数。

import { toy } from 'bilibili-toy'
import { ref } from 'vue'

/** Toy 平台是否可用（未 ready 或不可用为 false） */
export const isToyAvailable = ref(false)

/** 初始化 Toy SDK。页面首个 SDK 请求前 await 它即可。 */
export async function initToy(): Promise<void> {
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
  if (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as any).code === RATE_LIMIT_CODE
  ) {
    return '请求过于频繁，请稍后再试'
  }
  return err instanceof Error ? err.message : String(err)
}
