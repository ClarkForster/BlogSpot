<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vitepress'

import Resume2024 from '../../../resume/2024.md'
import Resume2025 from '../../../resume/2025.md'
import Resume2026 from '../../../resume/2026.md'

const route = useRoute()

const currentYear = computed(() => {
  const path = route.path
  const match = path.match(/\/resume\/(\d{4})/)
  return match ? match[1] : '2025'
})

const currentComponent = computed(() => {
  switch (currentYear.value) {
    case '2024':
      return Resume2024
    case '2025':
      return Resume2025
    case '2026':
      return Resume2026
    default:
      return Resume2025
  }
})
</script>

<template>
  <div class="resume-shell resume-landing" :data-year="currentYear">
    <article class="resume-content featured-card">
      <component :is="currentComponent" />
    </article>
  </div>
</template>
