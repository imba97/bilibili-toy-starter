// filepath: packages/bilibili-toy/src/mock/store.ts
//
// mock 共享状态：cloud KV、签到天数、rank 分数。
//
// 设计：每个 toy 实例一个 store，dev 模式下整个 SPA 共用同一份（模块单例）。
// 业务侧可通过 toy.resetMock() 清空。
//
// 持久化：cloud KV 与 rank 分数会写入 localStorage，刷新页面或关闭浏览器后再打开
// 仍能恢复（与 toy-cli 的"模拟云存储"语义一致；正式 SDK 的云存储是 RPC，不存在持久化问题）。

/** 模拟云存储的 KV（实际 ToySDK 是异步 RPC，此处用 Map 同步 + 返回时模拟 Promise） */
export type CloudKV = Map<string, string>

/** rank 维度状态 —— 由 cloud KV 的 ci_total 实时计算，不再独立持久化。 */
export interface RankState {
  /** 当前 mock 用户的分数（= ci_total） */
  score: number
  /** 当前 mock 用户在榜单中的名次 */
  rank: number
}

export interface MockStore {
  cloud: CloudKV
  rank: RankState
  /** mock 当前访问用户的 mid（默认见 MOCK_DEFAULT_USER_ID） */
  mockUserId: number
}

/** mock 默认用户 mid —— 与 mock/data.ts 的 MOCK_SELF_AVATAR / MOCK_SELF_NICKNAME 对应 */
export const MOCK_DEFAULT_USER_ID = 2198461

// localStorage key 前缀，避免与宿主业务冲突
const LS_PREFIX = 'bilibili-toy:mock:'
const LS_CLOUD = `${LS_PREFIX}cloud`

/**
 * 安全读写 localStorage —— SSR/隐私模式下 localStorage 抛错则降级为 null。
 * 不抛错：mock 必须永远可用，否则会污染业务。
 */
function readLS(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null
  } catch {
    return null
  }
}

function writeLS(key: string, value: string): void {
  try {
    globalThis.localStorage?.setItem(key, value)
  } catch {
    // 配额满 / 隐私模式 → 静默忽略，Map 内存态仍可用
  }
}

function removeLS(key: string): void {
  try {
    globalThis.localStorage?.removeItem(key)
  } catch {
    // ignore
  }
}

/** 从 localStorage 恢复 cloud KV；缺失则留空（首次进入累计天数为 0）。 */
function loadCloudKV(): CloudKV {
  const raw = readLS(LS_CLOUD)
  const map = new Map<string, string>()
  if (raw) {
    try {
      const obj = JSON.parse(raw) as Record<string, string>
      for (const [k, v] of Object.entries(obj)) map.set(k, v)
    } catch {
      // 脏数据按空 store 处理
    }
  }
  return map
}

/** 从 cloud KV 实时算出 rank 状态 —— 单一数据源保证签到页 / 排行榜显示一致。 */
function deriveRank(cloud: CloudKV): RankState {
  const raw = cloud.get('ci_total')
  const score = raw !== undefined && /^\d+$/.test(raw) ? Number(raw) : 0
  return { score, rank: 0 }
}

/** 把当前 cloud Map 整体回写 localStorage（cloud mock set/remove 时调用） */
export function persistCloud(cloud: CloudKV): void {
  writeLS(LS_CLOUD, JSON.stringify(Object.fromEntries(cloud)))
}

/** 业务侧 toy.resetMock() 用：清空 localStorage + 重建默认 store */
export function clearPersistedMock(): void {
  removeLS(LS_CLOUD)
}

/** 创建默认 mock store。签到累计从 0 开始，让首次进入看到真实"零基础"页面。 */
export function createMockStore(): MockStore {
  const cloud = loadCloudKV()
  return {
    cloud,
    rank: deriveRank(cloud),
    mockUserId: MOCK_DEFAULT_USER_ID
  }
}
