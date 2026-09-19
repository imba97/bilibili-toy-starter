<script setup lang="ts">
// filepath: src/pages/index.vue
//
// 签到主页：今日签到按钮 + 累计天数。
// 数据流：进页面一次 getCloudStorage 批量读（§7-3 不轮询）；
// 签到成功一次 setCloudStorage 批量写 + submitScore（§7-4 按事件提交）。

import { onMounted, ref } from 'vue'
import { rank, cloud, user, type ToySDK } from 'bilibili-toy'
import { initToy, toErrorMessage, isToyAvailable } from '@/composables/useToy'
import {
  STORAGE_KEYS,
  formatDate,
  isCheckedInToday,
  parseCheckinState,
  performCheckin,
  type CheckinState
} from '@/composables/checkin'

const state = ref<CheckinState>({ total: 0, lastDate: null })
const userProfile = ref<ToySDK.UserProfileResp | null>(null)
const loading = ref(true)
const submitting = ref(false)
const message = ref('')
const messageIsError = ref(false)
// 防重复提交：本 session 内已把分数同步到榜单就不再 submitScore（幂等但也耗额度）
let scoreSynced = false

const today = () => formatDate(new Date())

function notify(text: string, isError = false) {
  message.value = text
  messageIsError.value = isError
}

/** 把累计天数同步到排行榜；失败静默（不阻塞签到主流程，下次进页面会再补） */
async function syncScore(score: number): Promise<void> {
  if (scoreSynced || score <= 0) return
  try {
    await rank.submit({ score })
    scoreSynced = true
  } catch {
    // 忽略：榜单分数落后会在下次 onMounted 时由 ensureScoreSynced 补交
  }
}

onMounted(async () => {
  try {
    await initToy()
    const [raw, profile, mine] = await Promise.all([
      cloud.get([STORAGE_KEYS.total, STORAGE_KEYS.lastDate]),
      // 用户信息 / 我的排名读取失败不阻塞签到主流程
      user.profile().catch(() => null),
      rank.me().catch(() => null)
    ])
    state.value = parseCheckinState(raw)
    userProfile.value = profile
    // 补交：上次 submitScore 失败会导致榜单分数落后，进页面时对齐一次（§7-4 仍是按事件提交）
    if (mine && state.value.total > mine.score) {
      await syncScore(state.value.total)
    } else if (mine && mine.score >= state.value.total) {
      scoreSynced = true
    }
  } catch (error) {
    notify(`读取签到数据失败：${toErrorMessage(error)}`, true)
  } finally {
    loading.value = false
  }
})

async function checkin() {
  if (submitting.value || isCheckedInToday(state.value, today())) return
  submitting.value = true
  notify('')
  try {
    const result = performCheckin(state.value, today())
    // 一次批量写（§7-2）
    await cloud.set(result.writes)
    state.value = result.state
    // 排行榜分数 = 累计签到天数，只在签到事件提交一次（§7-4）；失败下次进页面补交
    const scoreBefore = scoreSynced
    await syncScore(result.state.total)
    notify(
      scoreSynced || scoreBefore
        ? `签到成功！累计 ${state.value.total} 天`
        : `签到成功！累计 ${state.value.total} 天（榜单同步稍候自动补上）`
    )
  } catch (error) {
    notify(`签到失败：${toErrorMessage(error)}`, true)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section class="w-full max-w-sm flex flex-col items-center gap-6">
    <p
      v-if="isMockEnvRef"
      class="px-3 py-1 text-xs rounded-full bg-amber-100 text-amber-700 font-medium"
    >
      演示模式：数据存在浏览器本地，不会上传
    </p>

    <div
      class="w-full px-6 py-8 rounded-2xl bg-white shadow-sm border border-pink-200 flex flex-col items-center gap-4"
    >
      <template v-if="loading">
        <div class="i-svg-spinners:180-ring text-3xl text-pink-400" />
        <p class="text-sm text-gray-400">读取签到数据中…</p>
      </template>

      <template v-else>
        <div v-if="user" class="flex items-center gap-2">
          <img
            v-if="user.avatar"
            :src="user.avatar"
            :alt="user.nickname"
            class="w-8 h-8 rounded-full"
            referrerpolicy="no-referrer"
          />
          <span v-else class="i-carbon:user-avatar-filled text-2xl text-gray-300" />
          <span class="text-sm text-gray-600 font-medium">{{ user.nickname }}</span>
        </div>

        <div class="text-center">
          <div class="text-5xl font-bold text-pink-600 tabular-nums">{{ state.total }}</div>
          <div class="mt-1 text-sm text-gray-500">累计签到天数</div>
        </div>

        <button
          type="button"
          class="w-full py-3 rounded-xl text-lg font-semibold transition"
          :class="
            isCheckedInToday(state, today())
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-pink-500 text-white hover:bg-pink-600 active:bg-pink-700 disabled:opacity-60'
          "
          :disabled="submitting || isCheckedInToday(state, today())"
          @click="checkin"
        >
          <span v-if="submitting" class="inline-flex items-center gap-2">
            <span class="i-svg-spinners:90-ring-with-bg" /> 签到中…
          </span>
          <span v-else-if="isCheckedInToday(state, today())">今日已签到</span>
          <span v-else>立即签到</span>
        </button>

        <p
          v-if="message"
          class="text-sm text-center"
          :class="messageIsError ? 'text-red-500' : 'text-green-600'"
        >
          {{ message }}
        </p>
      </template>
    </div>

    <p class="text-xs text-gray-400 text-center">签到数据存 Toy 云存储，累计天数同步到排行榜</p>
  </section>
</template>
