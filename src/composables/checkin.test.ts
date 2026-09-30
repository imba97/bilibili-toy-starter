// filepath: src/composables/checkin.test.ts

import { describe, expect, it, vi } from 'vite-plus/test'
import {
  STORAGE_KEYS,
  applyCheckin,
  formatDate,
  isCheckedInToday,
  parseCheckinState,
  performCheckin,
  repairCheckinState
} from './checkin'

describe('formatDate', () => {
  it('formats local date as YYYY-MM-DD with zero padding', () => {
    expect(formatDate(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(formatDate(new Date(2026, 8, 18))).toBe('2026-09-18')
    expect(formatDate(new Date(2026, 11, 31))).toBe('2026-12-31')
  })
})

describe('isCheckedInToday', () => {
  it('is true only when lastDate equals today', () => {
    expect(isCheckedInToday({ total: 1, lastDate: '2026-09-18' }, '2026-09-18')).toBe(true)
    expect(isCheckedInToday({ total: 1, lastDate: '2026-09-17' }, '2026-09-18')).toBe(false)
    expect(isCheckedInToday({ total: 0, lastDate: null }, '2026-09-18')).toBe(false)
  })
})

describe('performCheckin', () => {
  it('first check-in goes from 0 to 1 and stamps today', () => {
    const r = performCheckin({ total: 0, lastDate: null }, '2026-09-18')
    expect(r.state).toEqual({ total: 1, lastDate: '2026-09-18' })
    expect(r.writes).toEqual({ [STORAGE_KEYS.total]: '1', [STORAGE_KEYS.lastDate]: '2026-09-18' })
  })

  it('accumulates total regardless of gap (no streak concept)', () => {
    const r = performCheckin({ total: 10, lastDate: '2026-01-01' }, '2026-09-18')
    expect(r.state.total).toBe(11)
    expect(r.state.lastDate).toBe('2026-09-18')
  })

  it('writes are all strings (cloud storage contract)', () => {
    const r = performCheckin({ total: 4, lastDate: '2026-09-17' }, '2026-09-18')
    for (const v of Object.values(r.writes)) expect(typeof v).toBe('string')
  })
})

describe('parseCheckinState', () => {
  it('parses valid raw storage', () => {
    expect(parseCheckinState({ ci_total: '7', ci_last_date: '2026-09-18' })).toEqual({
      total: 7,
      lastDate: '2026-09-18'
    })
  })

  it('tolerates missing / dirty data', () => {
    expect(parseCheckinState({})).toEqual({ total: 0, lastDate: null })
    expect(parseCheckinState({ ci_total: 'abc', ci_last_date: 'not-a-date' })).toEqual({
      total: 0,
      lastDate: null
    })
    expect(parseCheckinState({ ci_total: '-3' })).toEqual({ total: 0, lastDate: null })
    expect(parseCheckinState({ ci_total: '3.9' })).toEqual({ total: 3, lastDate: null })
  })
})

// ---------------------------------------------------------------------------
// applyCheckin —— 「签到绝不能覆盖历史天数」的回归防线
// ---------------------------------------------------------------------------

/** 记录写入内容的替身；显式标注入参类型，便于断言写回了什么 */
const spyWrite = () => vi.fn<(writes: Record<string, string>) => Promise<void>>(async () => {})

describe('applyCheckin（读-算-写，云端为唯一权威）', () => {
  it('以云端为基数累加，而不是从 0 起算', async () => {
    const write = spyWrite()
    // 云端真实值 42 天，昨天签过
    const r = await applyCheckin(
      { ci_total: '42', ci_last_date: '2026-09-17' },
      '2026-09-18',
      write
    )

    expect(r.outcome).toBe('checked-in')
    expect(r.state).toEqual({ total: 43, lastDate: '2026-09-18' })
    expect(write).toHaveBeenCalledWith({
      [STORAGE_KEYS.total]: '43',
      [STORAGE_KEYS.lastDate]: '2026-09-18'
    })
  })

  it('回归：本地状态是 0/过期时，写回的仍是「云端 + 1」而不是 1', async () => {
    const write = spyWrite()
    // 这是历史事故的复现输入：调用方本地 state 是空的（没水合成功），
    // ci_last_date 缺失即「从未签到」；云存储只存字符串，所以不传 null。
    const r = await applyCheckin({ ci_total: '42' }, '2026-09-18', write)

    expect(r.state.total).toBe(43)
    expect(write.mock.calls[0]?.[0]).toMatchObject({ [STORAGE_KEYS.total]: '43' })
    expect(write.mock.calls[0]?.[0]?.[STORAGE_KEYS.total]).not.toBe('1')
  })

  it('今天已签过：直接返回云端真值，不产生任何写入', async () => {
    const write = spyWrite()
    const r = await applyCheckin(
      { ci_total: '42', ci_last_date: '2026-09-18' },
      '2026-09-18',
      write
    )

    expect(r.outcome).toBe('already-checked-in')
    expect(r.writes).toBeNull()
    expect(r.state).toEqual({ total: 42, lastDate: '2026-09-18' })
    expect(write).not.toHaveBeenCalled()
  })

  it('云端为空（首次签到）：从 0 到 1', async () => {
    const write = spyWrite()
    const r = await applyCheckin({}, '2026-09-18', write)

    expect(r.outcome).toBe('checked-in')
    expect(r.state).toEqual({ total: 1, lastDate: '2026-09-18' })
  })

  it('写入失败：如实回报 write-failed，且返回的仍是云端真值（不假装成功）', async () => {
    const write = vi.fn<(writes: Record<string, string>) => Promise<void>>(async () => {
      throw new Error('boom')
    })
    const r = await applyCheckin(
      { ci_total: '42', ci_last_date: '2026-09-17' },
      '2026-09-18',
      write
    )

    expect(r.outcome).toBe('write-failed')
    expect(r.writes).toBeNull()
    expect(r.state).toEqual({ total: 42, lastDate: '2026-09-17' })
  })
})

// ---------------------------------------------------------------------------
// repairCheckinState —— 「云存储被写坏成 1，排行榜还留着 6」的自愈
// ---------------------------------------------------------------------------

describe('repairCheckinState（用只增不减的排行榜分数修复云存储）', () => {
  it('复现现场：云端 1 天、排行榜 6 天 → 修复成 6 天并写回云存储', async () => {
    const write = spyWrite()
    const r = await repairCheckinState({ ci_total: '1', ci_last_date: '2026-09-30' }, 6, write)

    expect(r.restored).toBe(true)
    expect(r.ok).toBe(true)
    expect(r.state.total).toBe(6)
    expect(write).toHaveBeenCalledWith({ [STORAGE_KEYS.total]: '6' })
    // 只修累计天数，不能顺手把用户标成「今天已签到」
    expect(write.mock.calls[0]?.[0]).not.toHaveProperty(STORAGE_KEYS.lastDate)
    expect(r.state.lastDate).toBe('2026-09-30')
  })

  it('数据本来就一致：不动任何东西，也不写云存储', async () => {
    const write = spyWrite()
    const r = await repairCheckinState({ ci_total: '6', ci_last_date: '2026-09-30' }, 6, write)

    expect(r.restored).toBe(false)
    expect(r.state.total).toBe(6)
    expect(write).not.toHaveBeenCalled()
  })

  it('排行榜分数更低时绝不倒退（排行榜分数可能落后于本地）', async () => {
    const write = spyWrite()
    const r = await repairCheckinState({ ci_total: '9' }, 6, write)

    expect(r.restored).toBe(false)
    expect(r.state.total).toBe(9)
    expect(write).not.toHaveBeenCalled()
  })

  it('拿不到排行榜分数（读取失败 / 从未上榜）时不修、不写', async () => {
    const write = spyWrite()

    const failed = await repairCheckinState({ ci_total: '1' }, null, write)
    expect(failed.restored).toBe(false)
    expect(failed.ok).toBe(false)
    expect(failed.state.total).toBe(1)

    const never = await repairCheckinState({ ci_total: '1' }, 0, write)
    expect(never.restored).toBe(false)
    expect(never.state.total).toBe(1)

    expect(write).not.toHaveBeenCalled()
  })

  it('修复写入失败：返回未修复的云端真值，不谎报成功', async () => {
    const write = vi.fn<(writes: Record<string, string>) => Promise<void>>(async () => {
      throw new Error('boom')
    })
    const r = await repairCheckinState({ ci_total: '1' }, 6, write)

    expect(r.restored).toBe(false)
    expect(r.ok).toBe(false)
    expect(r.state.total).toBe(1)
  })
})
