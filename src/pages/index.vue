<script setup lang="ts">
// filepath: src/pages/index.vue
//
// 签到主页：今日签到按钮 + 累计天数。
// 数据流：进页面一次 getCloudStorage 批量读（§7-3 不轮询）；
// 签到成功一次 setCloudStorage 批量写 + submitScore（§7-4 按事件提交）。
//
// 登录：本页读的云存储、我的名次都要求已登录，所以整体套在 <LoginGate> 里。
// 详见 src/components/LoginGate.vue。
//
// ⚠️ 数据安全：签到**必须先读云端再写**。曾经这里拿本地 state 直接 +1 写回，
// 在本地 state 没被云端数据水合的情况下（门卫判定还没落地就被抢先挂载 / 读取失败）
// 会把真实累计天数覆盖成 1 —— 用户的历史记录被清空。现在：
//   - 没有 `dataReady`（云端真值没读回来）时，签到按钮不发请求；
//   - 每次签到都先 `cloud.get` 拿权威值，再 `applyCheckin` 算增量，详见 checkin.ts。

import { ref, watch } from 'vue'
import { isDeniedError, isToyError } from 'bilibili-toy'
import { rank, cloud, user } from '@/mock'
import LoginGate from '@/components/LoginGate.vue'
import { initToy, isAuthError, toErrorMessage } from '@/composables/useToy'
import { useLogin } from '@/composables/useLogin'
import { useRankStore } from '@/composables/useRankStore'
import {
  RESTORED_NOTICE,
  STORAGE_KEYS,
  applyCheckin,
  formatDate,
  isCheckedInToday,
  repairCheckinState,
  type CheckinState
} from '@/composables/checkin'

const state = ref<CheckinState>({ total: 0, lastDate: null })
// 榜单 store 只被签到流程用来本地 +1（bumpMyScore），本页不负责加载榜单。
const rankStore = useRankStore()
// 用户资料与登录态同源：门卫握手成功后 useLogin 已经存了一份，这里消费同一份
// 引用，避免进首页再触发一次 user.profile()。这里的赋值也会同步到门卫那边
// （同一个 ref），所以"授权用户信息"按钮重新拿到资料后，卡片状态跟着一致。
const { profile: userProfile, isLoggedIn, markLoggedOut } = useLogin()
/** 签到数据（cloud + mine）首屏加载状态；榜单状态走 rankStore.loading */
const bootLoading = ref(true)
/**
 * 云端真值是否已经落到本地 state。
 *
 * 这是防「累计天数被覆盖」的闸门：只有它为 true，签到按钮才允许发起写入。
 * 读取失败（网络 / 未登录）时它保持 false —— 宁可点不动，也不能拿 0 当基数去覆盖。
 */
const dataReady = ref(false)
const submitting = ref(false)
const authorising = ref(false)
const message = ref('')
const messageIsError = ref(false)
/** 用户拒绝授权信息（数据确认弹窗选了"拒绝"）。点击"授权用户信息"按钮可重新触发弹窗。 */
const userDenied = ref(false)
// 防重复提交：本 session 内已把分数同步到榜单就不再 submitScore（幂等但也耗额度）
let scoreSynced = false

const today = () => formatDate(new Date())

function notify(text: string, isError = false) {
  message.value = text
  messageIsError.value = isError
}

/**
 * 主动拉一次用户资料：用户点了"授权用户信息"按钮时走这里。
 * 不抛错：拒绝/失败都把状态落到 userDenied / userProfile，让模板自己分支渲染。
 */
async function fetchProfile() {
  try {
    // user.profile() 在 bilibili-toy 包的 dist 签名是 (req?: void) => Promise<UserProfileResp>，类型已精确。
    const profile = await user.profile()
    userProfile.value = profile
    userDenied.value = false
  } catch (err) {
    userProfile.value = null
    userDenied.value = isToyError(err) && isDeniedError(err)
    // 非拒绝类的失败（如网络/服务不可用）只在按钮回调里提示一次，避免反复 toast
  }
}

/** 把累计天数同步到排行榜；失败静默（不阻塞签到主流程，下次进页面会再补） */
async function syncScore(score: number): Promise<void> {
  if (scoreSynced || score <= 0) return
  try {
    await rank.submit({ score })
    scoreSynced = true
  } catch {
    // 忽略：榜单分数落后会在下次进页面时补交
  }
}

/**
 * 已登录才读云存储。
 *
 * 为什么用 `watch(isLoggedIn, …, { immediate: true })` 而不是 `onMounted`：
 * Vue 可能在门卫「只渲染引导卡片」的那次渲染里就创建并挂载了本组件实例（实测如此）。
 * 此时 onMounted 已经跑过、并被 `!isLoggedIn` 挡掉；之后用户点登录成功、门卫把插槽
 * 真正渲染出来时，Vue 复用的是**同一个实例** —— onMounted 不会再触发，页面于是永远
 * 停在「读取签到数据中…」（实测就是这个现象）。
 * watch 监听的是共享登录态本身：无论实例何时被创建 / 复用，登录一成立就会拉数据；
 * 未登录时直接 return，一个 RPC 都不发。
 */
watch(
  isLoggedIn,
  async (loggedIn) => {
    if (!loggedIn) return
    // 每次真正开始加载都重置显示态：上一次可能在未登录时被挡下，界面还停在 loading
    bootLoading.value = true
    dataReady.value = false
    // 走到这里说明确实已登录，读云存储是安全的。
    // 兜底：万一登录态在别处失效（会话过期），这里仍会 reject —— 此时不再把错误
    // 糊成红色报错，而是让门卫回到未登录态、由引导卡片接管。
    try {
      await initToy()
      const [raw, mine] = await Promise.all([
        cloud.get([STORAGE_KEYS.total, STORAGE_KEYS.lastDate]),
        // 我的排名读取失败不阻塞签到主流程；类型由 SDK 推导为 Promise<MyRankResp>
        rank.me().catch((): ToySDK.MyRankResp | null => null)
      ])
      // 先自愈：云存储被写坏过（累计天数 < 排行榜记录）就按排行榜补回来。
      // 排行榜分数只增不减，是这份数据唯一没被破坏过的副本 —— 详见 checkin.ts。
      const repaired = await repairCheckinState(raw, mine?.score ?? null, (writes) =>
        cloud.set(writes)
      )
      state.value = repaired.state
      // 仅在没有任何提示时展示自愈说明，避免覆盖掉用户操作的结果
      if (repaired.restored && !message.value) notify(RESTORED_NOTICE)
      dataReady.value = true
      // 补交：上次 submitScore 失败会导致榜单分数落后，进页面时对齐一次（§7-4 仍是按事件提交）
      if (mine && state.value.total > mine.score) {
        await syncScore(state.value.total)
      } else if (mine && mine.score >= state.value.total) {
        scoreSynced = true
      }
    } catch (error) {
      handleAuthError(error)
    } finally {
      bootLoading.value = false
    }
  },
  { immediate: true }
)

/**
 * 统一的「登录态失效」兜底：真·未登录 → 让门卫回到引导卡片，而不是把
 * `[ToySDK] ... 未登录` 糊成红色报错；其余错误才照常提示。
 */
function handleAuthError(error: unknown): boolean {
  if (isAuthError(error)) {
    markLoggedOut()
    return true
  }
  notify(toErrorMessage(error), true)
  return false
}

/** 用户点了"授权用户信息"按钮：再拉一次 profile，由平台弹窗 */
async function authoriseUser() {
  if (authorising.value) return
  authorising.value = true
  notify('')
  try {
    await fetchProfile()
    if (userProfile.value) notify('已获取用户信息')
    else if (!userDenied.value) notify('获取用户信息失败，请稍后再试', true)
  } finally {
    authorising.value = false
  }
}

async function checkin() {
  // dataReady 是硬闸门：云端真值没读回来就绝不写，避免用本地初始值 0 覆盖真实累计天数
  if (!dataReady.value || submitting.value || isCheckedInToday(state.value, today())) return
  submitting.value = true
  notify('')
  try {
    // 关键：先读云端权威值，再算增量写回（read-modify-write）。
    // 不拿本地 state 当基数 —— 它只用于展示，永远可能比云端旧。
    const raw = await cloud.get([STORAGE_KEYS.total, STORAGE_KEYS.lastDate])
    const result = await applyCheckin(raw, today(), (writes) => cloud.set(writes))
    // 无论签没签成，先用云端真值刷新本地展示（避免出现比真实值小的累计天数）
    const before = state.value.total
    state.value = result.state

    if (result.outcome === 'write-failed') {
      notify('签到失败：数据没能写入，请稍后再试', true)
      return
    }
    if (result.outcome === 'already-checked-in') {
      notify('今天已经签过啦')
      return
    }

    // 本地榜单 +1：避开服务端 submitScore 同步延迟，立即让 rank.vue 看到新分数。
    // 增量按「云端新值 - 本地旧值」算，跨设备/多端签到也不会重复加分。
    const delta = Math.max(1, result.state.total - before)
    rankStore.bumpMyScore(delta)
    // 排行榜分数 = 累计签到天数，只在签到事件提交一次（§7-4）；失败下次进页面补交
    const scoreBefore = scoreSynced
    await syncScore(result.state.total)
    notify(
      scoreSynced || scoreBefore
        ? `签到成功！累计 ${state.value.total} 天`
        : `签到成功！累计 ${state.value.total} 天（榜单同步稍候自动补上）`
    )
  } catch (error) {
    // 签到写失败：登录态失效交由门卫处理（不再把「未登录」显示成红色报错），
    // 其余照常提示「签到失败」
    if (!handleAuthError(error)) notify(`签到失败：${toErrorMessage(error)}`, true)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <!--
    登录门卫：未登录时只展示引导卡片，本页的数据请求一个都不发。
    点「登录」成功后插槽才挂载，本页再按正常流程读云端数据。
  -->
  <LoginGate title="登录后即可签到" description="签到天数存在你的 Toy 云存储里，需要先登录才能读写">
    <section class="w-full max-w-sm flex flex-col items-center gap-6">
      <div
        class="w-full px-6 py-8 rounded-2xl bg-white shadow-sm border border-pink-200 flex flex-col items-center gap-4"
      >
        <!--
          dataReady 是硬闸门：云端真值没读回来之前，连「立即签到」都不渲染 ——
          避免用户拿一个尚未水合的 0 去覆盖真实累计天数（历史事故，见 checkin.ts 顶部注释）。
        -->
        <template v-if="bootLoading || !dataReady">
          <div class="i-svg-spinners:180-ring text-3xl text-pink-400" />
          <p class="text-sm text-gray-400">读取签到数据中…</p>
        </template>

        <template v-else>
          <div v-if="userProfile" class="flex items-center gap-2">
            <img
              v-if="userProfile.avatar"
              :src="userProfile.avatar"
              :alt="userProfile.nickname"
              class="w-8 h-8 rounded-full"
              referrerpolicy="no-referrer"
            />
            <span v-else class="i-carbon:user-avatar-filled text-2xl text-gray-300" />
            <span class="text-sm text-gray-600 font-medium">{{ userProfile.nickname }}</span>
          </div>

          <button
            v-else-if="userDenied"
            type="button"
            class="w-full py-2 rounded-xl text-sm font-medium border border-pink-300 text-pink-600 hover:bg-pink-50 active:bg-pink-100 transition inline-flex items-center justify-center gap-2"
            :disabled="authorising"
            @click="authoriseUser"
          >
            <span v-if="authorising" class="i-svg-spinners:90-ring-with-bg" />
            <span v-else class="i-carbon:user-multiple" />
            <span>{{ authorising ? '正在请求授权…' : '授权用户信息' }}</span>
          </button>

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
  </LoginGate>
</template>
