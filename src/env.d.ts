// filepath: src/env.d.ts
//
// Type declarations for build-time constants injected by `buildInfoPlugin`
// in vite.config.ts via `define`. Empty string on non-git / shallow-clone
// builds; App.vue guards on this.

declare const __BUILD_COMMIT__: string
declare const __APP_VERSION__: string
