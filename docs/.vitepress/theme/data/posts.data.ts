import { createContentLoader } from 'vitepress'
import fs from 'fs'
import path from 'path'

// 读取 markdown 文件原始内容
const getMarkdownContent = (url: string): string => {
  // 将 URL 转换为文件路径
  let filePath = url.slice(1) // 去掉前导 /
  if (!filePath.endsWith('.md')) {
    filePath += '.md'
  }
  const fullPath = path.resolve('docs', filePath)
  try {
    return fs.readFileSync(fullPath, 'utf-8')
  } catch {
    return ''
  }
}

const getFrontmatterValue = (markdown: string, key: string) => {
  const frontmatterMatch = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  const frontmatter = frontmatterMatch?.[1]

  if (!frontmatter) {
    return undefined
  }

  const fieldMatch = frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))
  return fieldMatch?.[1]?.trim()
}

const normalizeDate = (value: unknown) => {
  const text = String(value ?? '').trim()

  if (!text) {
    return ''
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text
  }

  const parsed = new Date(text)

  if (!Number.isNaN(parsed.getTime())) {
    return text
  }

  return ''
}

const toTimeValue = (value: string) => {
  if (!value) {
    return 0
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number)
    return new Date(year, month - 1, day).getTime()
  }

  return new Date(value).getTime()
}

export interface PostRecord {
  title: string
  url: string
  date: string
  description: string
  excerpt: string
  tags: string[]
  featured: boolean
  category: string
  draft: boolean
}

declare const data: PostRecord[]
export { data }

export default createContentLoader('{posts,articles}/*.md', {
  excerpt: true,
  transform(raw) {
    return raw
      .map(({ url, frontmatter, excerpt }) => {
        // 读取原始 markdown 内容
        const src = getMarkdownContent(url)

        // 从正文提取摘要：去掉 frontmatter，取前 150 字
        let autoExcerpt = ''
        if (!frontmatter.description && src) {
          // 去掉 frontmatter 和 markdown 语法
          const body = src
            .replace(/^---[\s\S]*?---\n*/, '')
            .replace(/[#*`>\[\]!]/g, '')
            .replace(/\n+/g, ' ')
            .trim()
          autoExcerpt = body.slice(0, 150).trim()
          if (autoExcerpt.length >= 150) autoExcerpt += '...'
        }
        const rawDate = getFrontmatterValue(src, 'date')

        return {
          title: String(frontmatter.title ?? '未命名文章'),
          url,
          date: normalizeDate(rawDate ?? frontmatter.date),
          description: String(frontmatter.description ?? ''),
          excerpt: autoExcerpt,
          tags: Array.isArray(frontmatter.tags)
            ? frontmatter.tags.map((tag) => String(tag))
            : [],
          featured: Boolean(frontmatter.featured),
          category: String(frontmatter.category ?? '未分类'),
          draft: Boolean(frontmatter.draft)
        }
      })
      .filter((post) => !post.draft)
      .sort((a, b) => toTimeValue(b.date) - toTimeValue(a.date))
  }
})
