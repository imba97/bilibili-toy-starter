// filepath: uno.config.ts
//
// UnoCSS configuration for the Toy SPA. `unocss/vite` consumes this via vite.config.ts.
// Toy 平台离线环境：icons 用本地 @iconify-json/*，不接 CDN。

import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetWind3,
  transformerDirectives,
  transformerVariantGroup
} from 'unocss'

const breakpoints = {
  xs: '320px',
  sm: '480px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
  '3xl': '1920px'
}

export default defineConfig({
  theme: {
    breakpoints
  },
  shortcuts: [
    ['h-header', 'h-12'],
    ['pt-header', 'pt-12']
  ],
  presets: [
    presetWind3(),
    presetAttributify(),
    presetIcons({
      cdn: 'https://esm.sh/',
      scale: 1.2,
      extraProperties: {
        display: 'inline-block',
        'vertical-align': 'text-bottom'
      }
    })
  ],
  transformers: [transformerDirectives(), transformerVariantGroup()]
})
