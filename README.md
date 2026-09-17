# bilibili-toy-starter

[![GitHub](https://img.shields.io/badge/GitHub-imba97%2Fbilibili--toy--starter-181717?logo=github&style=flat-square)](https://github.com/imba97/bilibili-toy-starter)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](./LICENSE)

> A Monorepo starter for the **Bilibili Toy** platform.
> Scaffold a Toy app (Vue 3 + UnoCSS + TypeScript) and/or a publishable npm
> library — engineering quality managed by [`vite-plus`](https://viteplus.dev/)
> (the `vp` CLI, v0.2+).

```
.
├── packages/
│   ├── starter-toy/         # Vue 3 SPA — what gets uploaded as a Toy
│   └── starter-lib/         # Publishable TS library — what gets uploaded to npm
├── scripts/
│   └── publish-toy.mjs      # Two-stage Toy publish orchestrator (preview → confirm → submit)
├── vite.config.ts           # All toolchain config in one file
├── pnpm-workspace.yaml
└── package.json             # Monorepo scripts
```

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
# → builds packages/starter-toy/dist, runs `toy create`, prints preview_url.
#   Open the preview in your browser, then re-run with `--yes` to submit.
```

---

## The two Toy workflows

### A. First-time publish

```bash
npm run toy:publish
```

This runs:

1. `vp build starter-toy` → `packages/starter-toy/dist/`
2. `toy create ./packages/starter-toy/dist --json` (NO `--yes`)

You'll get back a `preview_url`. Open it. The page must render correctly under
`/toy/<slug>/` — assets are emitted with **relative** paths, so this is the
real production runtime.

Once you're happy:

```bash
toy create ./packages/starter-toy/dist --json --yes
```

…or use the helper script (which has friendlier output):

```bash
node scripts/publish-toy.mjs create
```

### B. Update an existing Toy

Slug is **locked** after first publish — never delete-and-recreate.

```bash
npm run toy:update -- <toy-id>
```

…or with the helper:

```bash
node scripts/publish-toy.mjs update <toy-id>
```

Same two-stage flow as create.

---

## Releasing the npm library

`vp pack` outputs standard ESM + CJS + d.ts into `packages/starter-lib/dist/`.
This starter ships with [`bumpp`](https://github.com/antfu/bumpp) at the repo
root to bump versions in one step (commit, tag, push).

```bash
# 1. Preview the next version (no writes)
npm run release:dry

# 2. Bump version + commit + tag + push
npm run release

# 3. Publish to npm
cd packages/starter-lib
pnpm publish --access public
```

If you prefer Changesets / release-it, swap in your release tool of choice —
the `pack` output is plain Node-compatible artifacts.

---

## Engineering

All toolchain settings live in **[`vite.config.ts`](./vite.config.ts)**. There's
no separate `.eslintrc`, `.prettierrc`, `tsdown.config.ts`, etc. `vp` reads the
following blocks from that single file:

| Block    | Drives                                      |
| -------- | ------------------------------------------- |
| `fmt`    | Oxfmt formatting rules                      |
| `lint`   | Oxlint rules                                |
| `check`  | `vp check` orchestration (fmt + lint + tsc) |
| `test`   | Vitest configuration                        |
| `staged` | Pre-commit checks (only staged files)       |
| `pack`   | tsdown defaults for `vp pack`               |

### Commands cheat-sheet

| Command                           | What it does                                     |
| --------------------------------- | ------------------------------------------------ |
| `npm run dev`                     | Toy dev server (`vp dev starter-toy`)            |
| `npm run build`                   | Toy production build                             |
| `npm run preview`                 | Toy preview of the built `dist/`                 |
| `npm run pack`                    | Library build (tsdown via `vp pack starter-lib`) |
| `npm run test`                    | Vitest across packages                           |
| `npm run typecheck`               | `tsc --noEmit` for both packages                 |
| `npm run check`                   | Format + lint + type-check                       |
| `npm run fmt` / `lint` / `staged` | Individual checks                                |
| `npm run hooks:install`           | Enable git pre-commit hooks (one-time)           |
| `npm run release` / `release:dry` | Bump version + commit + tag + push               |

---

## Editing rules

- **Toy content**: edit `packages/starter-toy/src/App.vue` and friends.
- **Library content**: edit `packages/starter-lib/src/core/index.ts`.
- **Don't** add `eslint`, `prettier`, or `tsdown.config.ts`. `vp` covers all of these.
- **Don't** create `toy.yaml`. Publishing state lives in the official `toy` CLI history.
- **Don't** change `base: './'` in `packages/starter-toy/vite.config.ts`. Toy pages
  are served under `/toy/<slug>/` and require relative asset URLs.

---

## Common pitfalls

- **White screen after publish** — usually absolute paths in `index.html` or
  assets. Verify `packages/starter-toy/dist/index.html` uses
  `<script src="./assets/...">` and `link href="./assets/...">`. Run
  `npm run build` and grep for any `/assets/` (absolute) references.
- **404 on assets** — same root cause as above. The `base: './'` setting is what
  makes the build emit relative URLs; don't override it.
- **Slug locked** — the first publish sets your Toy's URL slug forever. To
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
