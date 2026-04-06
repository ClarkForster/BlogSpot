<script setup lang="ts">
import { computed } from 'vue'
import { withBase } from 'vitepress'
import { data as posts } from '../data/posts.data'

interface ArchiveMonthGroup {
  month: string
  label: string
  alias: string
  count: number
  posts: typeof posts
}

interface ArchiveYearGroup {
  year: string
  count: number
  months: ArchiveMonthGroup[]
}

const parseLocalDate = (value: string) => {
  if (!value) {
    return new Date(Number.NaN)
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number)
    const parsedDate = new Date(year, month - 1, day)

    if (
      parsedDate.getFullYear() !== year
      || parsedDate.getMonth() !== month - 1
      || parsedDate.getDate() !== day
    ) {
      return new Date(Number.NaN)
    }

    return parsedDate
  }

  return new Date(value)
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(parseLocalDate(value))

const formatDay = (value: string) =>
  new Intl.DateTimeFormat('zh-CN', {
    day: '2-digit'
  }).format(parseLocalDate(value))

const monthMetadata = {
  '01': { label: '一月', alias: '寒入翠柳' },
  '02': { label: '二月', alias: '杏花微雨' },
  '03': { label: '三月', alias: '桃李春风' },
  '04': { label: '四月', alias: '清和槐序' },
  '05': { label: '五月', alias: '石榴照眼' },
  '06': { label: '六月', alias: '接天莲叶' },
  '07': { label: '七月', alias: '兰夜乞巧' },
  '08': { label: '八月', alias: '金桂飘露' },
  '09': { label: '九月', alias: '且听丛菊' },
  '10': { label: '十月', alias: '良月初霜' },
  '11': { label: '十一月', alias: '葭草凝寒' },
  '12': { label: '十二月', alias: '岁晚归路' }
} as const

const archiveGroups = computed<ArchiveYearGroup[]>(() => {
  const grouped = new Map<string, Map<string, typeof posts>>()

  for (const post of posts) {
    const [year, month] = post.date.split('-')

    if (!year || !month || Number.isNaN(parseLocalDate(post.date).getTime())) {
      continue
    }

    if (!grouped.has(year)) {
      grouped.set(year, new Map())
    }

    const months = grouped.get(year)!

    if (!months.has(month)) {
      months.set(month, [])
    }

    months.get(month)!.push(post)
  }

  return Array.from(grouped.entries())
    .sort(([leftYear], [rightYear]) => Number(rightYear) - Number(leftYear))
    .map(([year, months]) => {
      const normalizedMonths = Array.from(months.entries())
        .sort(([leftMonth], [rightMonth]) => Number(rightMonth) - Number(leftMonth))
        .map(([month, monthPosts]) => {
          const metadata = monthMetadata[month as keyof typeof monthMetadata]

          return {
            month,
            label: metadata?.label ?? `${Number(month)}月`,
            alias: metadata?.alias ?? `${Number(month)}月`,
            count: monthPosts.length,
            posts: monthPosts.toSorted((leftPost, rightPost) => rightPost.date.localeCompare(leftPost.date))
          }
        })

      return {
        year,
        count: normalizedMonths.reduce((total, month) => total + month.count, 0),
        months: normalizedMonths
      }
    })
})
</script>

<template>
  <div class="archive-shell">
    <section v-for="yearGroup in archiveGroups" :key="yearGroup.year" class="archive-year">
      <header class="archive-year__header">
        <h2 class="archive-year__heading">{{ yearGroup.year }}</h2>
        <p class="archive-year__meta">{{ yearGroup.count }} 篇文章</p>
      </header>

      <section
        v-for="monthGroup in yearGroup.months"
        :key="`${yearGroup.year}-${monthGroup.month}`"
        class="archive-month"
      >
        <div class="archive-month__header">
          <div class="archive-month__heading">
            <h3 class="archive-month__label">{{ monthGroup.alias }}</h3>
            <p class="archive-month__subLabel">{{ monthGroup.label }}</p>
          </div>
          <p class="archive-month__count">{{ monthGroup.count }} 篇</p>
        </div>

        <ul class="archive-month__list" role="list">
          <li v-for="post in monthGroup.posts" :key="post.url" class="archive-entry">
            <time class="archive-entry__day" :datetime="post.date" :aria-label="formatDate(post.date)">
              {{ formatDay(post.date) }}
            </time>
            <span class="archive-entry__node" aria-hidden="true"></span>
            <div class="archive-entry__body">
              <a class="archive-entry__title" :href="withBase(post.url)">{{ post.title }}</a>
            </div>
          </li>
        </ul>
      </section>
    </section>
  </div>
</template>
