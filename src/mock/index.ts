// filepath: src/mock/index.ts
//
// 业务侧 mock 统一入口 —— 装载即注册。
//
// 设计：
//   - 各 namespace 的 mock handler 分文件写（rank.ts / cloud.ts / ...），便于按需删改
//   - 这个文件做 side-effect re-export：main.ts `import '@/mock'` 后，
//     全部 namespace.override(key).mock(h) 自动生效
//   - 同时把 namespace 对象 re-export 出去，页面 / composables 直接 import 用
//
// 调用方：
//   main.ts:    import '@/mock'   // 仅触发注册
//   rank.vue:   import { rank } from '@/mock'
//   index.vue:  import { rank, cloud, user } from '@/mock'

// 触发 mock handler 注册。每个文件顶层 import 即调 namespace.override(...).mock(handler)，
// 顺序无关：handler 挂到 builder 的 _mock 槽位上，路由 lookup 时直接命中。
import './cloud'
import './rank'
import './user'
import './author'
import './share'

// 业务侧 re-export namespace 对象
export { rank } from 'bilibili-toy'
export { cloud } from 'bilibili-toy'
export { user } from 'bilibili-toy'
export { author } from 'bilibili-toy'
export { share } from 'bilibili-toy'

// 业务侧 re-export mock 辅助（其他文件 / 测试需要时使用）
export { getMockOthers, buildMockUserProfile } from './data'
