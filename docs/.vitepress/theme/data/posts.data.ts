import { createContentLoader } from 'vitepress'

const normalizeDate = (value: unknown) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10)
  }

  const text = String(value ?? '').trim()

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text
  }

  const parsed = new Date(text)

  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10)
  }

  return ''
}

const toTimeValue = (value: string) => {
  if (!value) {
    return 0
  }

  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day).getTime()
}

export interface PostRecord {
  title: string
  url: string
  date: string
  description: string
  tags: string[]
  featured: boolean
  category: string
  draft: boolean
}

declare const data: PostRecord[]
export { data }

export default createContentLoader('{posts,articles}/*.md', {
  excerpt: false,
  transform(raw) {
    return raw
      .map(({ url, frontmatter }) => ({
        title: String(frontmatter.title ?? '未命名文章'),
        url,
        date: normalizeDate(frontmatter.date),
        description: String(frontmatter.description ?? ''),
        tags: Array.isArray(frontmatter.tags)
          ? frontmatter.tags.map((tag) => String(tag))
          : [],
        featured: Boolean(frontmatter.featured),
        category: String(frontmatter.category ?? '未分类'),
        draft: Boolean(frontmatter.draft)
      }))
      .filter((post) => !post.draft)
      .sort((a, b) => toTimeValue(b.date) - toTimeValue(a.date))
  }
})
