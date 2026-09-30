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
//
// 首屏**不再**预拉排行榜：getMyRank / getCloudStorage 都要求已登录，未登录时
// 发起只会 reject，把 `[ToySDK] ... 未登录` 报错糊在界面上。现在每个需要登录的
// 页面各自套一层 <LoginGate>（见 src/components/LoginGate.vue），确认登录后
// 才由该页自己拉数据，错误也在页面内就地展示（不再有全局错误顶栏）。

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

    <!--
      tab 切换用 replace 而不是 push：这三个页是本 Toy 的顶层入口，来回点几次
      只应该占用**一条**浏览器历史记录 —— 否则用户按返回要挨个倒着经过刚才每次点击，
      甚至出不去。replace 让当前路由条目被覆盖，返回键一步退出 Toy。
      （首屏那次导航 vue-router 本身也是 replace，见 finalizeNavigation 的 isFirstNavigation）
    -->
    <nav class="flex justify-center gap-2 py-3">
      <RouterLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        replace
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
