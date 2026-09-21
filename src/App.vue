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

import { RouterLink } from 'vue-router'
import AppFooter from './components/AppFooter.vue'
import AppHeader from './components/AppHeader.vue'
import { useRankStore } from './composables/useRankStore'

// 首屏在 App 层拉一次排行榜 —— 后续签到 / 路由切换都共享同一份数据，
// 避免每次进 rank.vue 重拉导致的服务端存储延迟看到旧数据。
// 错误信息走 errorMessage 顶栏，任何页面（包括首屏 index.vue）都能看见。
const rankStore = useRankStore()
rankStore.load().catch(() => {
  /* 错误已写入 rankStore.errorMessage，顶部条会渲染 */
})
// 模板消费的别名，避免冗长 chain
const errorMessage = rankStore.errorMessage

const navItems = [
  { to: '/', label: '签到', icon: 'i-carbon:checkbox-checked-filled' },
  { to: '/rank', label: '排行榜', icon: 'i-carbon:trophy' },
  { to: '/about', label: '关于', icon: 'i-carbon:information' }
]
</script>

<template>
  <AppHeader />

  <div class="min-h-screen flex flex-col">
    <header class="flex items-center justify-center gap-3 pt-10 pb-2">
      <span aria-hidden="true" class="i-tabler:brand-bilibili w-8 h-8 text-pink-500" />
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

    <p
      v-if="errorMessage"
      class="mx-6 mb-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600 text-center"
      role="alert"
    >
      {{ errorMessage }}
    </p>

    <main class="flex-1 flex flex-col items-center p-6">
      <RouterView />
    </main>

    <AppFooter />
  </div>
</template>
