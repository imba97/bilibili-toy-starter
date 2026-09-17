# AGENTS.md — bilibili-toy-starter

> **Repo**: <https://github.com/imba97/bilibili-toy-starter>
> **Note**: This file is informational. The authoritative workflow rules live in the
> `toy` skill (c:\Users\imba97\.agents\skills\toy\SKILL.md). If anything here
> conflicts with the skill, the skill wins.

## Scope

This repo is a **starter** for the Bilibili Toy platform. Code living here can
be one of two things:

1. A **Toy application** under `packages/starter-toy/` — a Vue 3 SPA built by
   `vp build` and uploaded to `toy create` / `toy update`.
2. A **npm library** under `packages/starter-lib/` — built by `vp pack` and
   published to npm.

## Hard rules for AI agents

- **Publishing a Toy is a two-stage workflow.** Run `toy create` / `toy update`
  **without** `--yes` first to get a `preview_url`. Do NOT pass `--yes` until
  the human has reviewed the preview and explicitly said "submit".
- **Slug is locked after first publish.** Use `toy update`, never
  delete-and-recreate, to change a slug — that erases the toy's history.
- **Toy pages run under `/toy/<slug>/`.** Keep `base: './'` in
  `packages/starter-toy/vite.config.ts`. Do not switch to absolute `/` paths
  in built assets, or pages will 404.
- **Don't create `toy.yaml`.** Publishing state lives in the official `toy`
  CLI's local history, not in the repo.
- **Run `vp check` before committing.** It runs Oxfmt + Oxlint + tsc across
  the monorepo and is fast.

## Useful commands

| Command                                    | What it does                                                 |
| ------------------------------------------ | ------------------------------------------------------------ |
| `npm run dev`                              | Start the toy dev server on http://localhost:5173            |
| `npm run build`                            | Build the toy into `packages/starter-toy/dist/`              |
| `npm run pack`                             | Build the library into `packages/starter-lib/dist/`          |
| `npm run test`                             | Run vitest across packages                                   |
| `npm run check`                            | Format + lint + type-check                                   |
| `npm run fmt` / `lint` / `staged`          | Individual checks                                            |
| `npm run toy:mylist`                       | List toys for the logged-in account                          |
| `npm run toy:publish`                      | Build + `toy create ./packages/starter-toy/dist --json`      |
| `npm run toy:update -- <id>`               | Build + `toy update <id> ./packages/starter-toy/dist --json` |
| `node scripts/publish-toy.mjs create`      | Same as above but with friendlier output                     |
| `node scripts/publish-toy.mjs update <id>` | Same as above but for updates                                |
| `npm run release` / `release:dry`          | bumpp: bump version, commit, tag, push                       |

## Editing rules

- Edit `packages/starter-toy/src/App.vue` to change the toy itself.
- Edit `packages/starter-lib/src/core/index.ts` to change the library.
- Do **not** edit anything under `dist/` — it's a build artifact.
- Do **not** add `eslint`, `prettier`, or `tsdown.config.ts`. `vite-plus`
  handles all of these through `vite.config.ts`.
- Do **not** introduce `simple-git-hooks` / `nano-staged` — `vp staged` plus
  `vp config --hooks` covers the same ground inside the vp toolchain.
