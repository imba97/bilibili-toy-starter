// filepath: src/composables/useLogin.ts
//
// 登录状态机（模块级单例）—— 登录门卫 LoginGate 的数据来源。
//
// 为什么要这一层：签到读云存储、排行榜读我的名次，**都要求已登录**。未登录时直接调
// 只会 reject，把 `[ToySDK] ... 未登录` 原样糊到界面上。正确姿势是「先确认登录态，
// 通过才去读数据」—— 登录态的判定与凭证（profile）统一收敛在本文件。
//
// 四态：
//   unknown     还没判定（首屏初始值）—— 门卫显示 loading，**不渲染页面、不发业务请求**
//   checking    登录握手进行中
//   logged-out  未登录 → 门卫展示引导卡片（等用户点「登录」）
//   logged-in   已登录 → 门卫挂载页面，页面才开始读数据
//
// 两条硬约束决定了本文件的形状：
//
//   1. **未登录时不发起任何数据请求**。业务数据入口（页面 onMounted / store.load）
//      都必须自己再判一次 isLoggedIn —— 详见 index.vue / rank.vue 的注释。
//   2. **平台要求 getUserProfile() 由用户手势触发**（首次调用会弹用户数据确认弹窗）。
//      所以「首次登录」只能由「登录」按钮点击驱动。
//
// 跨刷新保持登录（bug 修复）：登录成功写一个 localStorage 标记（见 session.ts）。
// 下次进页面若看到标记，bootSession() 会**静默**复核一次：
//   - mock 环境（dev / preview）：直接判定已登录，本地开发不用每次点；
//   - 正式环境：调一次 user.profile()。用户已授权过时平台会复用授权、不弹窗；
//     若复核结果显示未登录，就安静地回到引导卡片（不把「未登录」当错误弹给用户）。

import { computed, ref } from 'vue'
import { isDeniedError } from 'bilibili-toy'
import { user } from '@/mock'
import { clearLoginMarker, hasLoginMarker, isMockEnv, setLoginMarker } from './session'
import { initToy, isAuthError, isUnsupportedAuthError, toErrorMessage } from './useToy'

/** 登录态四态取值（本模块内部使用；外部只消费派生的布尔量） */
type LoginStatus = 'unknown' | 'checking' | 'logged-out' | 'logged-in'

/** 当前登录态 —— 初始 unknown：判定完成前既不展示卡片也不渲染页面 */
const status = ref<LoginStatus>('unknown')
/** 登录返回的用户资料（登录成功后由页面消费） */
const profile = ref<ToySDK.UserProfileResp | null>(null)
/** 用户明确拒绝了数据确认（可以再次点按钮由平台重新弹窗） */
const denied = ref(false)
/** 非「未登录」类的真实错误文案（网络 / 服务不可用等），展示在卡片里 */
const error = ref('')

/** 进行中的登录 Promise —— 并发调用共享同一次 RPC，避免重复弹窗 */
let inflight: Promise<boolean> | null = null
/** bootSession 的单次性：无论多少页共享它，整个 SPA 只判定一次 */
let booted: Promise<boolean> | null = null

/**
 * 执行登录（用户点「登录」按钮的唯一入口）。**返回是否已登录**，永不抛错。
 *
 * 必须在 click handler 里直接 await —— 平台要求由用户手势触发，否则未授权用户会被拒。
 *
 * 判定优先级：未登录类错误 → 静默回到 logged-out（由卡片承担引导）；
 * 端外浏览器 → 换文案；其余 → error 展示真实原因。
 */
async function login(): Promise<boolean> {
  if (inflight) return inflight
  status.value = 'checking'
  error.value = ''
  inflight = (async () => {
    try {
      await initToy()
      const me = await user.profile()
      profile.value = me
      denied.value = false
      setLoginMarker()
      status.value = 'logged-in'
      return true
    } catch (err) {
      const wasDenied = isDeniedError(err)
      const unsupported = isUnsupportedAuthError(err)
      const message = toErrorMessage(err)
      markLoggedOut()
      if (isAuthError(err)) {
        // 「还没登录」不是错误状态，是待引导状态：error 留空，卡片安静地展示
        denied.value = wasDenied
        error.value = unsupported ? '当前环境无法登录，请在 B 站 App 内打开' : ''
        return false
      }
      error.value = message
      return false
    } finally {
      inflight = null
    }
  })()
  return inflight
}

/**
 * 首屏判定一次「现在算登录吗」。**整个 SPA 只跑一次**，返回是否已登录，永不抛错。
 *
 * 三种情况：
 *   a) 没有登录标记 → 直接 logged-out（零请求，展示引导卡片）
 *   b) 有标记 + mock 环境 → 直接 logged-in（本地开发不必每次点登录）
 *   c) 有标记 + 正式环境 → 静默调 user.profile() 复核
 *
 * 情况 c 为什么安全：这份标记只可能是「本 Toy 里用户已经同意过数据确认」之后写的，
 * 平台会复用该授权，不会再弹确认框。复核失败（换设备 / 授权过期 / 未登录）就安静
 * 回到引导卡片，不报错、不弹窗。
 */
function bootSession(): Promise<boolean> {
  if (booted) return booted
  booted = (async () => {
    if (!hasLoginMarker()) {
      status.value = 'logged-out'
      return false
    }
    if (isMockEnv()) {
      status.value = 'logged-in'
      return true
    }
    status.value = 'checking'
    try {
      await initToy()
      const me = await user.profile()
      profile.value = me
      denied.value = false
      status.value = 'logged-in'
      return true
    } catch (err) {
      // 包括 denied：授权过但这次没拿到资料 —— 不再自动弹窗打扰，
      // 由页面里的「授权用户信息」按钮承担重新授权
      markLoggedOut()
      if (!isAuthError(err)) error.value = toErrorMessage(err)
      return false
    }
  })()
  return booted
}

/**
 * 把登录态打回未登录 —— 供「登录成功后才发现会话失效」的场景调用：
 * 页面的数据请求若仍以未登录收场，说明判定过时了，回到引导卡片比糊一条
 * `[ToySDK] ... 未登录` 报错更合适。同时清掉标记与用户资料，避免下次刷新又误判。
 */
function markLoggedOut(): void {
  clearLoginMarker()
  profile.value = null
  denied.value = false
  error.value = ''
  status.value = 'logged-out'
}

/**
 * 仅供测试：把模块级单例打回初始状态（含 bootSession 的单次性）。
 *
 * 为什么测试需要它：bootSession 刻意是「整个 SPA 只判定一次」，而 vitest 里
 * 模块级 ref 在 import 时就实例化、同一文件内共享 —— 想验证「有标记 / 无标记」
 * 两条路径就必须能重置这个一次性 Promise。生产代码不要调用。
 */
export function __resetLoginForTests(): void {
  inflight = null
  booted = null
  profile.value = null
  denied.value = false
  error.value = ''
  status.value = 'unknown'
}

export function useLogin() {
  return {
    profile,
    denied,
    error,
    /** 已确认登录 */
    isLoggedIn: computed(() => status.value === 'logged-in'),
    /** 握手 / 登录中（未判定完成也算：卡片按钮据此显示 loading 并禁用） */
    isPending: computed(() => status.value === 'checking' || status.value === 'unknown'),
    /** 需要展示登录引导卡片（确认未登录） */
    needsLogin: computed(() => status.value === 'logged-out'),
    /** 用户点「登录」 */
    login,
    /** 进页面时首屏判定一次（幂等） */
    bootSession,
    markLoggedOut
  }
}
