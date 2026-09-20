<script setup lang="ts">
// filepath: src/components/AppHeader.vue
//
// 顶部全宽固定 header：右上角 share/github 常驻；左上角 bilibili icon 与毛玻璃
// 背景同步（scrollY > 阈值时才显示，随背景渐入渐出）。路由导航 / 标题保持在
// App.vue 的流式布局里（header 之外），保持原位置不动。
//
// 设计：
//   - 右上角 share/github 永远 fixed 在视口顶部、常驻可见。
//   - 左上角 bilibili icon + 毛玻璃背景层（absolute 在 header 后面、独立
//     z-index）**同步**由 scrollY 控制渐显渐隐：> 阈值时一起出现，滚回顶端
//     一起渐隐。scrolled 时用 justify-between 让 icon 贴左；未滚动时用
//     justify-end，让左侧占位空白不可见，避免 layout 抖动。
//   - 切页（router.afterEach）立刻把 scrolled 复位为 false —— 新页面初始
//     scrollTop=0，避免上一页 scrollY 误显。
//
// 分享走 toy.share.to；仓库入口用 src/constants 里的 REPO_URL。

import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { share } from 'bilibili-toy'
import { REPO_URL } from '@/constants'

/** 毛玻璃背景的触发阈值：避免边界值/弹性滚动导致的 0-1 闪缩 */
const SCROLL_THRESHOLD = 4

/** 滚动 > 阈值时渐显毛玻璃背景。切页路由后立刻重置为 false。 */
const scrolled = ref(false)

function updateScroll() {
  scrolled.value = (typeof window !== 'undefined' ? window.scrollY : 0) > SCROLL_THRESHOLD
}

const router = useRouter()
// 切页时强制重置：页面切换会重新触发滚动复位 / 新页面 scrollTop=0，
// 这里用 afterEach 在路由完成时立刻清，避免旧页面的 scrollY 被误读。
const stopRouter = router.afterEach(() => {
  scrolled.value = false
})

onMounted(() => {
  updateScroll()
  window.addEventListener('scroll', updateScroll, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', updateScroll)
  stopRouter()
})

async function handleShare() {
  try {
    await share.to({ path: 'index.html' })
  } catch {
    // 用户取消分享或 SDK 不可用时静默吞掉，不打断 UI
  }
}
</script>

<template>
  <!--
    header 是 fixed；里面的内容永远可见。
    背景层（第一个子 div）独立控制 opacity，不影响 hit-area。
  -->
  <header class="fixed top-0 left-0 right-0 z-50" role="banner">
    <!-- 背景层：absolute 铺满父容器，仅 opacity 受 scrolled 控制 -->
    <div
      aria-hidden="true"
      class="absolute inset-0 transition-opacity duration-300 pointer-events-none"
      :class="scrolled ? 'opacity-100 bg-white/60 backdrop-blur-md shadow-sm' : 'opacity-0'"
    ></div>

    <!-- 实际内容：相对定位，z 高于背景层。h-header 与 App.vue 的 pt-header 共享同一个 spacing token。 -->
    <div class="relative flex items-center h-header px-4 sm:px-6">
      <!-- 左上角：B 站 logo（tabler:brand-bilibili）。跟随毛玻璃背景同步显隐。
           尺寸始终 w-6 h-6，不参与过渡 —— 只渐变 opacity，不会出现放大/缩小感。
           pointer-events-none 在透明时阻止意外点击命中。 -->
      <span
        aria-hidden="true"
        class="i-tabler:brand-bilibili w-6 h-6 text-pink-500 shrink-0 transition-opacity duration-300"
        :class="scrolled ? 'opacity-100' : 'opacity-0 pointer-events-none'"
      />

      <!-- 右上角：share + github。ml-auto 使其独立于左侧图标始终贴右，
           即使左侧图标隐藏也不会让右侧元素偏移。 -->
      <div class="flex items-center gap-2 text-gray-500 ml-auto">
        <button
          type="button"
          aria-label="分享 Toy"
          title="分享 Toy"
          class="w-8 h-8 hover:text-pink-500 transition inline-flex items-center justify-center"
          @click="handleShare"
        >
          <span class="i-tabler-share-3 w-5 h-5" aria-hidden="true" />
        </button>
        <a
          :href="REPO_URL"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View source on GitHub"
          title="View source on GitHub"
          class="w-8 h-8 hover:text-pink-500 transition inline-flex items-center justify-center"
        >
          <span class="i-tabler-brand-github w-5 h-5" aria-hidden="true" />
        </a>
      </div>
    </div>
  </header>

  <!--
    占位：main 内容起始位置要让出 fixed header 的高度（≈56px），
    否则初始内容会被 header 盖住。
  -->
</template>
