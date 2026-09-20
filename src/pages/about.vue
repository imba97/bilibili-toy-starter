<script setup lang="ts">
// filepath: src/pages/about.vue
//
// 关于页：项目简介 + 技术栈。
// 纯静态展示 —— 无 SDK 调用、无云存储读写。
</script>

<template>
  <section class="w-full max-w-sm flex flex-col gap-4">
    <div
      class="w-full px-6 py-7 rounded-2xl bg-white shadow-sm border border-pink-200 flex flex-col gap-4"
    >
      <div class="flex items-center gap-3">
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
          class="w-7 h-7 text-pink-500"
        >
          <path
            d="M17.813 4.653h.854c1.51.054 2.769.578 3.773 1.574 1.004.995 1.524 2.249 1.56 3.76v7.36c-.036 1.51-.556 2.769-1.56 3.773s-2.262 1.524-3.773 1.56H5.333c-1.51-.036-2.769-.556-3.773-1.56S.036 18.858 0 17.347v-7.36c.036-1.511.556-2.765 1.56-3.76 1.004-.996 2.262-1.52 3.773-1.574h.774l-1.174-1.12a1.234 1.234 0 0 1-.373-.906c0-.356.124-.658.373-.907l.027-.027c.267-.249.573-.373.92-.373.347 0 .653.124.92.373L9.653 4.44c.071.071.134.142.187.213h4.267a.836.836 0 0 1 .16-.213l2.853-2.747c.267-.249.573-.373.92-.373.347 0 .662.151.929.4.267.249.391.551.391.907 0 .355-.124.657-.373.906zM5.333 7.24c-.746.018-1.373.276-1.88.773-.506.498-.769 1.13-.786 1.894v7.52c.017.764.28 1.395.786 1.893.507.498 1.134.756 1.88.773h13.334c.746-.017 1.373-.275 1.88-.773.506-.498.769-1.129.786-1.893v-7.52c-.017-.765-.28-1.396-.786-1.894-.507-.497-1.134-.755-1.88-.773zM8 11.107c.373 0 .684.124.933.373.25.249.383.56.4.933v2.587c0 .373-.124.684-.373.933-.249.25-.56.374-.934.374-.373 0-.684-.125-.933-.374-.25-.249-.374-.56-.374-.933v-2.587c0-.373.124-.684.374-.933.249-.249.56-.373.933-.373zm8 0c.373 0 .684.124.933.373.25.249.383.56.4.933v2.587c0 .373-.124.684-.373.933-.249.25-.56.374-.933.374-.373 0-.684-.125-.933-.374-.25-.249-.373-.56-.373-.933v-2.587c0-.373.124-.684.373-.933.249-.249.56-.373.933-.373z"
          />
        </svg>
        <h2 class="text-lg font-bold text-gray-700">关于本项目</h2>
      </div>

      <p class="text-sm text-gray-600 leading-relaxed">
        <span class="font-semibold text-pink-600">bilibili-toy-starter</span>
        是面向 <span class="font-medium">Bilibili Toy 平台</span>
        的起始仓库，提供 Toy 应用模板与配套的 TypeScript SDK 封装，开 fork 后即可快速搭建自己的
        Toy。
      </p>

      <div class="flex flex-col gap-2">
        <h3 class="text-sm font-bold text-gray-700 flex items-center gap-2">
          <span class="i-carbon:flash text-pink-500 text-base" />
          特性
        </h3>

        <ul class="flex flex-col gap-1.5 text-sm text-gray-600">
          <li class="flex items-start gap-1.5">
            <span class="i-carbon:chevron-right text-pink-400 mt-0.5 shrink-0 text-xs" />
            <span><span class="font-medium text-gray-700">Mock override</span> · dev 零 RPC</span>
          </li>
          <li class="flex items-start gap-1.5">
            <span class="i-carbon:chevron-right text-pink-400 mt-0.5 shrink-0 text-xs" />
            <span><span class="font-medium text-gray-700">Host-ready retry</span> · 自动退避</span>
          </li>
          <li class="flex items-start gap-1.5">
            <span class="i-carbon:chevron-right text-pink-400 mt-0.5 shrink-0 text-xs" />
            <span
              ><span class="font-medium text-gray-700">错误归一化</span> · 统一前缀与类型守卫</span
            >
          </li>
          <li class="flex items-start gap-1.5">
            <span class="i-carbon:chevron-right text-pink-400 mt-0.5 shrink-0 text-xs" />
            <span><span class="font-medium text-gray-700">两段式发布</span> · 预览确认再提交</span>
          </li>
          <li class="flex items-start gap-1.5">
            <span class="i-carbon:chevron-right text-pink-400 mt-0.5 shrink-0 text-xs" />
            <span><span class="font-medium text-gray-700">vite-plus</span> · 一站式 CLI</span>
          </li>
          <li class="flex items-start gap-1.5">
            <span class="i-carbon:chevron-right text-pink-400 mt-0.5 shrink-0 text-xs" />
            <span
              ><span class="font-medium text-gray-700">Toy 容器兼容</span> · 相对路径 + hash</span
            >
          </li>
        </ul>
      </div>
    </div>

    <div
      class="w-full px-6 py-6 rounded-2xl bg-white shadow-sm border border-pink-200 flex flex-col gap-3"
    >
      <h3 class="text-base font-bold text-gray-700 flex items-center gap-2">
        <span class="i-carbon:compare text-pink-500 text-lg" />
        相比直接调 window.toy
      </h3>

      <div class="rounded-xl border border-pink-100 overflow-hidden text-xs">
        <div class="grid grid-cols-2 bg-pink-50 text-gray-700 font-semibold">
          <div class="px-3 py-2 border-r border-pink-100">直接调 window.toy</div>
          <div class="px-3 py-2">本 starter</div>
        </div>

        <div class="grid grid-cols-2 border-t border-pink-100">
          <div class="px-3 py-2 border-r border-pink-100 text-gray-500">dev 模式无 mock 调试</div>
          <div class="px-3 py-2 text-gray-700">Mock override，本地跑通全部业务</div>
        </div>

        <div class="grid grid-cols-2 border-t border-pink-100 bg-gray-50/40">
          <div class="px-3 py-2 border-r border-pink-100 text-gray-500">
            host 注入失败需手写重试
          </div>
          <div class="px-3 py-2 text-gray-700">Host-ready retry 自动退避</div>
        </div>

        <div class="grid grid-cols-2 border-t border-pink-100">
          <div class="px-3 py-2 border-r border-pink-100 text-gray-500">
            手判 status / code / name
          </div>
          <div class="px-3 py-2 text-gray-700">isToyError / isDeniedError 一行判</div>
        </div>

        <div class="grid grid-cols-2 border-t border-pink-100 bg-gray-50/40">
          <div class="px-3 py-2 border-r border-pink-100 text-gray-500">
            手拼 publish 命令易误发
          </div>
          <div class="px-3 py-2 text-gray-700">两段式：预览→确认</div>
        </div>

        <div class="grid grid-cols-2 border-t border-pink-100 bg-gray-50/40">
          <div class="px-3 py-2 border-r border-pink-100 text-gray-500">入口散落、类型自维护</div>
          <div class="px-3 py-2 text-gray-700">8 namespace + 完整 TS 类型</div>
        </div>

        <div class="grid grid-cols-2 border-t border-pink-100">
          <div class="px-3 py-2 border-r border-pink-100 text-gray-500">SDK 升级要改类型</div>
          <div class="px-3 py-2 text-gray-700">Proxy 转发，新方法零成本跟随</div>
        </div>

        <div class="grid grid-cols-2 border-t border-pink-100 bg-gray-50/40">
          <div class="px-3 py-2 border-r border-pink-100 text-gray-500">mock 刷新即丢</div>
          <div class="px-3 py-2 text-gray-700">localStorage 持久化，刷新恢复</div>
        </div>

        <div class="grid grid-cols-2 border-t border-pink-100">
          <div class="px-3 py-2 border-r border-pink-100 text-gray-500">
            无环境判断、靠 if 硬编码
          </div>
          <div class="px-3 py-2 text-gray-700">env 自动识别 Dev / Preview / Prod</div>
        </div>

        <div class="grid grid-cols-2 border-t border-pink-100 bg-gray-50/40">
          <div class="px-3 py-2 border-r border-pink-100 text-gray-500">从零搭、规范靠文档</div>
          <div class="px-3 py-2 text-gray-700">模板即规范，fork 即可开工</div>
        </div>

        <div class="grid grid-cols-2 border-t border-pink-100">
          <div class="px-3 py-2 border-r border-pink-100 text-gray-500">工具链散落、版本漂移</div>
          <div class="px-3 py-2 text-gray-700">
            <code class="font-mono text-pink-600">vp</code> 一站式 fmt / lint / hooks
          </div>
        </div>
      </div>
    </div>

    <div
      class="w-full px-6 py-6 rounded-2xl bg-white shadow-sm border border-pink-200 flex flex-col gap-3"
    >
      <h3 class="text-base font-bold text-gray-700 flex items-center gap-2">
        <span class="i-carbon:package text-pink-500 text-lg" />
        bilibili-toy SDK
      </h3>
      <p class="text-sm text-gray-600 leading-relaxed">
        位于
        <code class="px-1 py-0.5 rounded bg-pink-50 text-pink-600 text-xs font-mono"
          >packages/bilibili-toy/</code
        >，是官方 Toy JS SDK 的薄封装。零运行时依赖、完整 TypeScript 类型、扁平 API 设计，配合 Proxy
        转发让新增方法自动可用；统一
        <code class="px-1 py-0.5 rounded bg-pink-50 text-pink-600 text-xs font-mono"
          >[bilibili-toy]</code
        >
        错误前缀便于排查。
      </p>

      <pre
        class="text-xs leading-relaxed rounded-xl bg-gray-900 text-gray-100 p-4 overflow-x-auto font-mono"
      ><code>import { toy, rank, cloud, user } from 'bilibili-toy'

await toy.ready()
await rank.submit({ score: 100 })
rank.override('list').mock((req, ctx) => {
  ctx.store.set('lastList', req)
  return [{ rank: 1, score: 100, name: req.name }]
})
const list = await rank.list()
await cloud.set({ total: 7 })
const me = await user.profile()</code></pre>
    </div>

    <div
      class="w-full px-6 py-6 rounded-2xl bg-white shadow-sm border border-pink-200 flex flex-col gap-3"
    >
      <h3 class="text-base font-bold text-gray-700 flex items-center gap-2">
        <span class="i-carbon:rocket text-pink-500 text-lg" />
        一键发布到 Toy 平台
      </h3>
      <ol class="flex flex-col gap-2 text-sm text-gray-600 list-decimal list-inside">
        <li>
          <code class="px-1 py-0.5 rounded bg-pink-50 text-pink-600 text-xs font-mono"
            >npm run toy:publish</code
          >
          构建并生成预览地址
        </li>
        <li>
          在浏览器中打开
          <code class="px-1 py-0.5 rounded bg-pink-50 text-pink-600 text-xs font-mono"
            >preview_url</code
          >
          检查效果
        </li>
        <li>
          确认无误后再次执行并加
          <code class="px-1 py-0.5 rounded bg-pink-50 text-pink-600 text-xs font-mono">--yes</code>
          提交
        </li>
        <li>
          后续迭代使用
          <code class="px-1 py-0.5 rounded bg-pink-50 text-pink-600 text-xs font-mono"
            >toy update &lt;id&gt;</code
          >
          增量更新
        </li>
      </ol>
    </div>
  </section>
</template>
