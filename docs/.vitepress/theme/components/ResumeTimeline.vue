<script setup lang="ts">
import { withBase } from 'vitepress'
import { latestResumeVersion, resumeVersions } from '../data/resume'

const getVersionHref = (path: string) => withBase(path)
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
          :class="{ active: version.year === latestResumeVersion.year }"
          :href="getVersionHref(version.path)"
          :aria-current="version.year === latestResumeVersion.year ? 'page' : undefined"
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
