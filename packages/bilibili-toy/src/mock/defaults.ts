// filepath: packages/bilibili-toy/src/mock/defaults.ts
//
// SDK 内置的「空数据 mock」兜底 —— 业务侧没 override 时的安全网。
//
// 设计目标：dev / preview 模式下，业务侧即使忘了为某个能力挂 mock handler，
// 路由层也返回「按 ToySDK 官方类型构造的空响应」而不是抛错，让页面正常渲染。
//
// 业务专属的「有意思的 mock」仍然写在业务侧 src/mock/ 下 —— 比如榜单的其他人池、
// 头像工厂等。本文件只放「类型正确的空占位」。
//
// 每个 handler 必须严格按 ToySDK 官方类型返回：
//   - 数据类（带 status）→ status: 'unsupported'，data/items 缺省
//   - 列表 → []
//   - KV → {}
//   - 标量 → 该类型的零值（0 / false / ''）
//   - void 能力 → undefined

// ────────────────────────────────────────────────────────────────────────
// 通用：1×1 PNG base64（用于二维码 / 保存图片等图片类响应）
// ────────────────────────────────────────────────────────────────────────
const ONE_PX_PNG_DATAURL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABAQMAAAAl21bKAAAAA1BMVEX///+nxBvIAAAAC0lEQVQI12NgAAIAAAUAAeImBZsAAAAASUVORK5CYII='

/** mock 路由日志：集中一处 disable，避免 5 处散落 */
const mockLog = (action: string, payload?: unknown): void => {
  // eslint-disable-next-line no-console
  console.log('[toy:mock] ' + action, payload)
}

// ────────────────────────────────────────────────────────────────────────
// share / navigate / 分享 / 二维码 / 保存图片 / 关闭
// ────────────────────────────────────────────────────────────────────────

/** navigate：在 dev 模式不真跳转，仅记日志 */
export const navigateDefault = (req: ToySDK.NavigateReq): void => {
  mockLog('navigate', req)
}

/** share：拉起 B站 App 分享面板，dev 模式无面板，仅记日志 */
export const shareDefault = (req: ToySDK.ShareReq): void => {
  mockLog('share', req)
}

/** getQrCode：返回一个 1×1 占位图 + 当前 URL 作为二维码编码内容 */
export const qrCodeDefault = (req: ToySDK.QrCodeReq): ToySDK.QrCodeResp => {
  const path = req?.path ?? 'index.html'
  const url =
    typeof location !== 'undefined'
      ? new URL(path, location.href).toString()
      : `https://example.com/${path}`
  return { base64: ONE_PX_PNG_DATAURL, url }
}

/** saveImageToAlbum：dev 模式无真相册，返回空 localPath */
export const saveImageDefault = (req: ToySDK.SaveImageReq): ToySDK.SaveImageResp => {
  mockLog('saveImageToAlbum', req)
  return { localPath: '' }
}

/** closeBrowser：dev 模式不真关，仅记日志 */
export const closeBrowserDefault = (): void => {
  mockLog('closeBrowser')
}

// ────────────────────────────────────────────────────────────────────────
// 用户信息
// ────────────────────────────────────────────────────────────────────────

/**
 * getUserProfile：返回「匿名用户」占位。
 *
 * 给个昵称 + 头像，避免 UI 拿空头像 URL 渲染时 img 触发 404 / onerror 雪崩。
 * 真容器下永远走真实 SDK，不会到这里。
 */
export const userProfileDefault = (): ToySDK.UserProfileResp => ({
  avatar: '',
  nickname: '匿名用户',
  toyOpenId: 'mock_unknown'
})

// ────────────────────────────────────────────────────────────────────────
// 作者资料 / 视频 / 互动关系 / 视频互动数据
// ────────────────────────────────────────────────────────────────────────

/**
 * 通用「数据类能力」空响应：按官方语义，外部浏览器调用时返回
 * status: 'unsupported' + items: [] / data 缺省。前端按 status 分支渲染
 * 降级骨架即可。
 */
export const authorProfileDefault = (): ToySDK.AuthorProfileResp => ({ status: 'unsupported' })

export const authorVideosDefault = (): ToySDK.AuthorVideosResp => ({
  status: 'unsupported',
  items: []
})

export const authorRelationDefault = (): ToySDK.AuthorRelationResp => ({ status: 'unsupported' })

export const videoUserActionsDefault = (
  _req: ToySDK.VideoUserActionsReq
): ToySDK.VideoUserActionsResp => ({
  status: 'unsupported',
  items: []
})

// ────────────────────────────────────────────────────────────────────────
// 排行榜
// ────────────────────────────────────────────────────────────────────────

/** submitScore：返回 score: 0，提示「未提交任何分数」 */
export const submitScoreDefault = (): ToySDK.SubmitScoreResp => ({ score: 0 })

/** getRankList：返回空数组，UI 渲染空态 */
export const rankListDefault = (): ToySDK.RankItem[] => []

/**
 * getMyRank：返回「未上榜」标准响应。
 * 按 MyRankResp.d.ts：ranked=false + rank=0 + score=0，
 * UI 用 ranked 分支展示「未上榜」提示。
 */
export const myRankDefault = (): ToySDK.MyRankResp => ({
  ranked: false,
  rank: 0,
  score: 0
})

// ────────────────────────────────────────────────────────────────────────
// 云存储
// ────────────────────────────────────────────────────────────────────────

/** getCloudStorage：返回空 KV —— req 可选（不传 = 整个 store） */
export const cloudGetDefault = (): Record<string, string> => ({})

/** setCloudStorage：dev 模式仅记日志，不钣 mock store（业务侧通常会 override） */
export const cloudSetDefault = (req: Record<string, string>): void => {
  mockLog('setCloudStorage', req)
}

/** removeCloudStorage：dev 模式仅记日志 */
export const cloudRemoveDefault = (req: string[]): void => {
  mockLog('removeCloudStorage', req)
}

// ────────────────────────────────────────────────────────────────────────
// 容器能力（仅 B站 App 内可用 —— dev / preview 模式下返回静态可用值）
// ────────────────────────────────────────────────────────────────────────

const unknownDeviceState = (): ToySDK.ToyContainerState => ({
  deviceType: 'unknown',
  viewport:
    typeof window !== 'undefined'
      ? { width: window.innerWidth, height: window.innerHeight }
      : { width: 0, height: 0 },
  orientation:
    typeof window !== 'undefined' && window.innerWidth > window.innerHeight
      ? 'landscape'
      : 'portrait',
  immersive: false,
  safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
  changedFields: []
})

/** getContainerState：返回当前 viewport 静态快照，changedFields 空数组 */
export const containerStateDefault = (): ToySDK.ToyContainerState => unknownDeviceState()

/** setContainerMode：仅记日志，不修改任何状态 */
export const setContainerModeDefault = (req: ToySDK.SetContainerModeReq): void => {
  mockLog('setContainerMode', req)
}

/**
 * onContainerChange：返回一个 noop 取消函数。dev 模式容器状态不会真变，
 * 调用方拿到取消函数即可（不会立刻触发回调）。
 */
export const onContainerChangeDefault = (): (() => void) => () => {
  /* noop 取消 */
}
