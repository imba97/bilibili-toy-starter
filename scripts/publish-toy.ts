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
    shell: process.platform === 'win32',
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
console.log('\n▸ [1/3] vp build\n')
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

console.log(`\n▸ [2/3] toy ${toyArgs.join(' ')}\n`)
console.log('   (Running WITHOUT --yes — this will only generate a preview_url.)\n')

// Capture JSON output so we can surface preview_url clearly.
const toyResult = spawnSync('toy', toyArgs, {
  stdio: ['inherit', 'pipe', 'inherit'],
  shell: process.platform === 'win32',
  cwd: repoRoot,
  env: process.env
})

process.stdout.write(toyResult.stdout ?? '')

if (toyResult.status !== 0) process.exit(toyResult.status ?? 1)

let previewUrl: string | undefined
try {
  const raw = (toyResult.stdout ?? '').toString().trim()
  if (raw.startsWith('{') || raw.startsWith('[')) {
    const json = JSON.parse(raw) as { preview_url?: string; data?: { preview_url?: string } }
    previewUrl = json.preview_url ?? json.data?.preview_url
  }
} catch {
  // Non-JSON output is fine; user will see it above.
}

console.log('\n▸ [3/3] Preview ready\n')
if (previewUrl) console.log(`   Preview URL: ${previewUrl}\n`)
else console.log('   Preview URL: (parse the JSON above)\n')

console.log('   Open the preview in your browser, then decide:')
console.log('     • Submit for review  → re-run the same command with `--yes`')
console.log('                          (or: `toy create <dist> --json --yes`)')
console.log('     • Reject / tweak     → edit src/ and re-run this script')
console.log('')
