<script setup lang="ts">
import { computed } from 'vue'
import { useData, withBase } from 'vitepress'
import { latestResumeVersion, resumeVersions } from '../data/resume'

const { page } = useData()

const getVersionHref = (path: string) => withBase(path)

const activeResumeYear = computed(() => {
  const match = page.value.relativePath.match(/^resume\/(\d{4})\.md$/)
  return match ? Number(match[1]) : latestResumeVersion.year
})
</script>

<template>
  <section class="home-section resume-timeline-section">
    <div class="section-heading">
      <h2>简历时间线</h2>
    </div>

    <div class="resume-timeline-scroll">
      <div class="resume-timeline" aria-label="简历年份时间线">
        <a
          v-for="version in resumeVersions"
          :key="version.year"
          class="resume-node"
          :class="{ active: version.year === activeResumeYear }"
          :href="getVersionHref(version.path)"
          :aria-current="version.year === activeResumeYear ? 'page' : undefined"
        >
          <span class="resume-node-dot" aria-hidden="true"></span>
          <span class="resume-node-year">{{ version.year }}</span>
          <span class="resume-node-label">{{ version.label }}</span>
          <span class="resume-node-summary">{{ version.summary }}</span>
        </a>
      </div>
    </div>
  </section>
</template>
