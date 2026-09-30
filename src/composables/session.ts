// filepath: src/composables/session.ts
//
// 登录态能不能跨刷新保留？—— 本文件只回答这一件事，不碰 SDK、不碰 Vue。
//
// 背景（bug 修复）：登录成功后只把状态放在内存里，用户每次刷新页面都得重新点一次
// 「登录」，体验上就是「每次都需要登录」。所以登录成功时留一个标记，下次进页面
// 看到标记就先静默复核一次（见 useLogin.bootSession），复核通过直接进内容。
//
// 存储用「localStorage，不可用则退回内存」：
//   - 浏览器（Toy 容器 / dev）走 localStorage → 真·跨刷新；
//   - Node（vitest）没有 localStorage，退回模块级 Map → 同进程内可测、
//     单个测试文件内行为与浏览器一致，且不会因为 storage 不存在而静默失效。
//   - 隐私模式 / 容器禁用 storage 同样走退路，不会把应用打挂。
//
// 标记本身只存 '1'，不含任何用户信息或凭证。
//
// 为什么 dev / preview 额外「直接放行」：
//   - main.ts 在 `import.meta.env.DEV || /toy/preview/` 时调用 toy.enableMock()，
//     mock 会返回一份假用户资料 —— 于是「登录」在本地环境里永远成功，
//     但刷新后又回到未登录，本地开发每次都要点一下，纯粹是噪音。
//   - 这两个环境本来就不具备真实登录语义（preview host 故意不注入 toy id，
//     业务能力全部 reject），所以有标记即视为已登录是安全的。
//   - 正式发布（/toy/<slug>/）不会命中此分支：仍然老老实实调 user.profile() 复核。

/** 登录成功标记的 storage key（本模块私有 —— 外部只通过下面的读写函数打交道） */
const LOGIN_MARKER_KEY = 'toy:logged-in'

/** localStorage 不可用时的退路（Node / 隐私模式） */
const memory = new Map<string, string>()

function readRaw(): string | null {
  try {
    const v = globalThis.localStorage?.getItem(LOGIN_MARKER_KEY)
    if (v !== undefined && v !== null) return v
  } catch {
    /* 落到内存退路 */
  }
  return memory.get(LOGIN_MARKER_KEY) ?? null
}

function writeRaw(value: string | null): void {
  try {
    if (value === null) globalThis.localStorage?.removeItem(LOGIN_MARKER_KEY)
    else globalThis.localStorage?.setItem(LOGIN_MARKER_KEY, value)
  } catch {
    /* 落到内存退路 */
  }
  if (value === null) memory.delete(LOGIN_MARKER_KEY)
  else memory.set(LOGIN_MARKER_KEY, value)
}

/** 当前是否处于 mock 环境（dev 或 Toy 预览域名）—— 与 main.ts 的 enableMock 判据一致 */
export function isMockEnv(): boolean {
  if (import.meta.env.DEV) return true
  return typeof location !== 'undefined' && location.pathname.includes('/toy/preview/')
}

/** 是否留过登录标记 */
export function hasLoginMarker(): boolean {
  return readRaw() === '1'
}

/** 写标记（登录成功时） */
export function setLoginMarker(): void {
  writeRaw('1')
}

/** 清标记（登录态确认失效 / 登出时） */
export function clearLoginMarker(): void {
  writeRaw(null)
}
