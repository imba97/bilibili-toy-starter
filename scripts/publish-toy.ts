#!/usr/bin/env node
// filepath: scripts/publish-toy.ts
//
// Toy publish / update orchestrator.
//
// IMPORTANT: This script follows the Bilibili Toy skill's two-stage workflow:
//
//   1. Run `vp build`.
//   2. Run `toy create` (first publish) or `toy update <id>` (existing toy)
//      WITHOUT `--yes` so it returns a `preview_url`.
//   3. Print the preview URL and stop.
//
// The script NEVER passes `--yes`. Submitting for review is a human decision
// the user makes in the browser, then echoes back to the CLI manually.
//
// Usage:
//   esno scripts/publish-toy.ts create                    # first publish
//   esno scripts/publish-toy.ts update <toy-id>           # update existing toy
//   esno scripts/publish-toy.ts create -- --slug my-toy  # pass-through flags
//   npm run toy:publish                                   # alias of `create`

import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '..')
const toyDist = resolve(repoRoot, 'dist')

function run(cmd: string, args: string[], opts: { cwd?: string } = {}): void {
  const result = spawnSync(cmd, args, {
    stdio: 'inherit',
    cwd: opts.cwd ?? repoRoot,
    env: process.env
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

const [, , action, ...rest] = process.argv

if (!action || (action !== 'create' && action !== 'update')) {
  console.error('Usage:')
  console.error('  esno scripts/publish-toy.ts create [-- <toy create flags>]')
  console.error('  esno scripts/publish-toy.ts update <toy-id> [-- <toy update flags>]')
  process.exit(2)
}

// --- Stage 1: build ---
// SDK 现在已经从 monorepo 中拆分出去成为独立仓库 `bilibili-toy`，
// 通过 `pnpm add bilibili-toy` 安装，使用方拿到的是 npm 上发布的
// 稳定版本，本地不需要再 `sdk:pack`。Toy 平台打包进 dist 的是
// `node_modules/bilibili-toy/dist/index.mjs`。
console.log('\n▸ [1/2] vp build\n')
run('vp', ['build'])

if (!existsSync(toyDist)) {
  console.error(`Build did not produce ${toyDist}`)
  process.exit(1)
}

// --- Stage 2: toy create/update WITHOUT --yes ---
const isUpdate = action === 'update'
const doubleDashIndex = rest.indexOf('--')
const passthroughArgs = doubleDashIndex >= 0 ? rest.slice(doubleDashIndex + 1) : []
const beforeDoubleDash = doubleDashIndex >= 0 ? rest.slice(0, doubleDashIndex) : rest

let toyArgs: string[]
if (isUpdate) {
  const toyId = beforeDoubleDash[0]
  if (!toyId) {
    console.error('update requires a toy-id: esno scripts/publish-toy.ts update <toy-id>')
    process.exit(2)
  }
  toyArgs = ['update', toyId, toyDist, '--json', ...passthroughArgs]
} else {
  toyArgs = ['create', toyDist, '--json', ...passthroughArgs]
}

console.log(`\n▸ [2/2] toy ${toyArgs.join(' ')}\n`)
console.log('   (Running WITHOUT --yes — this will only generate a preview_url.)\n')

// Capture JSON output so we can surface preview_url clearly. toy CLI 的 --json
// flag 承诺只吐 JSON；如果解析失败说明 CLI 输出契约被破坏，应该让 CI 立即
// 看到 error 而不是 silent fallback。
const toyResult = spawnSync('toy', toyArgs, {
  stdio: ['inherit', 'pipe', 'inherit'],
  cwd: repoRoot,
  env: process.env
})

if (toyResult.status !== 0) process.exit(toyResult.status ?? 1)

const raw = (toyResult.stdout ?? '').toString().trim()
process.stdout.write(raw + '\n')

let previewUrl: string | undefined
try {
  const json = JSON.parse(raw) as { preview_url?: string; data?: { preview_url?: string } }
  previewUrl = json.preview_url ?? json.data?.preview_url
} catch (err) {
  console.error('\n✗ Failed to parse toy CLI JSON output:', (err as Error).message)
  console.error('  The --json contract was broken; treat this as a CLI bug.')
  process.exit(1)
}

console.log('\n▸ Preview ready\n')
if (previewUrl) console.log(`   Preview URL: ${previewUrl}\n`)
else console.log('   Preview URL: (toy response had no preview_url)\n')

console.log('   Open the preview in your browser, then decide:')
console.log('     • Submit for review  → re-run the same command with `--yes`')
console.log('                          (or: `toy create <dist> --json --yes`)')
console.log('     • Reject / tweak     → edit src/ and re-run this script')
console.log('')
