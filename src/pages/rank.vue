<script setup lang="ts">
// filepath: src/pages/rank.vue
//
// 排行榜页：getRankList 进页面拉一次 + 手动刷新；getMyRank 展示我的名次。
// 不轮询（§7-3）——刷新只由用户手动触发。
//
// 「我的排名」高亮：d.ts 声明 RankItem 没有 toyOpenId（榜单不含用户标识），
// 所以没法精确匹配「我」。近似方案：拿 getMyRank 的 rank 高亮对应名次；
// 同分名次唯一，rank 本身就是稳定标识。拿不到 myRank 时不高亮（宁缺勿滥）。

import { useRankStore } from '@/composables/useRankStore'

// 共享首屏拉取的榜单状态 —— App 挂载时已 load 一次，本页直接消费。
// 手动「刷新」按钮仍走 store.load() 重新拉取一次。
const rankStore = useRankStore()
const list = rankStore.list
const myRank = rankStore.myRank
const me = rankStore.me
const loading = rankStore.loading
const refreshing = rankStore.refreshing
const errorMessage = rankStore.errorMessage

async function refresh() {
  await rankStore.load().catch(() => {
    // 错误信息已写入 store，模板会渲染错误态
  })
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
  myRank.value !== null &&
  myRank.value.ranked &&
  me.value !== null &&
  entry.nickname === me.value.nickname
</script>

<template>
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

    <div
      v-if="myRank && myRank.ranked"
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
          class="px-4 py-3 flex items-center gap-3"
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
          <span class="flex-1 text-sm text-gray-700 truncate">
            {{ isMe(entry) && me ? me.nickname : entry.nickname }}
            <span
              v-if="isMe(entry)"
              class="ml-1 px-1.5 py-0.5 text-xs rounded bg-pink-500 text-white font-medium"
              >我</span
            >
          </span>
          <span class="text-sm font-semibold text-pink-600 tabular-nums">{{ entry.score }} 天</span>
        </li>
      </ul>

      <p v-else class="py-12 text-center text-sm text-gray-400">还没有人上榜，快回首页签到吧</p>
    </div>

    <p class="text-xs text-gray-400 text-center">榜单按累计签到天数排序，签到后自动更新</p>
  </section>
</template>
