<script setup lang="ts">
// filepath: src/components/AppFooter.vue
//
// 全局页脚：环境徽章 + 提交链接 + 版本号。
//
// 运行时实际只有两个环境：Dev（本地假数据，含本地 dev 与 Toy 预览 URL 两个来源）
// 与 Production（正式发布，走真实 ToySDK）。
// preview URL 单独标 "Preview" 便于区分来源，但底层 SDK 行为与本地 Dev 一致。
//
// 组件自身读取 toy.mockEnabled() / __BUILD_COMMIT__ / __APP_VERSION__，
// 业务页面无需关心 env 识别 —— 直接放在 layout 任意位置即可。
import { computed } from 'vue'
import { toy } from 'bilibili-toy'

// 与 App.vue 顶栏 GitHub 图标共用,改仓库时这里也要同步改
const REPO_URL = 'https://github.com/imba97/bilibili-toy-starter'

type AppMode = 'development' | 'production'
const isPreviewUrl = typeof location !== 'undefined' && location.pathname.includes('/toy/preview/')
const mode = computed<AppMode>(() => (toy.mockEnabled() ? 'development' : 'production'))
const modeLabel = computed(() => {
  if (mode.value === 'production') return 'production'
  return isPreviewUrl ? 'preview' : 'development'
})
const modeTitle = computed(() =>
  mode.value === 'production'
    ? '当前走真实 ToySDK'
    : isPreviewUrl
      ? 'Toy 平台预览 URL（/toy/preview/），强制走本地 mock 数据'
      : '当前走本地 mock 数据'
)

// Build-time constants injected by `buildInfoPlugin` (see vite.config.ts).
// 非 git checkout 时 commitFull 为空,整个 footer 不渲染。
const commitFull = __BUILD_COMMIT__
const commitShort = commitFull.slice(0, 7).toLowerCase()
const appVersion = __APP_VERSION__
const commitHref = commitFull ? `${REPO_URL}/commit/${commitFull}` : REPO_URL
</script>

<template>
  <footer class="px-6 pb-4 pt-2 text-xs text-gray-400">
    <hr class="border-t border-pink-100 mb-3" />
    <div class="flex items-center justify-center gap-2 flex-wrap">
      <span :title="modeTitle">{{ modeLabel }}</span>
      <span aria-hidden="true">·</span>
      <a
        :href="commitHref"
        target="_blank"
        rel="noopener noreferrer"
        class="hover:text-pink-500 transition"
        :title="`View commit ${commitFull} on GitHub`"
      >
        commit <span class="font-mono">{{ commitShort }}</span>
      </a>
      <span aria-hidden="true">·</span>
      <span>v{{ appVersion }}</span>
    </div>
  </footer>
</template>
