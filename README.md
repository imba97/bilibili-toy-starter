# bilibili-toy-starter

[![GitHub](https://img.shields.io/badge/GitHub-imba97%2Fbilibili--toy--starter-181717?logo=github&style=flat-square)](https://github.com/imba97/bilibili-toy-starter)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](./LICENSE)

> Bilibili **Toy** 平台的 Monorepo 脚手架。
> 内置 Vue 3 Toy 应用与 `bilibili-toy` TypeScript SDK。
> 工具链由 [`vite-plus`](https://viteplus.dev/)（`vp` CLI）统一管理。

---

## 目录结构

```
packages/bilibili-toy/    npm 库 — TypeScript SDK 封装，发布到 npm
src/                       Vue 3 SPA — Toy 应用本体
scripts/publish-toy.mjs    两阶段 Toy 发布编排（预览 → 确认 → 提交）
vite.config.ts             单文件管理全部工具链配置（fmt / lint / check / test / staged / pack）
```

本仓库承载两类产物：

1. **Toy 应用**（`src/`）— 由 `vp build` 构建，通过 `toy create` / `toy update` 上传。
2. **SDK 库**（`packages/bilibili-toy/`）— 由 `vp pack` 构建，以 `bilibili-toy` 名称发布到 npm。

---

## 快速开始

```bash
pnpm install
npm run dev               # Toy 开发服务器 → http://localhost:5173
npm run toy:publish       # 打包 SDK + 构建 + toy create（不带 --yes）→ 返回 preview_url
```

打开预览链接，确认无误后重新执行并附带 `--yes` 提交。更新已有 Toy 使用 `npm run toy:update -- <toy-id>`。

---

## `bilibili-toy` SDK

官方 Toy JS SDK 的轻量、类型安全封装，自带**开箱即用的 mock 支持**：

```ts
import { toy, rank, cloud, user } from 'bilibili-toy'

await toy.ready()
await rank.submit({ score: 100 })
const list = await rank.list()
const me = await user.profile()
```

### Mock 覆盖钩子

开发 / 预览模式下完全不发起真实 RPC。开一个开关、注册几个处理器，即可获得数据完整的 UI：

```ts
import { toy, rank, MOCK_DEFAULT_USER_ID } from 'bilibili-toy'
import { getMockOthers, MOCK_SELF_AVATAR, MOCK_SELF_NICKNAME } from './data'

toy.enableMock() // namespace 调用全部路由到 mock
rank.override('list').mock(async (req, ctx) => {
  // 替换 SDK 默认处理器
  const me = { rank: 0, score: ctx.store.cloud.get('ci_total'), mid: MOCK_DEFAULT_USER_ID }
  return [...getMockOthers(), me].sort((a, b) => b.score - a.score).slice(0, req?.limit ?? 10)
})
```

每个处理器接收一个 `MockCtx`，包含：

- `store` — 共享的 `Map` KV 存储，持久化到 `localStorage`
- `mockUserId` — 当前 mock 用户 mid
- `delay()` — 可配置延迟，模拟真实 UI loading 状态
- `log()` — 调试日志输出

`toy.mockEnabled()` 让页面代码可以干净地分支；`toy.resetMock()` 在测试间清空状态。默认行为（空载荷、1×1 PNG 图片响应）确保未注册的能力不会直接报错崩溃。

### 为什么是钩子而不是写死 mock

- **SDK 保持业务无关** — 不内置假用户、排行榜种子或业务数据。
- **应用保持可移植** — 切到真实联调时只需删掉 `src/mock/`。
- **调用点无需分支** — `await rank.list()` 在开发和生产环境是同一行代码。

### 核心特性

- **零运行时依赖** — 纯 TypeScript
- **扁平 API** — `import { rank, cloud, user } from 'bilibili-toy'`
- **Proxy 动态转发** — 新增 SDK 方法无需改动封装
- **宿主就绪重试** — 对 `toy id not available on host` 竞态透明退避
- **错误归一化** — 统一 `[bilibili-toy]` 前缀；提供 `isToyHostNotReady` / `isToyError` 用于类型化处理

完整 API 见 [`packages/bilibili-toy/README.md`](./packages/bilibili-toy/README.md)。

---

## Toy 发布

创建与更新流程相同的两阶段流程 — **slug 在首次发布后即锁定**，严禁删除重建：

```bash
npm run toy:publish         # 打包 SDK + 构建 + toy create ./dist --json   （不带 --yes）
# → 检查返回的 preview_url …
npm run toy:update -- <id>  # 打包 SDK + 构建 + toy update <id> ./dist --json （不带 --yes）
# → 检查返回的 preview_url …
# 确认无误后重新执行并追加 --yes 提交
```

`npm run toy:publish` / `toy:update` 脚本在构建前**总是会重新打包 SDK** — Toy 构建产物会打包 `packages/bilibili-toy/dist/index.mjs`，如果只改了 SDK 源码而没有重新打包，部署的还是旧版本。

---

## 发布 npm 库

```bash
npm run release:dry         # 预览下一个版本号（不写盘）
npm run release             # bumpp：升级版本号 + 提交 + 打 tag + 推送
cd packages/bilibili-toy && pnpm publish --access public
```

---

## 命令速查

| 命令                              | 作用                                       |
| --------------------------------- | ------------------------------------------ |
| `npm run dev`                     | Toy 开发服务器                             |
| `npm run build`                   | Toy 生产构建                               |
| `npm run pack`                    | 库构建（tsdown via `vp pack`）             |
| `npm run sdk:pack`                | 仅构建 SDK                                 |
| `npm run test`                    | 全包 Vitest                                |
| `npm run check`                   | 格式化 + Lint + 类型检查                   |
| `npm run fmt` / `lint` / `staged` | 单项检查                                   |
| `npm run toy:publish`             | 打包 SDK + 构建 + `toy create --json`      |
| `npm run toy:update -- <id>`      | 打包 SDK + 构建 + `toy update <id> --json` |
| `npm run toy:mylist`              | 列出当前账号下的 Toy                       |
| `npm run release` / `release:dry` | 升级版本号 + 提交 + 打 tag + 推送          |

---

## 编辑规范

- **Toy 内容** → 编辑 `src/pages/` 和 `src/components/`
- **业务逻辑** → 编辑 `src/composables/`
- **SDK 库** → 编辑 `packages/bilibili-toy/src/`
- **应用专属 mock** → `src/mock/<namespace>.ts`（调用 `xxx.override(key).mock(h)`）
- **不要**新增 `eslint`、`prettier` 或 `tsdown.config.ts` — `vp` 已覆盖全部
- **不要**创建 `toy.yaml` — 发布状态由官方 `toy` CLI 本地历史管理
- **不要**修改 `vite.config.ts` 里的 `base: './'` — Toy 页面部署在 `/toy/<slug>/`，必须使用相对资源路径

---

## 常见坑

- **发布后白屏 / 404** — 多半是 `dist/index.html` 出现了绝对路径。检查 `<script src="./assets/...">` 和 `<link href="./assets/...">`。`base: './'` 才是输出相对路径的关键。
- **slug 锁定** — 首次发布即决定 Toy 的 URL，无法改名。如需重命名只能新建一个 Toy。
- **找不到 `vp`** — 全局安装：`irm https://vite.plus/ps1 | iex`（Windows）或 `curl -fsSL https://vite.plus | bash`（macOS/Linux）
- **找不到 `toy`** — 安装 B站 Toy CLI；详见 `toy` 技能：`c:\Users\imba97\.agents\skills\toy\SKILL.md`

---

## 给 AI Agent

操作本仓库前请先阅读 **[`AGENTS.md`](./AGENTS.md)**。权威流程定义在 `toy` 技能中 — `AGENTS.md` 只摘录与本代码库相关的内容。
