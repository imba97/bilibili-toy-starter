# bilibili-toy-starter

[![GitHub](https://img.shields.io/badge/GitHub-imba97%2Fbilibili--toy--starter-181717?logo=github&style=flat-square)](https://github.com/imba97/bilibili-toy-starter)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](./LICENSE)

> A Monorepo starter for the **Bilibili Toy** platform.
> Scaffold a Toy app (Vue 3 + UnoCSS + TypeScript) and the `bilibili-toy` SDK library.
> Engineering quality managed by [`vite-plus`](https://viteplus.dev/) (the `vp` CLI, v0.2+).

```
.
├── packages/
│   └── bilibili-toy/          # TypeScript SDK library — what gets published to npm
├── src/                       # Vue 3 SPA — the Toy app itself
│   ├── composables/           # Business logic (checkin domain + Toy utils)
│   ├── pages/                 # Vue pages (index + rank)
│   └── components/            # Vue components
├── scripts/
│   └── publish-toy.mjs        # Two-stage Toy publish orchestrator (preview → confirm → submit)
├── vite.config.ts             # All toolchain config in one file
├── pnpm-workspace.yaml
└── package.json               # Monorepo scripts
```

---

## What is this?

This repo is a **starter** for the Bilibili Toy platform. It contains two things:

1. **A Toy app** (`src/`): A Vue 3 SPA built by `vp build` and uploaded to `toy create` / `toy update`.
2. **An npm library** (`packages/bilibili-toy/`): A TypeScript SDK wrapper around the official Toy JS SDK, published to npm as `bilibili-toy`.

---

## Quick start

```bash
# 1. Install everything in the monorepo
pnpm install

# 2. Run the toy locally
npm run dev
# → http://localhost:5173

# 3. Build & publish to the Toy platform
npm run toy:publish
# → builds dist/, runs `toy create`, prints preview_url.
#   Open the preview in your browser, then re-run with `--yes` to submit.
```

---

## The `bilibili-toy` SDK

The SDK provides a thin, type-safe wrapper around the official Toy JS SDK:

```ts
import { toy, rank, cloud, user } from 'bilibili-toy'

// 1. Handshake (wait for window.toy to load)
await toy.ready()

// 2. Call namespace methods directly
await rank.submit({ score: 100 })
const list = await rank.list()
const me = await user.profile()
await cloud.set({ key: 'value' })
```

### Key features

- **Zero dependencies**: Pure TypeScript, no runtime deps
- **Type-safe**: Full ToySDK type declarations with IDE autocomplete
- **Flat API**: `import { rank, cloud } from bilibili-toy`, no nesting
- **Proxy forwarding**: New SDK methods are automatically available
- **Error normalization**: Unified `[bilibili-toy]` prefix for easy debugging

See [`packages/bilibili-toy/README.md`](./packages/bilibili-toy/README.md) for the full API reference.

---

## The two Toy workflows

### A. First-time publish

```bash
npm run toy:publish
```

This runs:

1. `vp build` → `dist/`
2. `toy create ./dist --json` (NO `--yes`)

You get back a `preview_url`. Open it. The page must render correctly under
`/toy/<slug>/` — assets are emitted with **relative** paths, so this is the
real production runtime.

Once you are happy:

```bash
toy create ./dist --json --yes
```

### B. Update an existing Toy

Slug is **locked** after first publish — never delete-and-recreate.

```bash
npm run toy:update -- <toy-id>
```

Same two-stage flow as create.

---

## Releasing the npm library

`vp pack` outputs standard ESM + d.ts into `packages/bilibili-toy/dist/`.
This starter ships with [`bumpp`](https://github.com/antfu/bumpp) at the repo
root to bump versions in one step (commit, tag, push).

```bash
# 1. Preview the next version (no writes)
npm run release:dry

# 2. Bump version + commit + tag + push
npm run release

# 3. Publish to npm
cd packages/bilibili-toy
pnpm publish --access public
```

---

## Engineering

All toolchain settings live in **[`vite.config.ts`](./vite.config.ts)**.
There is no separate `.eslintrc`, `.prettierrc`, `tsdown.config.ts`, etc.
`vp` reads the following blocks from that single file:

| Block    | Drives                                      |
| -------- | ------------------------------------------- |
| `fmt`    | Oxfmt formatting rules                      |
| `lint`   | Oxlint rules                                |
| `check`  | `vp check` orchestration (fmt + lint + tsc) |
| `test`   | Vitest configuration                        |
| `staged` | Pre-commit checks (only staged files)       |
| `pack`   | tsdown defaults for `vp pack`               |

### Commands cheat-sheet

| Command                           | What it does                           |
| --------------------------------- | -------------------------------------- |
| `npm run dev`                     | Toy dev server (`vp dev`)              |
| `npm run build`                   | Toy production build                   |
| `npm run preview`                 | Toy preview of the built `dist/`       |
| `npm run pack`                    | Library build (tsdown via `vp pack`)   |
| `npm run test`                    | Vitest across packages                 |
| `npm run typecheck`               | `tsc --noEmit` for both packages       |
| `npm run check`                   | Format + lint + type-check             |
| `npm run fmt` / `lint` / `staged` | Individual checks                      |
| `npm run hooks:install`           | Enable git pre-commit hooks (one-time) |
| `npm run release` / `release:dry` | Bump version + commit + tag + push     |

---

## Editing rules

- **Toy content**: edit `src/pages/` and `src/components/`.
- **Business logic**: edit `src/composables/` (checkin domain, Toy utils).
- **SDK library**: edit `packages/bilibili-toy/src/`.
- **Do not** add `eslint`, `prettier`, or `tsdown.config.ts`. `vp` covers all of these.
- **Do not** create `toy.yaml`. Publishing state lives in the official `toy` CLI history.
- **Do not** change `base: ./` in `vite.config.ts`. Toy pages are served under `/toy/<slug>/` and require relative asset URLs.

---

## Common pitfalls

- **White screen after publish** — usually absolute paths in `index.html` or
  assets. Verify `dist/index.html` uses `<script src="./assets/...">` and
  `link href="./assets/...">`. Run `npm run build` and grep for any
  `/assets/` (absolute) references.
- **404 on assets** — same root cause as above. The `base: ./` setting is what
  makes the build emit relative URLs; do not override it.
- **Slug locked** — the first publish sets your Toy URL slug forever. To
  rename a Toy, you must create a new one (and accept a new URL).
- **`vp` not found** — install it globally: `irm https://vite.plus/ps1 | iex`
  (Windows) or `curl -fsSL https://vite.plus | bash` (macOS/Linux).
- **`toy` not found** — install the Bilibili Toy CLI; consult the `toy` skill
  at `c:\Users\imba97\.agents\skills\toy\SKILL.md`.

---

## For AI agents

Read **[`AGENTS.md`](./AGENTS.md)** before doing anything to this repo. The
authoritative workflow lives in the `toy` skill — `AGENTS.md` just summarizes
the bits relevant to this codebase.
