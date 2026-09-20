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

    <main class="flex-1 flex flex-col items-center p-6">
      <RouterView />
    </main>

    <AppFooter />
  </div>
</template>
