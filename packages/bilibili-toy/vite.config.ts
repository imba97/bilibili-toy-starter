// filepath: packages/bilibili-toy/vite.config.ts
//
// `vite-plus` (the `vp` CLI) extends Vite's `defineConfig` so that all
// toolchain blocks (`fmt`, `lint`, `check`, `test`, `staged`) live in this
// one file alongside the Vite-specific bits.
// See: https://viteplus.dev/config
//
// Bilibili Toy SDK wrapper:
//   - Pure TS, zero runtime deps, no Vue.
//   - `vp pack` emits a single ESM entry (src/index.ts) with .d.ts.
//
// The official `toy.d.ts` lives at `src/types/toy-sdk.d.ts`. We copy it
// (via the build pipeline below) into `dist/types/` so downstream consumers
// can resolve `ToySDK.*` types without separate @types/* installs.

import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite-plus'

const here = dirname(fileURLToPath(import.meta.url))

// Tiny Vite plugin that mirrors src/types/*.d.ts into dist/types/.
// `vp pack` only ships the bundled .d.ts; SDK consumers still need the
// ambient `toy-sdk.d.ts` so `ToySDK.*` resolves.
const copyToySdkTypesPlugin = {
  name: 'copy-toy-sdk-types',
  closeBundle() {
    const src = resolve(here, 'src/types/toy-sdk.d.ts')
    const dest = resolve(here, 'dist/types/toy-sdk.d.ts')
    mkdirSync(dirname(dest), { recursive: true })
    copyFileSync(src, dest)
  }
}

export default defineConfig({
  plugins: [copyToySdkTypesPlugin],

  build: {
    target: 'esnext',
    outDir: 'dist',
    lib: {
      entry: resolve(here, 'src/index.ts'),
      formats: ['es'],
      fileName: () => 'index.mjs'
    },
    rollupOptions: {
      // Zero runtime deps — bundle everything (including any transitive).
      external: []
    }
  },

  // --- Pack: tsdown under the hood ---
  pack: {
    entry: {
      index: 'src/index.ts'
    }
  },

  // --- Format (Oxfmt) ---
  fmt: {
    singleQuote: true,
    semi: false,
    trailingComma: 'none'
  },

  // --- Lint (Oxlint) ---
  lint: {
    options: {
      typeAware: true,
      typeCheck: true
    }
  },

  // --- Test (Vitest) ---
  // Tests live under `tests/` mirroring `src/` so source and tests stay
  // cleanly separated (no `.test.ts` files mixed into published sources).
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node'
  },

  // --- Pre-commit ---
  staged: {
    '*.{ts}': ['fmt', 'lint', 'check']
  }
})
