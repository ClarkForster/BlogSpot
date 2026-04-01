<script setup lang="ts">
import Resume2025 from '../../../resume/2025.md'

const latestResumeComponent = Resume2025
</script>

<template>
  <div class="resume-shell resume-landing">
    <article class="resume-content featured-card">
      <component :is="latestResumeComponent" />
    </article>
  </div>
</template>
