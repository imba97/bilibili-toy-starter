// filepath: src/mock/share.ts
//
// 注册「分享 / 跳转 / 二维码 / 关闭」业务 mock —— 通过 SDK 暴露的 `share.override(key).mock(h)` 挂载。
//
// share 是纯透传 namespace：navigate / share / getQrCode / saveImageToAlbum / closeBrowser
// 这些能力在 dev / preview 下不需要 mock（都是「动作」型 API，无服务端响应）；
// 但为了让 namespace 调用链在 mock 模式下走"路由诊断已配置"路径（避免诊断日志
// 一直报 sdk-missing），这里挂最小 mock：把 navigate / share 做成提示 + noop。
//
// 业务侧可以根据需要改写每个 override；这是 starter 默认实现。

import { share } from 'bilibili-toy'

/** dev 模式下的 navigate mock：toast 提示，不真跳转 */
share.override('navigate').mock((req: unknown) => {
  const url = (req as { url?: string } | undefined)?.url ?? '<unknown>'
  // eslint-disable-next-line no-console
  console.log('[mock:share.navigate]', url)
})

/** dev 模式下的 share mock：toast 提示，不真分享 */
share.override('to').mock((req: unknown) => {
  const target = (req as { to?: string } | undefined)?.to ?? '<unknown>'
  // eslint-disable-next-line no-console
  console.log('[mock:share.to]', target)
})

/** dev 模式下的 getQrCode mock：返回一个 1×1 占位 dataURL（演示用） */
share.override('qrCode').mock(() => ({
  dataURL:
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABAQMAAAAl21bKAAAAA1BMVEX///+nxBvIAAAAC0lEQVQI12NgAAIAAAUAAeImBZsAAAAASUVORK5CYII='
}))

/** dev 模式下的 saveImage mock：toast，不真存 */
share.override('saveImage').mock((req: unknown) => {
  const src = (req as { src?: string } | undefined)?.src ?? '<unknown>'
  // eslint-disable-next-line no-console
  console.log('[mock:share.saveImage]', src)
})

/** dev 模式下的 closeBrowser mock：toast，不真关 */
share.override('closeBrowser').mock(() => {
  // eslint-disable-next-line no-console
  console.log('[mock:share.closeBrowser]')
})
