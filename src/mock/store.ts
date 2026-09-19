// filepath: src/mock/store.ts
//
// 业务专属 mock 持久化扩展 —— 与 SDK 内 store 模块对接。
//
// SDK 内 `mock/store.ts` 提供：
//   - MOCK_DEFAULT_USER_ID（导出给业务侧做"我"的 mid）
//   - persistCloud / clearPersistedMock / createMockStore
//   - CloudKV / RankState / MockStore 类型
//
// 业务侧当前不需要扩展 store 容器 —— 直接复用 SDK 的类型与持久化。
// 保留这个文件作为「业务侧扩展点」：未来要新增 mock KV 业务字段（比如
// 用户成就 / 主题设置），可以在这个文件里再加 helper，并通过 override
// 注入到对应 namespace。
//
// 设计原则：store 的"容器"职责留在 SDK（基础设施），store 的"业务内容
// 写入"在业务侧（具体字段语义）。

// 当前业务侧没有 store 扩展要写。
// 此文件保留，未来业务新增 mock KV 字段时在此补充 helper。
export {}
