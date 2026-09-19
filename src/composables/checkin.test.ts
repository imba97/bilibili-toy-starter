// filepath: src/composables/checkin.test.ts

import { describe, expect, it } from 'vite-plus/test'
import {
  STORAGE_KEYS,
  formatDate,
  isCheckedInToday,
  parseCheckinState,
  performCheckin
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
