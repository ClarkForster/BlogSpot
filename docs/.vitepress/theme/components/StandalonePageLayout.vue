<script setup lang="ts">
import { computed } from 'vue'
import { Content, useData } from 'vitepress'

const { frontmatter } = useData()

const showHeader = computed(() => Boolean(frontmatter.value.title) && frontmatter.value.standaloneHeader !== false)
const pageClasses = computed(() => frontmatter.value.class ?? frontmatter.value.pageClass ?? '')
const variantClass = computed(() => {
  const variant = frontmatter.value.standaloneVariant
  return variant ? `standalone-page--${variant}` : ''
})
</script>

<template>
  <div class="standalone-page" :class="[pageClasses, variantClass]">
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
