// filepath: src/main.ts
//
// Entry point. Imports UnoCSS's reset (drops browser defaults like button
// borders), then `virtual:uno.css` (on-demand utilities), then the app
// stylesheet, then mounts the Vue app onto `#app` from index.html.

import { createApp } from 'vue'
import '@unocss/reset/tailwind.css'
import 'virtual:uno.css'
import './styles/main.css'
import App from './App.vue'

createApp(App).mount('#app')
