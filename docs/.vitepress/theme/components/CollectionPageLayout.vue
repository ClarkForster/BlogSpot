<script setup lang="ts">
import { computed } from 'vue'
import { Content, useData } from 'vitepress'

const { frontmatter } = useData()

const showHeader = computed(() => Boolean(frontmatter.value.title) && frontmatter.value.collectionHeader !== false)
</script>

<template>
  <div class="collection-page" :class="frontmatter.class">
    <div class="collection-page__container">
      <header v-if="showHeader" class="collection-page__header">
        <h1 class="collection-page__title">{{ frontmatter.title }}</h1>
        <p v-if="frontmatter.description" class="collection-page__description">
          {{ frontmatter.description }}
        </p>
      </header>

      <div class="collection-page__content vp-doc">
        <Content />
      </div>
    </div>
  </div>
</template>
