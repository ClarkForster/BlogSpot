<script setup lang="ts">
import Resume2025 from '../../../resume/2025.md'
import Resume2026 from '../../../resume/2026.md'
import { latestResumeVersion } from '../data/resume'

const resumeComponentByYear = {
  2025: Resume2025,
  2026: Resume2026
} as const

const latestResumeComponent = resumeComponentByYear[latestResumeVersion.year as keyof typeof resumeComponentByYear] ?? Resume2026
</script>

<template>
  <component :is="latestResumeComponent" />
</template>
