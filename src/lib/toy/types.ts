// filepath: src/lib/toy/types.ts
//
// Bilibili Toy SDK 类型定义（window.toy）。
//
// 签名已对 toy-sdk.js v0.3.5 逆向核实：
//   - submitScore({ score, board? })      score 是整数 [-2^24, 2^24-1]
//   - getRankList({ board?, period?, limit? })
//   - getMyRank({ board?, period? })
//   - getCloudStorage(keys?: string[])     不传读全部；key /^[a-zA-Z0-9_-]{1,128}$/，`__` 前缀保留
//   - setCloudStorage(plainObject)         批量写
//   - removeCloudStorage(keys: string[])
// 若官方 SDK 升级导致不一致，只改本文件与 client.ts。

/** 云存储值：SDK 侧统一按字符串存取 */
export type CloudStorageValue = string

/** 榜单 ID，1-5 的整数（默认 1）。当前演示只用默认榜 */
export type RankBoard = 1 | 2 | 3 | 4 | 5

/** 榜单周期：默认 all */
export type RankPeriod = 'all' | 'month' | 'week' | 'day'

export interface SubmitScoreOptions {
  score: number
  board?: RankBoard
}

export interface RankListOptions {
  board?: RankBoard
  period?: RankPeriod
  limit?: number
}

export interface MyRankOptions {
  board?: RankBoard
  period?: RankPeriod
}

/** 榜单条目（与 SDK getRankList 返回字段对齐） */
export interface RankEntry {
  /** 排名，从 1 开始 */
  rank: number
  /** 用户昵称 */
  uname: string
  /** 头像 URL（可能为空字符串） */
  face?: string
  /** Toy 开放 ID（用于识别「我」） */
  toyOpenId?: string
  score: number
}

export interface MyRank {
  rank: number
  score: number
}

/** 当前用户信息（getUserProfile 返回） */
export interface UserProfile {
  /** 头像 URL（SDK 已做 http→https 修正） */
  avatar: string
  /** 用户昵称 */
  nickname: string
  /** Toy 开放 ID（部分环境可能为空） */
  toyOpenId?: string
}

/** SDK 业务错误 envelope（ToyError extends Error，name === 'ToyError'） */
export interface ToyError {
  type: string
  code: number
  message?: string
}

export function isToyError(error: unknown): error is ToyError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    'code' in error &&
    typeof (error as ToyError).code === 'number'
  )
}

export interface ToySDK {
  /** 批量读取云存储，返回存在的键值对 */
  getCloudStorage(keys?: string[]): Promise<Record<string, CloudStorageValue>>
  /** 批量写入云存储（plain object） */
  setCloudStorage(data: Record<string, CloudStorageValue>): Promise<void>
  /** 删除云存储 key */
  removeCloudStorage(keys: string[]): Promise<void>
  /**
   * 提交排行榜分数。只增不减且幂等：重复提交同分不会覆盖成绩，
   * 但一样消耗共享额度 —— 只在结算事件提交一次（content-checklist §7-4）。
   */
  submitScore(options: SubmitScoreOptions): Promise<void>
  /** 拉取排行榜（不轮询，进页面拉一次 + 用户手动刷新，§7-3） */
  getRankList(options?: RankListOptions): Promise<RankEntry[]>
  /** 我的排名 */
  getMyRank(options?: MyRankOptions): Promise<MyRank>
  /** 当前用户信息。注意：外部移动浏览器不支持（SDK 会 reject unsupported） */
  getUserProfile(): Promise<UserProfile>
}

declare global {
  interface Window {
    toy?: ToySDK
  }
}
