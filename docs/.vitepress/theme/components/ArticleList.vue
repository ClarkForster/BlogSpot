<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { withBase } from 'vitepress'
import { data as posts } from '../data/posts.data'

const activeTag = ref<string>('全部')

const allTags = computed(() => [
  '全部',
  ...new Set(posts.flatMap((post) => post.tags))
])

const visiblePosts = computed(() => {
  if (activeTag.value === '全部') {
    return posts
  }

  return posts.filter((post) => post.tags.includes(activeTag.value))
})

const getTagHref = (tag: string) => withBase(`/articles?tag=${encodeURIComponent(tag)}`)

const updateUrlForTag = (tag: string, replace = false) => {
  if (typeof window === 'undefined') {
    return
  }

  const url = new URL(window.location.href)

  if (tag === '全部') {
    url.searchParams.delete('tag')
  } else {
    url.searchParams.set('tag', tag)
  }

  const nextUrl = `${url.pathname}${url.search}${url.hash}`
  const method = replace ? 'replaceState' : 'pushState'
  window.history[method](window.history.state, '', nextUrl)
}

const syncActiveTagFromUrl = (replace = false) => {
  if (typeof window === 'undefined') {
    return
  }

  const currentTag = new URL(window.location.href).searchParams.get('tag')?.trim()

  if (currentTag && allTags.value.includes(currentTag)) {
    activeTag.value = currentTag
    return
  }

  activeTag.value = '全部'

  if (currentTag) {
    updateUrlForTag('全部', replace)
  }
}

const setActiveTag = (tag: string) => {
  activeTag.value = tag
  updateUrlForTag(tag)
}

const handlePopState = () => {
  syncActiveTagFromUrl()
}

const parseLocalDate = (value: string) => {
  if (!value) {
    return new Date(Number.NaN)
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number)
    return new Date(year, month - 1, day)
  }

  return new Date(value)
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(parseLocalDate(value))

onMounted(() => {
  syncActiveTagFromUrl(true)
  window.addEventListener('popstate', handlePopState)
})

onBeforeUnmount(() => {
  window.removeEventListener('popstate', handlePopState)
})
</script>

<template>
  <div class="article-list-shell">
    <div class="tag-filter" v-if="allTags.length > 1">
      <button
        v-for="tag in allTags"
        :key="tag"
        class="tag-filter-button"
        :class="{ active: tag === activeTag }"
        :aria-pressed="tag === activeTag"
        type="button"
        @click="setActiveTag(tag)"
      >
        {{ tag }}
      </button>
    </div>

    <div class="article-list">
      <article v-for="post in visiblePosts" :key="post.url" class="article-row">
        <div class="article-date">{{ formatDate(post.date) }}</div>
        <div class="article-main">
          <h2>
            <a :href="withBase(post.url)">{{ post.title }}</a>
          </h2>
          <p>{{ post.description }}</p>
          <div class="tag-list">
            <a
              v-for="tag in post.tags"
              :key="tag"
              class="tag-pill"
              :href="getTagHref(tag)"
            >
              {{ tag }}
            </a>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>
