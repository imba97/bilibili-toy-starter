<script setup lang="ts">
// filepath: packages/starter-toy/src/components/Hello.vue
//
// Tiny reusable component — proves `<script setup>` + props + UnoCSS work
// inside the Toy build.

interface Props {
  name: string
}

defineProps<Props>()
</script>

<template>
  <div class="px-4 py-3 rounded-lg bg-white shadow-sm border border-pink-200">
    <span class="text-pink-500 font-semibold">Hi, {{ name }}!</span>
    <span class="ml-2 text-gray-500 text-sm">Edit <code>src/App.vue</code> to start.</span>
  </div>
</template>
