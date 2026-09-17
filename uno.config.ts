// filepath: uno.config.ts
//
// UnoCSS configuration. Loaded by `unocss/vite` via the plugin in vite.config.ts.
// Keep this thin — only enable presets you actually use so the on-demand
// generated CSS stays small for Toy distribution.
//
// Reset stylesheets (e.g. `@unocss/reset/tailwind.css`) are imported from
// `src/main.ts`, NOT from here. UnoCSS presets don't bundle resets.

import { defineConfig, presetAttributify, presetIcons, presetUno, presetWebFonts } from 'unocss'

export default defineConfig({
  presets: [
    presetUno(),
    presetAttributify(),
    presetIcons({
      scale: 1.2,
      warn: false
    }),
    presetWebFonts({
      provider: 'none', // Set to 'bunny' / 'google' / 'none' depending on whether the Toy can reach the CDN.
      fonts: {
        sans: 'Inter:400,500,700'
      }
    })
  ]
})
