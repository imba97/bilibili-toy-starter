// filepath: src/types/toy-sdk.d.ts
//
// Shim for the official B 站 Toy SDK ambient declarations.
//
// The authoritative file lives in the `bilibili-toy` package
// (`bilibili-toy/types/toy-sdk.d.ts` — exposed via package.json#exports).
// We forward to it so:
//
//   - The single source of truth is `bilibili-toy/src/types/toy-sdk.d.ts`,
//     synced with the upstream Toy platform.
//   - When the user upgrades `bilibili-toy`, the new ambient types flow
//     in automatically with `pnpm update bilibili-toy`.
//
// Resolved via `exports["./types/toy-sdk.d.ts"]` in bilibili-toy's
// package.json, which points at `dist/types/toy-sdk.d.ts` (produced by the
// `copyToySdkTypesPlugin` in vite.config.ts).
//
// Why a path reference and not a triple-slash `/// <reference types="..." />`?
// `reference types=` looks up `@types/*` style packages and doesn't resolve
// arbitrary sub-paths. `reference path=` lets us point straight at the
// sub-path declared in `exports`, and Bundler-resolution honours it.

/// <reference path="bilibili-toy/types/toy-sdk.d.ts" />
