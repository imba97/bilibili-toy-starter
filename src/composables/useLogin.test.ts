// filepath: src/composables/useLogin.test.ts
//
// 登录状态机验证（mock SDK 真跑，不打桩）：
//   - 初始即「未登录」—— 首屏零 RPC，这是「不要直接报错」的前提
//   - 点登录成功 → logged-in + profile
//   - 平台报「未登录」→ 回到 logged-out 且 error 为空（引导卡片安静展示，不出现红色报错）
//   - 端外浏览器（unsupported）→ 换成「请在 B 站 App 内打开」
//   - 非登录类错误（网络炸了）→ 如实写进 error
//   - 未登录后调 markLoggedOut() → 清理资料，重新回到引导卡片
//
// useLogin 的 ref 是模块级单例：本文件全程共用一个，靠 beforeEach 复位。

import { beforeEach, describe, expect, it } from 'vite-plus/test'
import { toy, user } from 'bilibili-toy'
import '@/mock'
import { clearLoginMarker, hasLoginMarker, isMockEnv, setLoginMarker } from './session'
import { isAuthError } from './useToy'
import { __resetLoginForTests, useLogin } from './useLogin'

// mock 模式下 namespace 调用不依赖 window.toy；node 环境（vitest）下也能跑。
// 必须放在任何 namespace 调用之前。
toy.enableMock()

/**
 * 临时替换 user.profile 的 handler。
 *
 * SDK 的 mock 槽位是每个 capability 闭包私有的，从外面拿不到「原 handler」引用；
 * 但 `user.override(key)` 返回的 builder 既有 `.mock(h)`（挂新 handler）又能读出
 * 当前 handler —— 用这一对做「读旧 → 写新 → 写回旧」的原地还原，不污染其他测试文件。
 */
function withProfileHandler<R>(handler: (req: void, ctx: unknown) => R) {
  const builder = user.override('profile') as unknown as {
    mock: unknown
    _getMock?: () => unknown
  }
  const original = builder._getMock?.()
  user.override('profile').mock(handler as never)
  return () => {
    user.override('profile').mock(original as never)
  }
}

const login = useLogin()

describe('useLogin 登录状态机', () => {
  beforeEach(() => {
    login.markLoggedOut()
  })

  it('初始即未登录：首屏不发任何探测请求，直接展示引导卡片', () => {
    expect(login.isLoggedIn.value).toBe(false)
    expect(login.needsLogin.value).toBe(true)
    expect(login.isPending.value).toBe(false)
    expect(login.profile.value).toBeNull()
    expect(login.error.value).toBe('')
  })

  it('点登录成功 → logged-in，并把 profile 留给页面消费', async () => {
    const ok = await login.login()

    expect(ok).toBe(true)
    expect(login.isLoggedIn.value).toBe(true)
    expect(login.profile.value?.nickname).toBeTruthy()
  })

  it('平台报「未登录」→ 回到未登录态，且不产生错误文案（卡片安静展示）', async () => {
    const restore = withProfileHandler(() => {
      throw new Error('[ToySDK] cloud storage request failed: 未登录')
    })
    try {
      const ok = await login.login()

      expect(ok).toBe(false)
      expect(login.needsLogin.value).toBe(true)
      expect(login.error.value).toBe('')
      expect(login.profile.value).toBeNull()
    } finally {
      restore()
    }
  })

  it('端外浏览器（unsupported）→ 文案引导去 B 站 App，而不是红字报错', async () => {
    const restore = withProfileHandler(() => {
      throw Object.assign(new Error('unsupported'), { status: 'unsupported' })
    })
    try {
      const ok = await login.login()

      expect(ok).toBe(false)
      expect(login.needsLogin.value).toBe(true)
      expect(login.error.value).toContain('B 站 App')
    } finally {
      restore()
    }
  })

  it('非登录类失败（网络）→ 如实写进 error，供卡片提示', async () => {
    const restore = withProfileHandler(() => {
      throw Object.assign(new Error('依赖服务不可用'), { status: 'unavailable' })
    })
    try {
      const ok = await login.login()

      expect(ok).toBe(false)
      expect(login.needsLogin.value).toBe(true)
      expect(login.error.value).toContain('依赖服务不可用')
    } finally {
      restore()
    }
  })

  it('登录成功后会话失效：markLoggedOut 清掉资料并回到引导卡片', async () => {
    await login.login()
    expect(login.isLoggedIn.value).toBe(true)

    login.markLoggedOut()

    expect(login.isLoggedIn.value).toBe(false)
    expect(login.needsLogin.value).toBe(true)
    expect(login.profile.value).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// 跨刷新保持登录 —— 「每次都需要登录」的回归防线
// ---------------------------------------------------------------------------

describe('登录态跨刷新保持', () => {
  beforeEach(() => {
    clearLoginMarker()
    // bootSession 是一次性的（整个 SPA 只判定一次），测试里要逐条重置才能覆盖两条路径
    __resetLoginForTests()
  })

  it('登录成功会写入标记（刷新后据此免登录）', async () => {
    // 刷新前的状态：只有内存里的 logged-in，storage 里什么都没有
    expect(hasLoginMarker()).toBe(false)

    await login.login()

    // 刷新后新进程能读到这个标记
    expect(hasLoginMarker()).toBe(true)
  })

  it('登录失败不写标记 —— 否则下次刷新会误判成已登录', async () => {
    const restore = withProfileHandler(() => {
      throw new Error('[ToySDK] rank request failed: 未登录')
    })
    try {
      await login.login()
      expect(hasLoginMarker()).toBe(false)
    } finally {
      restore()
    }
  })

  it('markLoggedOut 会清掉标记，避免下次刷新又误判已登录', async () => {
    await login.login()
    expect(hasLoginMarker()).toBe(true)

    login.markLoggedOut()

    expect(hasLoginMarker()).toBe(false)
  })

  it('没有标记时 bootSession 判定未登录：零请求，展示引导卡片', async () => {
    expect(hasLoginMarker()).toBe(false)

    const ok = await login.bootSession()

    expect(ok).toBe(false)
    expect(login.needsLogin.value).toBe(true)
    expect(login.error.value).toBe('')
    // 判定已落地：不再是 pending，门卫据此渲染卡片而不是一直 loading
    expect(login.isPending.value).toBe(false)
  })

  it('mock 环境（dev / preview）下有标记即放行，不再重复弹授权', async () => {
    // vitest 跑在 Vite dev 下，与 main.ts 的 enableMock 判据一致
    expect(isMockEnv()).toBe(true)
    setLoginMarker()

    const ok = await login.bootSession()

    expect(ok).toBe(true)
    expect(login.isLoggedIn.value).toBe(true)
    expect(login.error.value).toBe('')
  })
})

describe('isAuthError 判定', () => {
  it('认得出 host 抛的「未登录」文本（没有 status / code 的形态）', () => {
    expect(isAuthError(new Error('[ToySDK] rank request failed: 未登录'))).toBe(true)
    expect(isAuthError(new Error('请先登录后再试'))).toBe(true)
  })

  it('认得出 status / code 形态', () => {
    expect(isAuthError(Object.assign(new Error('x'), { status: 'unauthorized' }))).toBe(true)
    // 端外浏览器：没有登录入口，同样由引导卡片接管（文案不同）
    expect(isAuthError(Object.assign(new Error('x'), { status: 'unsupported' }))).toBe(true)
    expect(isAuthError(Object.assign(new Error('x'), { code: -101 }))).toBe(true)
    // 别把限流、服务不可用误判成未登录
    expect(isAuthError(Object.assign(new Error('x'), { code: 307044 }))).toBe(false)
    expect(isAuthError(Object.assign(new Error('x'), { status: 'unavailable' }))).toBe(false)
    expect(isAuthError(null)).toBe(false)
    expect(isAuthError('未登录')).toBe(false)
  })
})
