// filepath: src/mock/cloud.ts
//
// 注册「云存储」业务 mock —— 通过 SDK 暴露的 `cloud.override(key).mock(h)` 挂载。
//
// cloud KV 是 Map，key/value 都是字符串（与真 SDK 一致）。
// 多 key 批量读取：未命中的 key 不返回字段；写操作覆盖；删除不存在的 key 不报错。
// 持久化复用 SDK 提供的 persistCloud helper。

import { cloud, persistCloud } from 'bilibili-toy'

cloud.override('get').mock((req, ctx) => {
  const out: Record<string, string> = {}
  if (!req) {
    // 不传参 = 返回整个 store
    for (const [k, v] of ctx.store.cloud) out[k] = v
    return out
  }
  for (const key of req) {
    const v = ctx.store.cloud.get(key)
    if (v !== undefined) out[key] = v
  }
  return out
})

cloud.override('set').mock((req, ctx) => {
  for (const [k, v] of Object.entries(req)) ctx.store.cloud.set(k, v)
  // 写完即落盘 localStorage，刷新页面后仍能恢复
  persistCloud(ctx.store.cloud)
})

cloud.override('remove').mock((req, ctx) => {
  for (const key of req) ctx.store.cloud.delete(key)
  persistCloud(ctx.store.cloud)
})
