<script setup lang="ts">
import Resume2024 from '../../../resume/2024.md'
import Resume2025 from '../../../resume/2025.md'
import Resume2026 from '../../../resume/2026.md'
import { latestResumeVersion } from '../data/resume'

const latestResumeComponent =
  latestResumeVersion.year === 2024
    ? Resume2024
    : latestResumeVersion.year === 2025
      ? Resume2025
      : Resume2026
</script>

<template>
  <component :is="latestResumeComponent" />
</template>
