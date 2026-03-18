import { defineConfig } from 'vitepress'

// 注释数据结构
interface Annotation {
  id: string
  content: string
  index: number
  isInline: boolean
}

// markdown-it 插件配置
function annotationPlugin(md: any) {
  // 保存原始的 blockquote 渲染规则
  const originalBlockquote = md.renderer.rules.blockquote

  // 处理块级注释（> 语法）
  md.renderer.rules.blockquote = function (tokens: any, idx: number, options: any, env: any, self: any) {
    // 初始化注释数组
    if (!env.annotations) {
      env.annotations = []
    }

    // 获取 blockquote 的内容
    const token = tokens[idx]
    let content = ''

    // 渲染 blockquote 内部内容
    const contentHtml = md.renderer.render(token.children || [], options, env)
    content = contentHtml.trim()

    if (content) {
      const annotationIndex = env.annotations.length + 1
      const annotationId = `annotation-${annotationIndex}`

      // 创建注释对象
      const annotation: Annotation = {
        id: annotationId,
        content: content,
        index: annotationIndex,
        isInline: false
      }

      env.annotations.push(annotation)

      // 返回上标样式的注释引用标记
      return `<sup class="annotation-ref" data-annotation-id="${annotationId}">${annotationIndex}</sup>`
    }

    // 如果没有内容，使用原始渲染规则
    return originalBlockquote ? originalBlockquote(tokens, idx, options, env, self) : self.renderToken(tokens, idx, options)
  }

  // 添加行内注释规则（[>] 语法）
  md.inline.ruler.after('emphasis', 'inline_annotation', (state: any, silent: boolean) => {
    const start = state.pos
    const marker = state.src.slice(start, start + 3)

    if (marker !== '[>]') {
      return false
    }

    // 查找结束标记
    let end = state.src.indexOf('[/]', start + 3)
    if (end === -1) {
      return false
    }

    if (!silent) {
      // 提取注释内容
      const content = state.src.slice(start + 3, end).trim()

      // 初始化注释数组
      if (!state.env.annotations) {
        state.env.annotations = []
      }

      const annotationIndex = state.env.annotations.length + 1
      const annotationId = `annotation-${annotationIndex}`

      // 创建注释对象
      const annotation: Annotation = {
        id: annotationId,
        content: md.renderInline(content),
        index: annotationIndex,
        isInline: true
      }

      state.env.annotations.push(annotation)

      // 创建引用标记 token
      const token = state.push('annotation_ref', 'sup', 0)
      token.attrs = [
        ['class', 'annotation-ref'],
        ['data-annotation-id', annotationId]
      ]
      token.content = annotationIndex.toString()
    }

    state.pos = end + 3
    return true
  })

  // 渲染行内注释引用标记
  md.renderer.rules.annotation_ref = function (tokens: any, idx: number) {
    const token = tokens[idx]
    const id = token.attrs.find((attr: any) => attr[0] === 'data-annotation-id')[1]
    return `<sup class="annotation-ref" data-annotation-id="${id}">${token.content}</sup>`
  }
}

export default defineConfig({
  lang: 'zh-CN',
  title: 'Blogspot',
  description: '一个关于编程、系统和写作的中文技术博客。',
  cleanUrls: true,
  lastUpdated: true,
  markdown: {
    config: (md) => {
      md.use(annotationPlugin)
    }
  },
  transformPageData(pageData) {
    // 确保注释数据存在
    if (pageData.env && pageData.env.annotations && pageData.env.annotations.length > 0) {
      pageData.frontmatter.annotations = pageData.env.annotations
    }
  },
  head: [
    ['link', { rel: 'icon', href: '/favicon.svg' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'Blogspot' }],
    ['meta', { property: 'og:description', content: '一个关于编程、系统和写作的中文技术博客。' }],
    ['meta', { property: 'og:image', content: '/favicon.svg' }],
    ['meta', { name: 'theme-color', content: '#3b82f6' }]
  ],
  themeConfig: {
    siteTitle: 'Blogspot',
    nav: [
      { text: '首页', link: '/' },
      { text: '文章', link: '/articles' },
      { text: '简历', link: '/resume' },
      { text: '关于', link: '/about' }
    ],
    search: {
      provider: 'local'
    },
    outline: {
      level: [1, 2, 3],
      label: '本页内容'
    },
    docFooter: {
      prev: '上一篇',
      next: '下一篇'
    },
    lastUpdated: {
      text: '最近更新'
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/yourname/blogspot' }
    ],
    footer: {
      message: '用 Markdown 写作，用 Git 发布。',
      copyright: 'Copyright © 2026 Blogspot'
    }
  },
  sitemap: {
    hostname: 'https://example.com'
  }
})