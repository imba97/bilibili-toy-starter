# AGENTS.md — bilibili-toy-starter

> **Repo**: <https://github.com/imba97/bilibili-toy-starter>
> **Note**: This file is informational. The authoritative workflow rules live in the
> `toy` skill (c:\Users\imba97\.agents\skills\toy\SKILL.md). If anything here
> conflicts with the skill, the skill wins.

## Scope

This repo is a **starter** for the Bilibili Toy platform — a Vue 3 SPA built
by `vp build` and uploaded to `toy create` / `toy update`. It consumes the
[`bilibili-toy`](https://github.com/imba97/bilibili-toy) TypeScript SDK from
npm; the SDK source no longer lives in this repo.

## Hard rules for AI agents

- **Publishing a Toy is a two-stage workflow.** Run `toy create` / `toy update`
  **without** `--yes` first to get a `preview_url`. Do NOT pass `--yes` until
  the human has reviewed the preview and explicitly said "submit".
- **Slug is locked after first publish.** Use `toy update`, never
  delete-and-recreate, to change a slug — that erases the toy's history.
- **Toy pages run under `/toy/<slug>/`.** Keep `base: './'` in
  `vite.config.ts`. Do not switch to absolute `/` paths in built assets, or
  pages will 404.
- **Don't create `toy.yaml`.** Publishing state lives in the official `toy`
  CLI's local history, not in the repo.
- **Run `vp check` before committing.** It runs Oxfmt + Oxlint + tsc and is fast.
- **The SDK is consumed from npm, not built locally.** `npm run toy:publish`
  and `npm run toy:update` only run `vp build` — they no longer pack the SDK.
  If you need to change SDK behavior, edit the
  [`bilibili-toy`](https://github.com/imba97/bilibili-toy) repo, cut a release,
  then `pnpm update bilibili-toy` here.

## Useful commands

| Command                                   | What it does                                               |
| ----------------------------------------- | ---------------------------------------------------------- |
| `npm run dev`                             | Start the toy dev server on http://localhost:5173          |
| `npm run build`                           | Build the toy into `dist/`                                 |
| `npm run pack:zip`                        | Build toy + zip into a downloadable artifact               |
| `npm run test`                            | Run vitest                                                 |
| `npm run check`                           | Format + lint + type-check                                 |
| `npm run fmt` / `lint` / `staged`         | Individual checks                                          |
| `npm run typecheck`                       | Standalone `vue-tsc --noEmit` (separate from `vp check`)   |
| `npm run hooks:install` / `hooks:status`  | One-shot install + status of git pre-commit hooks          |
| `npm run toy:mylist`                      | List toys for the logged-in account                        |
| `npm run toy:login`                       | `toy login` — bind CLI to a B 站 creator account           |
| `npm run toy:stats`                       | `toy stats` — PV / UV for the current toy                  |
| `npm run toy:history`                     | `toy history` — past publish / update records              |
| `npm run toy:bind` / `toy:unbind`         | `toy video bind` / `unbind` — link/unlink a video to a Toy |
| `npm run toy:publish`                     | `vp build` + `toy create ./dist --json`                    |
| `npm run toy:update -- <id>`              | `vp build` + `toy update <id> ./dist --json`               |
| `node scripts/publish-toy.ts create`      | Same as above but with friendlier output                   |
| `node scripts/publish-toy.ts update <id>` | Same as above but for updates                              |

### Two-stage publish — which entrypoint?

There are **two** publish entrypoints. Pick by intent, not convenience:

- **`npm run toy:publish` / `toy:update`** — minimal. Just runs `vp build`
  then `toy create|update ./dist --json`. Stops as soon as the CLI exits.
  Good for scripted / CI flows where the preview URL is captured downstream.
- **`node scripts/publish-toy.ts create|update`** — same underlying calls,
  plus parses the JSON response and prints a clear `Preview URL:` banner with
  the next-step hint (re-run with `--yes` after human review). **This is the
  one human authors should use** during interactive publish — the two-stage
  rule from the `toy` skill is easier to follow when the script surfaces
  the preview step explicitly.

Neither wrapper ever passes `--yes`. Submitting for review is always a
human decision echoed back to the CLI manually (see Hard rules above).

## Editing rules

- Edit `src/App.vue` (and `src/pages/` / `src/components/`) to change the toy
  itself.
- Edit `src/types/toy-sdk.d.ts` only when the shim itself needs adjusting.
  The authoritative ambient declarations for `ToySDK.*` live in the
  [`bilibili-toy`](https://github.com/imba97/bilibili-toy) package
  (`bilibili-toy/src/types/toy-sdk.d.ts`, exposed via
  `package.json#exports["./types/toy-sdk.d.ts"]`); the local file is just a
  `/// <reference path="..." />` shim that forwards to it. When B 站 updates
  the official Toy SDK types, edit `bilibili-toy`, cut a release, then
  `pnpm update bilibili-toy` here.
- Edit `src/composables/`, `src/mock/` for app-specific logic and mock hooks.
- Do **not** edit anything under `dist/` — it's a build artifact.
- Do **not** add `eslint`, `prettier`, or `tsdown.config.ts`. `vite-plus`
  handles all of these through `vite.config.ts`.
- Do **not** introduce `simple-git-hooks` / `nano-staged` — `vp staged` plus
  `vp config --hooks` covers the same ground inside the vp toolchain.
