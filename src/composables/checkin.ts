// filepath: src/composables/checkin.ts
//
// 每日签到领域逻辑（纯函数，可单测）。
//
// 数据模型（用户拍板）：只记累计签到天数，不记具体日期、不记连续天数。
// 排行榜分数 = 累计签到天数（只增不减，与 submitScore 语义天然契合）。
//
// 云存储两个 key，签到成功时一次 setCloudStorage 批量写入（§7-1/§7-2）：
//   ci_total        累计签到天数
//   ci_last_date    上次签到日期 YYYY-MM-DD（本地时间）——仅用于「今日是否已签」判定
//
// 注意：日期取客户端本地时间，用户改系统时间可绕过限制。演示场景可接受。

export const STORAGE_KEYS = {
  total: 'ci_total',
  lastDate: 'ci_last_date'
} as const

export interface CheckinState {
  /** 累计签到天数 */
  total: number
  /** 上次签到日期 YYYY-MM-DD；从未签过为 null */
  lastDate: string | null
}

/** 把 Date 格式化为本地 YYYY-MM-DD */
export function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 今日是否已签到 */
export function isCheckedInToday(state: CheckinState, today: string): boolean {
  return state.lastDate === today
}

export interface CheckinResult {
  /** 签到后的新状态 */
  state: CheckinState
  /** 需要写入云存储的键值对（值统一为字符串） */
  writes: Record<string, string>
}

/** 执行签到。调用方需先确认 isCheckedInToday 为 false。 */
export function performCheckin(state: CheckinState, today: string): CheckinResult {
  const total = state.total + 1
  return {
    state: { total, lastDate: today },
    writes: {
      [STORAGE_KEYS.total]: String(total),
      [STORAGE_KEYS.lastDate]: today
    }
  }
}

/** 从云存储原始键值对解析签到状态（容错：脏数据按 0 / null 处理） */
export function parseCheckinState(raw: Record<string, string>): CheckinState {
  const total = Number(raw[STORAGE_KEYS.total] ?? '0')
  const lastDate = raw[STORAGE_KEYS.lastDate]
  return {
    total: Number.isFinite(total) && total > 0 ? Math.floor(total) : 0,
    lastDate: lastDate && /^\d{4}-\d{2}-\d{2}$/.test(lastDate) ? lastDate : null
  }
}
