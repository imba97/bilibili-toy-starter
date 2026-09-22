#!/usr/bin/env node
// filepath: scripts/pack.ts
//
// Bundle the freshly-built Toy `dist/` into a versioned zip archive so it
// can be uploaded to the Bilibili Toy platform as a single, reproducible
// artifact. Keeps every build in `.bundles/` (gitignored) for later
// inspection or re-upload.
//
// Usage:
//   esno scripts/pack.ts                 # build must already exist
//   pnpm pack:zip / npm run pack:zip     # vp build && esno scripts/pack.ts
//
// Note: the script name is `pack:zip` (not `pack`) because pnpm ships a
// built-in `pnpm pack` command that creates a tarball — using `pack` here
// would collide with it. The custom script produces a Toy-platform-friendly
// `.bundles/toy-<version>.zip` instead.
//
// Output:
//   .bundles/toy-<version>.zip   (deterministic; overwrites in place)

import { existsSync, mkdirSync, statSync, createWriteStream } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import pkg from '../package.json' with { type: 'json' }
import { ZipArchive } from 'archiver'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '..')
const distDir = resolve(repoRoot, 'dist')
const bundlesDir = resolve(repoRoot, '.bundles')

if (!pkg.version || !pkg.name) {
  console.error('package.json is missing "name" or "version" — cannot name the archive.')
  process.exit(1)
}
const version = pkg.version

if (!existsSync(distDir)) {
  console.error(`No dist/ at ${distDir} — run \`npm run build\` first.`)
  process.exit(1)
}
if (!statSync(distDir).isDirectory()) {
  console.error(`Expected ${distDir} to be a directory, got a file.`)
  process.exit(1)
}

mkdirSync(bundlesDir, { recursive: true })

const outZip = resolve(bundlesDir, `toy-${version}.zip`)

console.log(`\n▸ Packing ${distDir} → ${outZip}\n`)

await new Promise<void>((resolveArchive, rejectArchive) => {
  const archive = new ZipArchive({ zlib: { level: 9 } })
  const output = createWriteStream(outZip)

  output.on('close', () => resolveArchive())
  output.on('error', rejectArchive)
  archive.on('warning', (err: NodeJS.ErrnoException) => {
    if (err.code === 'ENOENT') {
      console.warn(`▸ archiver warning: ${err.message}`)
    } else {
      rejectArchive(err)
    }
  })
  archive.on('error', rejectArchive)

  archive.pipe(output)
  // `false` = don't nest under a `dist/` prefix — the Toy platform
  // expects the entry HTML at the archive root.
  archive.directory(distDir, false)
  archive.finalize().catch(rejectArchive)
})

const size = statSync(outZip).size
if (size === 0) {
  console.error(`Archive ${outZip} is 0 bytes — something went wrong.`)
  process.exit(1)
}

console.log(`\n✓ Wrote ${outZip} (${(size / 1024).toFixed(1)} KiB)\n`)
console.log('Next steps:')
console.log(`  • Preview locally:    unzip ${outZip} -d preview && open preview/index.html`)
console.log(`  • Upload to Toy:       toy create ${outZip} --json`)
console.log('')
