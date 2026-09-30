<script setup lang="ts">
// filepath: src/pages/rank.vue
//
// 排行榜页：getRankList 进页面拉一次 + 手动刷新；getMyRank 展示我的名次。
// 不轮询（§7-3）——刷新只由用户手动触发。
//
// 登录：getMyRank / 榜单里的「我」都要求已登录，所以整页套在 <LoginGate> 里。
// 未登录时门卫只展示引导卡片，本页一次榜单请求都不发（数据加载挂在 watch(isLoggedIn) 上）。
//
// 「我的排名」高亮：d.ts 声明 RankItem 没有 toyOpenId（榜单不含用户标识），
// 所以没法精确匹配「我」。近似方案：拿 getMyRank 的 rank 高亮对应名次；
// 同分名次唯一，rank 本身就是稳定标识。拿不到 myRank 时不高亮（宁缺勿滥）。
//
// 「不上榜」：hover 自己那一行 → 「我」tag 让位给 i-ci-hide 图标（tooltip「不上榜」），
// 点击即写云存储偏好；此后榜单渲染（含刷新后）都不再出现我这一行。
// 只有本用户视角生效 —— 服务端榜单摘不掉，详见 useRankStore.hiddenFromRank。

import { ref, watch } from 'vue'
import LoginGate from '@/components/LoginGate.vue'
import { useLogin } from '@/composables/useLogin'
import { useRankStore } from '@/composables/useRankStore'
import { isAuthError, toErrorMessage } from '@/composables/useToy'

// 榜单状态由本页负责加载 —— App.vue 不再首屏预拉（未登录时不该发请求）。
// 手动「刷新」按钮仍走 store.load() 重新拉取一次。
// 列表用 visibleList（已按「不上榜」偏好剔除我自己），原始 list 不在这里消费。
const rankStore = useRankStore()
const { isLoggedIn, markLoggedOut } = useLogin()
const list = rankStore.visibleList
const myRank = rankStore.myRank
const me = rankStore.me
const hiddenFromRank = rankStore.hiddenFromRank
const loading = rankStore.loading
const refreshing = rankStore.refreshing
const errorMessage = rankStore.errorMessage

/** 「不上榜 / 重新上榜」的写入状态与错误提示（本页局部，不进全局 store） */
const actionPending = ref(false)
const actionError = ref('')

/**
 * 登录后才拉榜。
 *
 * 为什么用 `watch(isLoggedIn, …, { immediate: true })` 而不是 `onMounted`：
 * Vue 可能在门卫「只渲染引导卡片」的那次渲染里就创建并挂载了本组件实例（实测如此），
 * 那次 onMounted 会被 `!isLoggedIn` 挡掉；等用户点登录成功、门卫把插槽真正渲染出来时，
 * Vue 复用的是同一个实例 —— onMounted 不会再触发，榜单就永远不会加载。
 * watch 监听共享登录态本身：实例何时创建 / 复用都无所谓，登录一成立就刷新。
 */
watch(
  isLoggedIn,
  (loggedIn) => {
    if (!loggedIn) return
    refresh()
  },
  { immediate: true }
)
async function refresh() {
  await rankStore.load().catch((err: unknown) => {
    // 错误信息已写入 store，模板会渲染错误态；未登录类错误则回到引导卡片
    if (isAuthError(err)) markLoggedOut()
  })
}

/**
 * 切换「不上榜」。写成功才改状态（见 setHiddenFromRank 的顺序说明），
 * 失败把原因落在本页提示条里 —— 不弹 toast，不污染全局 errorMessage。
 */
async function setHidden(hidden: boolean) {
  if (actionPending.value) return
  actionPending.value = true
  actionError.value = ''
  try {
    await rankStore.setHiddenFromRank(hidden)
  } catch (err) {
    actionError.value = `${hidden ? '设置不上榜' : '恢复上榜'}失败：${toErrorMessage(err)}`
  } finally {
    actionPending.value = false
  }
}

const medalClass = (rank: number) =>
  rank === 1
    ? 'i-carbon:trophy-filled text-yellow-500'
    : rank === 2
      ? 'i-carbon:trophy-filled text-gray-400'
      : rank === 3
        ? 'i-carbon:trophy-filled text-amber-600'
        : ''

/**
 * 高亮「我」：d.ts 明确不给 toyOpenId/mid —— 唯一可用的近似锚点是 nickname。
 * 仅当「我」上榜且在当前 list 内（list 是前 N 名，可能不含我）时高亮。
 * 「我」的真实名次（包括排在 limit 之外的情况）由顶部 myRank 横幅承担。
 */
const isMe = (entry: ToySDK.RankItem): boolean =>
  myRank.value !== null && myRank.value.ranked && rankStore.isMeEntry(entry)
</script>

<template>
  <!--
    登录门卫：未登录时只展示引导卡片 —— getMyRank / getRankList 一次都不发。
    点「登录」成功后插槽才渲染出内容，本页再按正常流程拉榜。
  -->
  <LoginGate
    title="登录后查看排行榜"
    description="排行榜需要你的登录态来标记「我」的名次并参与上榜"
  >
    <section class="w-full max-w-sm flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-bold text-gray-700">签到排行榜</h2>
        <button
          type="button"
          class="px-3 py-1.5 rounded-full text-sm bg-white border border-pink-200 text-gray-600 hover:text-pink-500 transition inline-flex items-center gap-1.5 disabled:opacity-50"
          :disabled="refreshing || loading"
          @click="refresh"
        >
          <span :class="refreshing ? 'i-svg-spinners:90-ring-with-bg' : 'i-carbon:renew'" />
          刷新
        </button>
      </div>

      <!-- 「不上榜」优先于名次横幅：已经选择不上榜就不该再强调「第 N 名」 -->
      <div
        v-if="hiddenFromRank"
        class="px-4 py-3 rounded-xl bg-white border border-dashed border-pink-200 flex items-center justify-between gap-2 shadow-sm"
      >
        <span class="flex items-center gap-2 min-w-0">
          <span class="i-ci-hide text-lg text-gray-400 shrink-0" />
          <span class="text-sm text-gray-500 truncate">已设置不上榜，榜单不展示你</span>
        </span>
        <button
          type="button"
          class="shrink-0 text-sm font-medium text-pink-500 hover:text-pink-600 transition disabled:opacity-50"
          :disabled="actionPending"
          @click="setHidden(false)"
        >
          重新上榜
        </button>
      </div>

      <div
        v-else-if="myRank && myRank.ranked"
        class="px-4 py-3 rounded-xl bg-pink-500 text-white flex items-center justify-between shadow-sm"
      >
        <span class="flex items-center gap-2 min-w-0">
          <img
            v-if="me?.avatar"
            :src="me.avatar"
            :alt="me.nickname"
            class="w-7 h-7 rounded-full shrink-0"
            referrerpolicy="no-referrer"
          />
          <span class="text-sm truncate">{{ me?.nickname ?? '我' }}</span>
        </span>
        <span class="font-bold shrink-0">第 {{ myRank.rank }} 名 · {{ myRank.score }} 天</span>
      </div>

      <div class="rounded-2xl bg-white shadow-sm border border-pink-200 overflow-hidden">
        <div v-if="loading" class="py-12 flex flex-col items-center gap-3">
          <div class="i-svg-spinners:180-ring text-3xl text-pink-400" />
          <p class="text-sm text-gray-400">加载榜单中…</p>
        </div>

        <div v-else-if="errorMessage" class="py-12 px-6 text-center">
          <p class="text-sm text-red-500">{{ errorMessage }}</p>
          <button
            type="button"
            class="mt-3 px-4 py-1.5 rounded-full text-sm bg-pink-500 text-white hover:bg-pink-600 transition"
            @click="refresh"
          >
            重试
          </button>
        </div>

        <ul v-else-if="list.length" class="divide-y divide-pink-50">
          <li
            v-for="entry in list"
            :key="entry.rank"
            class="group/row px-4 py-3 flex items-center gap-3"
            :class="isMe(entry) ? 'bg-pink-50' : ''"
          >
            <span class="w-7 text-center">
              <span
                v-if="medalClass(entry.rank)"
                :class="medalClass(entry.rank)"
                class="text-lg inline-block w-5 h-5"
              />
              <span v-else class="text-sm text-gray-400 tabular-nums">{{ entry.rank }}</span>
            </span>
            <img
              v-if="entry.avatar"
              :src="entry.avatar"
              :alt="entry.nickname"
              class="w-6 h-6 rounded-full"
              referrerpolicy="no-referrer"
            />
            <span class="flex-1 min-w-0 flex items-center gap-1 text-sm text-gray-700">
              <span class="truncate">{{ isMe(entry) && me ? me.nickname : entry.nickname }}</span>
              <template v-if="isMe(entry)">
                <!--
                  常态是粉色「我」tag；hover 整行时让位给「不上榜」图标。
                  触屏（hover: none）没有 hover 态，直接显示图标，否则手机上够不着。
                -->
                <span
                  class="shrink-0 px-1.5 py-0.5 text-xs rounded bg-pink-500 text-white font-medium group-hover/row:hidden [@media(hover:none)]:hidden"
                  >我</span
                >
                <button
                  type="button"
                  class="group/tip relative shrink-0 hidden group-hover/row:flex [@media(hover:none)]:flex items-center justify-center w-5 h-5 rounded text-gray-400 hover:text-pink-500 transition-colors disabled:opacity-50"
                  aria-label="不上榜"
                  :disabled="actionPending"
                  @click="setHidden(true)"
                >
                  <span class="i-ci-hide text-base" />
                  <!-- tooltip：放在图标左侧，避免被卡片 overflow-hidden 裁掉 -->
                  <span
                    class="pointer-events-none absolute right-full top-1/2 -translate-y-1/2 mr-2 px-2 py-1 rounded-md bg-gray-800 text-white text-xs whitespace-nowrap opacity-0 group-hover/tip:opacity-100 group-focus-visible/tip:opacity-100 transition-opacity"
                    >不上榜</span
                  >
                </button>
              </template>
            </span>
            <span class="text-sm font-semibold text-pink-600 tabular-nums"
              >{{ entry.score }} 天</span
            >
          </li>
        </ul>

        <p v-else class="py-12 text-center text-sm text-gray-400">还没有人上榜，快回首页签到吧</p>
      </div>

      <p v-if="actionError" class="text-xs text-red-500 text-center">{{ actionError }}</p>

      <p class="text-xs text-gray-400 text-center">榜单按累计签到天数排序，签到后自动更新</p>
    </section>
  </LoginGate>
</template>
