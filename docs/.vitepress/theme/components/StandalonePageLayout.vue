<script setup lang="ts">
import { computed } from 'vue'
import { Content, useData } from 'vitepress'

const { frontmatter } = useData()

const showHeader = computed(() => Boolean(frontmatter.value.title) && frontmatter.value.standaloneHeader !== false)
const pageClasses = computed(() => frontmatter.value.pageClass ?? frontmatter.value.class ?? '')
const variantClass = computed(() => {
  const variant = frontmatter.value.standaloneVariant
  return variant ? `standalone-page--${variant}` : ''
})
</script>

<template>
  <!-- Resume 页面：直接使用与 ResumePage 相同的简单结构 -->
  <div v-if="pageClasses.includes('resume-page')" class="resume-shell resume-landing" :class="[pageClasses, variantClass]">
    <article class="vp-doc resume-content featured-card">
      <div class="resume-shell resume-landing">
        <article class="vp-doc resume-content featured-card">
          <Content />
        </article>
      </div>
    </article>
  </div>

  <!-- 其他 standalone 页面 -->
  <div v-else class="standalone-page" :class="[pageClasses, variantClass]">
    <div class="standalone-page__container">
      <header v-if="showHeader" class="standalone-page__header">
        <p v-if="frontmatter.year" class="standalone-page__eyebrow">{{ frontmatter.year }}</p>
        <h1 class="standalone-page__title">{{ frontmatter.title }}</h1>
        <p v-if="frontmatter.description" class="standalone-page__description">
          {{ frontmatter.description }}
        </p>
      </header>

      <div class="standalone-page__content vp-doc featured-card blog-card">
        <Content />
      </div>
    </div>
  </div>
</template>
