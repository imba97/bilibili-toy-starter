// filepath: src/shims-vue.d.ts
//
// Vue SFC module declarations. Both vue-tsc and oxlint's tsgolint use this.
//
// Required because tsconfig.json has `verbatimModuleSyntax: true` and
// `moduleResolution: Bundler`, but neither tool can resolve `.vue` files
// without an explicit shim.

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}
