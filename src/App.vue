<script setup lang="ts">
// filepath: packages/starter-toy/src/App.vue
//
// Starter scaffold. Replace this file's content with your own Toy.
//
// Things you can freely change here without touching the build:
//   - The <template> markup
//   - The <script setup> logic and state
//   - UnoCSS utility classes (Tailwind-compatible atomic CSS)
//
// What you should NOT change:
//   - index.html / main.ts wiring
//   - `base: './'` in vite.config.ts (Toy platform requires relative URLs)

import { ref } from 'vue'
// Centralized repo metadata. Override at build time with
//   REPO_URL=https://github.com/you/your-toy vp build
const REPO_URL = import.meta.env.VITE_REPO_URL ?? 'https://github.com/imba97/bilibili-toy-starter'
const count = ref(0)
</script>

<template>
  <a
    :href="REPO_URL"
    target="_blank"
    rel="noopener noreferrer"
    aria-label="View source on GitHub"
    title="View source on GitHub"
    class="fixed top-4 right-4 w-6 h-6 text-gray-500 hover:text-pink-500 transition inline-flex items-center justify-center"
  >
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class="w-6 h-6">
      <path
        d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
      />
    </svg>
  </a>

  <main class="min-h-screen flex flex-col items-center justify-center p-8 gap-6">
    <header class="flex flex-col items-center gap-2">
      <div class="i-logos-bilibili-fill text-6xl text-pink-500" />
      <h1 class="text-3xl font-bold text-pink-600">Hello, Toy!</h1>
      <p class="text-sm text-gray-500 max-w-md text-center">
        这是一个 Bilibili Toy 平台 starter —— 工程化已经由 vite-plus 接管。
      </p>
    </header>

    <Hello :name="'B 站创作者'" />

    <button
      type="button"
      class="px-4 py-2 rounded bg-pink-500 text-white hover:bg-pink-600 active:bg-pink-700 transition"
      @click="count++"
    >
      点我一下：{{ count }}
    </button>

    <footer class="flex flex-wrap items-center justify-center gap-2">
      <span class="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700 font-medium"
        >Vue 3</span
      >
      <span class="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 font-medium"
        >UnoCSS</span
      >
      <span class="px-2 py-0.5 text-xs rounded-full bg-sky-100 text-sky-700 font-medium"
        >TypeScript</span
      >
      <span class="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700 font-medium"
        >Vite Plus</span
      >
    </footer>
  </main>
</template>
