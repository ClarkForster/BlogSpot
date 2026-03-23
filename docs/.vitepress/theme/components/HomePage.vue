<script setup lang="ts">
import { computed } from 'vue'
import { withBase } from 'vitepress'
import { data as posts } from '../data/posts.data'

const getTagHref = (tag: string) => withBase(`/articles?tag=${encodeURIComponent(tag)}`)
const getCategoryHref = (category: string) => withBase(`/articles?category=${encodeURIComponent(category)}`)

const featuredPosts = computed(() => posts.filter((post) => post.featured).slice(0, 4))

const groupedPosts = computed(() => {
  const groups = new Map<string, typeof posts>()

  for (const post of posts) {
    const category = post.category || '未分类'
    const existing = groups.get(category) ?? []
    existing.push(post)
    groups.set(category, existing)
  }

  return Array.from(groups.entries()).map(([name, items]) => ({
    name,
    items: items.slice(0, 2)
  }))
})

const latestPosts = computed(() => posts.slice(0, 5))

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
    month: 'long',
    day: 'numeric'
  }).format(parseLocalDate(value))
</script>

<template>
  <div class="home-shell home-page">
    <section class="hero-block">
      <h1>Life is a bug, I'll <span>debug</span> it</h1>
      <div class="hero-actions">
        <a class="hero-primary" :href="withBase('/articles')">
          Start Debugging
          <span class="button-icon" aria-hidden="true">→</span>
        </a>
        <a class="hero-secondary" :href="withBase('/about')">About Me</a>
      </div>
    </section>

    <section class="home-section" v-if="featuredPosts.length">
      <div class="section-heading">
        <h2>精选文章</h2>
        <p>适合第一次来到这里时阅读。</p>
      </div>
      <div class="featured-grid">
        <article v-for="post in featuredPosts" :key="post.url" class="featured-card">
          <p class="post-meta">{{ post.category }} · {{ formatDate(post.date) }}</p>
          <h3><a :href="withBase(post.url)">{{ post.title }}</a></h3>
          <p class="post-description">{{ post.description || post.excerpt }}</p>
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
        </article>
      </div>
    </section>

    <section class="home-section">
      <div class="section-heading">
        <h2>主题分组</h2>
        <p>按长期关注的方向组织，而不是按时间淹没内容。</p>
      </div>
      <div class="topic-grid">
        <article v-for="group in groupedPosts" :key="group.name" class="topic-card">
          <h3><a :href="getCategoryHref(group.name)">{{ group.name }}</a></h3>
          <ul>
            <li v-for="post in group.items" :key="post.url">
              <a :href="withBase(post.url)">
                <span>{{ post.title }}</span>
                <span class="inline-arrow" aria-hidden="true">→</span>
              </a>
            </li>
          </ul>
        </article>
      </div>
    </section>

    <section class="home-section">
      <div class="section-heading">
        <h2>最近更新</h2>
        <p>按时间倒序，方便追踪最近写了什么。</p>
      </div>
      <ol class="timeline-list">
        <li v-for="post in latestPosts" :key="post.url">
          <time :datetime="post.date">{{ formatDate(post.date) }}</time>
          <div>
            <a :href="withBase(post.url)">
              <span>{{ post.title }}</span>
              <span class="inline-arrow" aria-hidden="true">→</span>
            </a>
            <p>{{ post.description || post.excerpt }}</p>
          </div>
        </li>
      </ol>
    </section>
  </div>
</template>
