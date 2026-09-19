<script setup lang="ts">
// filepath: src/App.vue
//
// App shell: top nav + <RouterView>. Pages live in src/pages/ and are routed
// automatically (vue-router file-based routing, hash mode).
//
// What you should NOT change:
//   - index.html / main.ts wiring
//   - `base: './'` in vite.config.ts (Toy platform requires relative URLs)
//   - hash history in main.ts (history mode 404s under /toy/<slug>/)

import { computed } from 'vue'
import { toy } from 'bilibili-toy'

// Repo URL is hardcoded — change here if you fork. Used for both the GitHub
// icon link and the footer commit link.
const REPO_URL = 'https://github.com/imba97/bilibili-toy-starter'

const navItems = [
  { to: '/', label: '签到', icon: 'i-carbon:checkbox-checked-filled' },
  { to: '/rank', label: '排行榜', icon: 'i-carbon:trophy' },
  { to: '/about', label: '关于', icon: 'i-carbon:information' }
]

// Build-time constants injected by `buildInfoPlugin` (see vite.config.ts).
// On a real git checkout both are non-empty; on shallow / non-git builds
// `__BUILD_COMMIT__` is '' and we hide the footer block entirely.
const commitFull = __BUILD_COMMIT__
const commitShort = commitFull.slice(0, 7).toUpperCase()
const appVersion = __APP_VERSION__
const commitHref = commitFull ? `${REPO_URL}/commit/${commitFull}` : REPO_URL
const showFooter = commitFull !== ''

// 运行时实际只有两个环境：Mock（本地假数据，含 dev 与 preview URL 两个来源）
// 与 Production（正式发布，走真实 ToySDK）。footer 用来提示当前是什么环境；
// preview 单独标 "Preview" 便于区分来源，但底层 SDK 行为与 Mock 一致。
type AppMode = 'mock' | 'prod'
const isPreviewUrl = typeof location !== 'undefined' && location.pathname.includes('/toy/preview/')
const mode = computed<AppMode>(() => (toy.mockEnabled() ? 'mock' : 'prod'))
const modeLabel = computed(() => {
  if (mode.value === 'prod') return 'Production'
  return isPreviewUrl ? 'Preview' : 'Mock'
})
const modeClass = computed(() =>
  mode.value === 'prod'
    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
    : isPreviewUrl
      ? 'bg-sky-100 text-sky-700 border-sky-200'
      : 'bg-amber-100 text-amber-700 border-amber-200'
)
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

  <div class="min-h-screen flex flex-col">
    <header class="flex items-center justify-center gap-3 pt-10 pb-2">
      <!-- B 站小电视 logo：logos 图标集里没有 bilibili 图标，用内联 SVG -->
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class="w-8 h-8 text-pink-500">
        <path
          d="M17.813 4.653h.854c1.51.054 2.769.578 3.773 1.574 1.004.995 1.524 2.249 1.56 3.76v7.36c-.036 1.51-.556 2.769-1.56 3.773s-2.262 1.524-3.773 1.56H5.333c-1.51-.036-2.769-.556-3.773-1.56S.036 18.858 0 17.347v-7.36c.036-1.511.556-2.765 1.56-3.76 1.004-.996 2.262-1.52 3.773-1.574h.774l-1.174-1.12a1.234 1.234 0 0 1-.373-.906c0-.356.124-.658.373-.907l.027-.027c.267-.249.573-.373.92-.373.347 0 .653.124.92.373L9.653 4.44c.071.071.134.142.187.213h4.267a.836.836 0 0 1 .16-.213l2.853-2.747c.267-.249.573-.373.92-.373.347 0 .662.151.929.4.267.249.391.551.391.907 0 .355-.124.657-.373.906zM5.333 7.24c-.746.018-1.373.276-1.88.773-.506.498-.769 1.13-.786 1.894v7.52c.017.764.28 1.395.786 1.893.507.498 1.134.756 1.88.773h13.334c.746-.017 1.373-.275 1.88-.773.506-.498.769-1.129.786-1.893v-7.52c-.017-.765-.28-1.396-.786-1.894-.507-.497-1.134-.755-1.88-.773zM8 11.107c.373 0 .684.124.933.373.25.249.383.56.4.933v2.587c0 .373-.124.684-.373.933-.249.25-.56.374-.934.374-.373 0-.684-.125-.933-.374-.25-.249-.374-.56-.374-.933v-2.587c0-.373.124-.684.374-.933.249-.249.56-.373.933-.373zm8 0c.373 0 .684.124.933.373.25.249.383.56.4.933v2.587c0 .373-.124.684-.373.933-.249.25-.56.374-.933.374-.373 0-.684-.125-.933-.374-.25-.249-.373-.56-.373-.933v-2.587c0-.373.124-.684.373-.933.249-.249.56-.373.933-.373z"
        />
      </svg>
      <h1 class="text-2xl font-bold text-pink-600">Hello, Toy!</h1>
    </header>

    <nav class="flex justify-center gap-2 py-3">
      <RouterLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        custom
        v-slot="{ navigate, isActive }"
      >
        <button
          type="button"
          class="px-4 py-1.5 rounded-full text-sm font-medium transition inline-flex items-center gap-1.5"
          :class="
            isActive
              ? 'bg-pink-500 text-white shadow-sm'
              : 'bg-white text-gray-600 hover:text-pink-500 border border-pink-200'
          "
          @click="navigate"
        >
          <span :class="item.icon" />
          {{ item.label }}
        </button>
      </RouterLink>
    </nav>

    <main class="flex-1 flex flex-col items-center p-6">
      <RouterView />
    </main>

    <footer v-if="showFooter" class="px-6 pb-4 pt-2 text-xs text-gray-400">
      <hr class="border-t border-pink-100 mb-3" />
      <div class="flex items-center justify-center gap-2 flex-wrap">
        <span
          class="px-2 py-0.5 rounded-full border text-[10px] font-medium tracking-wide"
          :class="modeClass"
          :title="
            mode === 'prod'
              ? '当前走真实 ToySDK'
              : isPreviewUrl
                ? 'Toy 平台预览 URL（/toy/preview/），强制走本地 mock 数据'
                : '当前走本地 mock 数据'
          "
        >
          {{ modeLabel }}
        </span>
        <span aria-hidden="true">·</span>
        <a
          :href="commitHref"
          target="_blank"
          rel="noopener noreferrer"
          class="hover:text-pink-500 transition"
          :title="`View commit ${commitFull} on GitHub`"
        >
          Commit <span class="font-mono">{{ commitShort }}</span>
        </a>
        <span aria-hidden="true">·</span>
        <span>v{{ appVersion }}</span>
      </div>
    </footer>
  </div>
</template>
