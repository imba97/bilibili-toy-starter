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
// ⚠️ 一条铁律：**签到必须「先读后写」**（read-modify-write）。
// 曾经踩过的坑：拿组件里的本地 state（total 可能是初始值 0）直接 +1 写回，
// 一旦那份本地 state 没被云端数据水合过，就会把真实累计天数覆盖成 1 —— 用户的
// 历史记录被清空。所以：
//   - `performCheckin(state, today)` 只负责「给定权威状态 → 新状态 + 写入内容」；
//   - 权威状态只能来自 `cloud.get`，见 `applyCheckin(state, raw, today)`：
//     每次签到都先把云端原始 KV 解析成权威状态，再算增量。
//   - `total` 天然只增：新值永远 = 云端旧值 + 1，绝不从 0 起算。
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

/** `applyCheckin` 的三种结果，调用方据此决定要不要写 / 要不要提示 */
export type CheckinOutcome = 'checked-in' | 'already-checked-in' | 'write-failed'

/** 云端累计天数比排行榜记录少时，自动写回后展示的提示文案 */
export const RESTORED_NOTICE = '检测到累计天数与排行榜记录不一致，已按排行榜记录恢复'

/**
 * 用排行榜分数修复被覆盖的累计天数（数据自愈）。
 *
 * 为什么可以拿排行榜当权威：`submitScore` 的语义是「只保留该榜位历史最高分，
 * 本次更低不覆盖」，所以排行榜分数**只增不减**，不会被「签到把云存储写成 1」
 * 这类 bug 破坏。而 `ci_total` 是可被覆盖的普通 KV —— 一旦被写坏，本地没有任何
 * 备份。两者本应相等（排行榜分数 = 累计签到天数），因此：
 *
 *   云端累计天数 < 排行榜分数  ⇒  云端数据被写坏了，用排行榜分数补回。
 *
 * 只往「更多」的方向修：排行榜分数不大于云端值时一动不动（永不减少累计天数）；
 * 拿不到排行榜分数（rankScore 为 null）或写入失败时，`restored`/`ok` 都是 false，
 * 由调用方决定提示文案。
 *
 * @param raw        刚读到的云存储原始 KV
 * @param rankScore  `rank.me()` 的 score；拿不到传 null
 * @param write      写入函数（注入便于测试）
 * @returns 修复结果；不需要修复时 `restored` 为 false
 */
export async function repairCheckinState(
  raw: Record<string, string>,
  rankScore: number | null,
  write: (writes: Record<string, string>) => Promise<void>
): Promise<{ state: CheckinState; restored: boolean; ok: boolean }> {
  const state = parseCheckinState(raw)
  if (rankScore === null || !Number.isFinite(rankScore)) {
    return { state, restored: false, ok: false }
  }
  // 排行榜分数可能是 0（从未提交过），此时没有可参考的信息
  const recovered = Math.floor(rankScore)
  if (recovered <= 0 || recovered <= state.total) {
    return { state, restored: false, ok: false }
  }
  try {
    // 只写 ci_total：last_date 保持原样（签到日期与累计天数无关，
    // 不能因为修数据就让用户「今天变成已签到」）
    await write({ [STORAGE_KEYS.total]: String(recovered) })
  } catch {
    return { state, restored: false, ok: false }
  }
  return { state: { ...state, total: recovered }, restored: true, ok: true }
}

export interface ApplyCheckinResult {
  /** 云端真值（无论是否签到，都是权威状态，调用方应当用它覆盖本地 state） */
  state: CheckinState
  /** 本次签到产生的写入内容；already-checked-in 时为 null（无需写） */
  writes: Record<string, string> | null
  outcome: CheckinOutcome
}

/**
 * 唯一被允许的签到入口：**读 → 算 → 写**，云端是唯一权威。
 *
 * 顺序刻意是「先读云端、再算增量、最后写」，而不是「拿本地 state 直接 +1 写」：
 *   - 本地 state 可能是初始值 / 过期的（未水合、跨设备、上次读取失败……），
 *     用它当基数是**数据损坏**（把累计 N 天覆盖成 1）而不是显示问题；
 *   - 云端读到的值才是权威，写回的是「云端旧值 + 1」，天然只增。
 *
 * 写失败时**不修改任何远端数据**，并把 outcome 置为 write-failed 交给调用方提示；
 * 此时返回的 state 仍是云端真值，本地不会出现「看起来签到成功」的假象。
 *
 * @param raw   刚读到的云存储原始 KV（调用方负责 `cloud.get`）
 * @param today 本地日期 YYYY-MM-DD（由调用方传入，便于测试）
 */
export async function applyCheckin(
  raw: Record<string, string>,
  today: string,
  write: (writes: Record<string, string>) => Promise<void>
): Promise<ApplyCheckinResult> {
  const state = parseCheckinState(raw)
  if (isCheckedInToday(state, today)) {
    return { state, writes: null, outcome: 'already-checked-in' }
  }
  const result = performCheckin(state, today)
  try {
    await write(result.writes)
  } catch {
    // 写失败：云端没变，如实回报「未签到 + 真值」，绝不假装成功
    return { state, writes: null, outcome: 'write-failed' }
  }
  return { state: result.state, writes: result.writes, outcome: 'checked-in' }
}
