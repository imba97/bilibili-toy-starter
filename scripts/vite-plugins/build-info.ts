// filepath: scripts/vite-plugins/build-info.ts
//
// Vite plugin that injects build-time constants for the app footer:
//   __BUILD_COMMIT__  → full 40-char HEAD SHA ('' on non-git builds)
//   __APP_VERSION__   → version from this package's package.json
//
// Truncation to short SHA + link targets live in App.vue, not here.

import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '..', '..')

export function buildInfoPlugin(): Plugin {
  let commit = ''
  try {
    commit = execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
  } catch {
    // Not a git checkout (e.g. shallow clone) — leave empty. App.vue hides
    // the footer block when commit is missing.
  }

  const pkg = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8')) as {
    version: string
  }
  const version = pkg.version

  return {
    name: 'bilibili-toy-starter:build-info',
    config() {
      return {
        define: {
          __BUILD_COMMIT__: JSON.stringify(commit),
          __APP_VERSION__: JSON.stringify(version)
        }
      }
    }
  }
}
