// filepath: src/lib/toy/client.ts
//
// Toy SDK 访问层：线上环境用 window.toy（由 index.html 的 toy-sdk.js 注入），
// 本地 dev 无 window.toy 时降级为 localStorage mock，页面代码零感知。
//
// 所有方法包了 withRateLimitRetry：命中 307044 共享额度限流时指数退避。
// ⚠️ 若真实 SDK 签名与本文件不符，只改这里和 types.ts。

import { isToyError, type MyRank, type RankEntry, type ToyError, type ToySDK } from './types'
import { isRateLimited, withRateLimitRetry } from './retry'
import { ref, type Ref } from 'vue'

// ---------------------------------------------------------------------------
// localStorage mock（本地开发）
// ---------------------------------------------------------------------------

const MOCK_CLOUD_PREFIX = 'mock-toy:cloud:'
const MOCK_RANK_KEY = 'mock-toy:rank'
const MOCK_MY_SCORE_KEY = 'mock-toy:my-score'

interface MockRankRow {
  uname: string
  score: number
}

const MOCK_NAMES = [
  '暗中观察',
  '大会员本员',
  '三连侠',
  '弹幕护体',
  '下次一定',
  '前排吃瓜',
  '硬核会员',
  '风纪委员',
  '鸽子精',
  '小镇做题家'
]

function mockCloudRead(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(MOCK_CLOUD_PREFIX + 'data') ?? '{}') as Record<
      string,
      string
    >
  } catch {
    return {}
  }
}

function mockCloudWrite(data: Record<string, string>): void {
  localStorage.setItem(MOCK_CLOUD_PREFIX + 'data', JSON.stringify(data))
}

function readMockRankRows(): MockRankRow[] {
  let rows: MockRankRow[]
  try {
    const raw = localStorage.getItem(MOCK_RANK_KEY)
    if (raw) {
      rows = (JSON.parse(raw) as Array<MockRankRow | { name: string; score: number }>).map(
        (r): MockRankRow =>
          // 兼容旧版 mock 数据（字段名曾是 name）
          'uname' in r ? r : { uname: r.name, score: r.score }
      )
    } else {
      // 首次生成一批假玩家，分数 1~45 天
      rows = MOCK_NAMES.map((uname) => ({
        uname,
        score: 1 + Math.floor(Math.random() * 45)
      }))
      localStorage.setItem(MOCK_RANK_KEY, JSON.stringify(rows))
    }
  } catch {
    rows = []
  }
  // 把「我」的分数合进榜单一起排序
  const myScore = Number(localStorage.getItem(MOCK_MY_SCORE_KEY) ?? '0')
  const merged = myScore > 0 ? [...rows, { uname: '我', score: myScore }] : rows
  return merged.sort((a, b) => b.score - a.score)
}

/** mock 环境下「我」的标识字段，页面据此高亮自己 */
export const MOCK_ME_UNAME = '我'

const mockSDK: ToySDK = {
  async getCloudStorage(keys) {
    const all = mockCloudRead()
    if (!keys) return all
    const out: Record<string, string> = {}
    for (const key of keys) {
      if (key in all) out[key] = all[key]
    }
    return out
  },
  async setCloudStorage(data) {
    mockCloudWrite({ ...mockCloudRead(), ...data })
  },
  async removeCloudStorage(keys) {
    const all = mockCloudRead()
    for (const key of keys) delete all[key]
    mockCloudWrite(all)
  },
  async submitScore({ score }) {
    // 与真实 SDK 语义一致：只增不减、幂等
    const current = Number(localStorage.getItem(MOCK_MY_SCORE_KEY) ?? '0')
    if (score > current) localStorage.setItem(MOCK_MY_SCORE_KEY, String(score))
  },
  async getRankList() {
    return readMockRankRows().map((row, i): RankEntry => ({
      rank: i + 1,
      uname: row.uname,
      toyOpenId: row.uname === MOCK_ME_UNAME ? 'mock-me' : undefined,
      score: row.score
    }))
  },
  async getMyRank() {
    const rows = readMockRankRows()
    const myScore = Number(localStorage.getItem(MOCK_MY_SCORE_KEY) ?? '0')
    const idx = rows.findIndex((r) => r.uname === MOCK_ME_UNAME)
    const result: MyRank =
      idx >= 0 ? { rank: idx + 1, score: myScore } : { rank: 0, score: myScore }
    return result
  },
  async getUserProfile() {
    return {
      avatar: '',
      nickname: '本地调试用户',
      toyOpenId: 'mock-me'
    }
  }
}

// ---------------------------------------------------------------------------
// 入口
//
// SDK 有两种「不可用」形态：
//   1. window.toy 根本没注入（script 加载失败 / 本地 file:// 直开）
//   2. toy-sdk.js 加载成功，但它要与 B 站父页面 iframe 握手 —— 本地 dev
//      不在 iframe 里，SDK 内部握手超时后 reject（报错类似
//      "[ToySDK] handshake with parent timed out"）
// 两种形态都降级到 mock。做法：真实 SDK 调用前统一过 ensureReady()，
// 先发起一次握手探测（getMyRank 只读、无副作用），失败即永久切换 mock。
// ---------------------------------------------------------------------------

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

function realSDK(toyImpl: ToySDK): ToySDK {
  return {
    getCloudStorage: (keys) => withRateLimitRetry(() => toyImpl.getCloudStorage(keys)),
    setCloudStorage: (data) => withRateLimitRetry(() => toyImpl.setCloudStorage(data)),
    removeCloudStorage: (keys) => withRateLimitRetry(() => toyImpl.removeCloudStorage(keys)),
    submitScore: (options) => withRateLimitRetry(() => toyImpl.submitScore(options)),
    getRankList: (options) => withRateLimitRetry(() => toyImpl.getRankList(options)),
    getMyRank: (options) => withRateLimitRetry(() => toyImpl.getMyRank(options)),
    getUserProfile: () => withRateLimitRetry(() => toyImpl.getUserProfile())
  }
}

/** 当前是否运行在 mock 模式（本地 dev / SDK 握手失败）。toyReady() 后才有最终值。 */
export const isMockEnvRef: Ref<boolean> = ref(typeof window === 'undefined' || !window.toy)

let resolved: ToySDK | null = isMockEnvRef.value ? mockSDK : null
let readyPromise: Promise<void> | null = null

async function handshake(impl: ToySDK): Promise<void> {
  // 竞速：SDK 自身 waitReady 超时是 10s，这里放宽到 12s 兜底。
  // preview 容器握手可能慢于本地 dev，5s 会把 preview 误杀成 mock。
  await Promise.race([
    impl.getMyRank(),
    sleep(12000).then(() => Promise.reject(new Error('toy sdk handshake timeout')))
  ])
}

/** 等待 SDK 环境就绪。页面发首个 SDK 请求前 await 它即可。 */
export function toyReady(): Promise<void> {
  if (!readyPromise) {
    readyPromise = (async () => {
      if (resolved) return
      const candidate = realSDK(window.toy as ToySDK)
      try {
        await handshake(candidate)
        resolved = candidate
      } catch {
        resolved = mockSDK
        isMockEnvRef.value = true
      }
    })()
  }
  return readyPromise
}

function ensure(): ToySDK {
  if (!resolved) throw new Error('Toy SDK 尚未就绪：请先 await toyReady()')
  return resolved
}

export const toy: ToySDK = {
  getCloudStorage: (keys) => ensure().getCloudStorage(keys),
  setCloudStorage: (data) => ensure().setCloudStorage(data),
  removeCloudStorage: (keys) => ensure().removeCloudStorage(keys),
  submitScore: (options) => ensure().submitScore(options),
  getRankList: (options) => ensure().getRankList(options),
  getMyRank: (options) => ensure().getMyRank(options),
  getUserProfile: () => ensure().getUserProfile()
}

// ---------------------------------------------------------------------------
// 错误格式化：把 SDK envelope / 普通 Error 统一成可展示的中文提示
// ---------------------------------------------------------------------------

export function formatToyError(error: unknown): string {
  if (isToyError(error)) {
    const e = error as ToyError
    return e.message ?? `请求失败（${e.code}）`
  }
  if (error instanceof Error) return error.message
  return String(error)
}

/** 面向用户的错误提示：限流给专属文案，其余走 formatToyError */
export function toErrorMessage(error: unknown): string {
  return isRateLimited(error) ? '请求过于频繁，请稍后再试' : formatToyError(error)
}
