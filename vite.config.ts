// filepath: vite.config.ts
//
// Single source of truth for the whole toolchain.
//
// `vite-plus` (the `vp` CLI) extends Vite's `defineConfig` so that all
// toolchain blocks (`fmt`, `lint`, `check`, `test`, `staged`) live in this
// one file alongside the Vite-specific bits.
// See: https://viteplus.dev/config
//
// IMPORTANT for the Bilibili Toy platform:
//   - `base: './'` produces RELATIVE asset URLs so the built bundle can be
//     hosted under `/toy/<slug>/` without 404s.
//   - No `historyApiFallback`-style rewrites — Toy pages are static SPAs.

import { defineConfig } from 'vite-plus'
import { buildInfoPlugin } from './scripts/vite-plugins/build-info'
import vue from '@vitejs/plugin-vue'
// Vue Router 5 built-in file-based routing (src/pages/ → routes).
// MUST be placed before vue() so <route> blocks in SFCs are picked up.
import VueRouter from 'vue-router/vite'
// UnoCSS 66.10.x 的 `vite` plugin 类型签名锚定旧版 Vite。运行时在 Vite 8
// (vite-plus core) 上 OK —— 仅是 .d.ts 比实际 plugin 形状窄，强制 cast
// 是过渡方案。等 UnoCSS 适配新 Vite 类型后可去掉。
import UnoCSS from 'unocss/vite'

export default defineConfig({
  // --- Vite (base) ---
  base: './',
  plugins: [buildInfoPlugin(), VueRouter(), vue(), UnoCSS() as any],

  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname
    }
  },

  build: {
    target: 'esnext',
    outDir: 'dist',
    assetsInlineLimit: 0,
    // Keep filenames predictable so users can verify dist/ contents by eye.
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  },

  server: {
    port: 5173,
    open: false
  },

  preview: {
    port: 4173
  },

  // --- Format (Oxfmt) ---
  // Stable baseline: single quotes, no semis, no trailing commas.
  fmt: {
    singleQuote: true,
    semi: false,
    trailingComma: 'none'
  },

  // --- Lint (Oxlint) ---
  lint: {
    options: {
      // Run TypeScript-aware checks via tsgolint. `vp check` will then do
      // format + lint + type-check in one pass.
      typeAware: true,
      typeCheck: true
    },
    rules: {
      'no-console': 'warn'
    },
    // oxlint overrides is an ARRAY of { files, rules } entries.
    // Scripts are Node CLI runners — they MUST be allowed to use console.*
    overrides: [
      {
        files: ['scripts/**/*.ts'],
        rules: {
          'no-console': 'off'
        }
      }
    ]
  },

  // --- `vp check` orchestration (fmt + lint + tsc) ---
  // No `files` override — vp uses its built-in glob.

  // --- Test (Vitest) ---
  test: {
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    environment: 'node'
  },

  // --- Pre-commit (vp staged) ---
  // Run on git-indexed files only — fast feedback loop.
  staged: {
    '*.{ts,tsx,vue,js,mjs,cjs}': ['fmt', 'lint'],
    '*.{ts,tsx,vue}': ['check']
  }
})
