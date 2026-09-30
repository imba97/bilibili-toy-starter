<script setup lang="ts">
// filepath: src/components/LoginGate.vue
//
// 登录门卫 —— 需要登录的页面套一层，未登录时只渲染引导卡片，**不渲染 page slot**。
//
//   <LoginGate>
//     <签到页面>...</签到页面>
//   </LoginGate>
//
// 三道防线（缺一不可，都是踩过坑换来的）：
//
//   1. **未登录 / 判定中都不渲染 slot**（模板里的 `v-if="isLoggedIn"`）。登录态初始是
//      unknown，此时既不渲染页面也不发任何请求；判定完成才决定渲染页面还是卡片。
//      ⚠️ Vue 可能在门卫渲染时抢先创建页面组件的 vnode/实例（实测如此），
//      而且**只创建一次**：等登录成功、插槽真正渲染时复用的是同一个实例，
//      页面的 onMounted 不会再触发。所以页面必须 `watch(isLoggedIn, …, { immediate: true })`
//      来加载数据，而不是 `onMounted` —— 见 index.vue / rank.vue。
//
//   2. **登录后挂载页面本体**：点「登录」→ useLogin.login() → user.profile()
//      （平台弹用户数据确认弹窗）→ 成功后 isLoggedIn 变 true → 页面才挂载并读数据。
//
//   3. **跨刷新保持登录**：onMounted 调一次 bootSession()（幂等）。登录过的用户刷新后
//      直接进内容，不必每次都点「登录」；判定失败则安静停在引导卡片上，不报错。
//
// 文案可定制：签到页与排行榜页的引导语不同（title / description），按钮固定叫「登录」。

import { onMounted } from 'vue'
import { useLogin } from '@/composables/useLogin'

withDefaults(
  defineProps<{
    /** 卡片标题，如「登录后即可签到」 */
    title?: string
    /** 标题下的一行说明 */
    description?: string
  }>(),
  {
    title: '登录后继续',
    description: '登录后即可使用本功能'
  }
)

const { isLoggedIn, needsLogin, isPending, denied, error, login, bootSession } = useLogin()
// 失败原因（网络 / 服务不可用）只由 login() / bootSession() 写入；
// 「未登录」不算失败，卡片安静展示即可。
const hint = error

onMounted(() => {
  // 首屏判定一次（幂等）：有登录标记就直接进内容，没有就停在卡片上。
  // 判定期间 needsLogin 为 false → 卡片先渲染、按钮显示「登录中…」并禁用。
  bootSession()
})
</script>

<template>
  <!-- 已登录：挂载页面本体（此时页面才会去读需要登录的数据） -->
  <slot v-if="isLoggedIn" />

  <!--
    未登录 / 判定中：引导卡片。注意这里没有任何数据请求 —— 纯静态 + 一个按钮。
    条件写成 needsLogin || isPending 是刻意穷举四个状态（isLoggedIn 走上面那条）：
    isPending = unknown|checking，needsLogin = logged-out —— 中间态一旦新增，
    这里会自然落到卡片上，而不会出现「页面和卡片都不渲染」的空白。
  -->
  <section v-else-if="needsLogin || isPending" class="w-full max-w-sm">
    <div
      class="w-full px-6 py-8 rounded-2xl bg-white shadow-sm border border-pink-200 flex flex-col items-center gap-4 text-center"
    >
      <span aria-hidden="true" class="i-tabler:brand-bilibili w-10 h-10 text-pink-500" />

      <div class="flex flex-col gap-1.5">
        <h2 class="text-base font-bold text-gray-700">{{ title }}</h2>
        <p class="text-sm text-gray-500 leading-relaxed">{{ description }}</p>
      </div>

      <button
        type="button"
        class="w-full py-3 rounded-xl text-lg font-semibold bg-pink-500 text-white transition hover:bg-pink-600 active:bg-pink-700 disabled:opacity-60"
        :disabled="isPending"
        @click="login"
      >
        <span v-if="isPending" class="inline-flex items-center gap-2">
          <span class="i-svg-spinners:90-ring-with-bg" /> 登录中…
        </span>
        <span v-else>登录</span>
      </button>

      <p
        v-if="hint"
        class="text-xs leading-relaxed"
        :class="denied ? 'text-gray-400' : 'text-red-500'"
        role="alert"
      >
        {{ hint }}
      </p>

      <p class="text-xs text-gray-400 leading-relaxed">
        登录会由 B 站弹出「获取昵称、头像」确认框，仅用于本 Toy 内展示与关联数据
      </p>
    </div>
  </section>
</template>
