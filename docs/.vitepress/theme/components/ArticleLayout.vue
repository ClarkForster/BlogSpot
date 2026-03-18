<script setup lang="ts">
import { ref, onMounted, watch, nextTick, onUnmounted } from 'vue'
import { useData, useRoute } from 'vitepress'
import DefaultTheme from 'vitepress/theme'

const { frontmatter } = useData()
const route = useRoute()

// 存储注释
interface Annotation {
  id: string
  content: string
  index: number
  isInline: boolean
  top?: number
}

const annotations = ref<Annotation[]>([])
const isArticleLayout = ref(false)
const activeAnnotationId = ref<string | null>(null)
let annotationsContainer: HTMLElement | null = null
let resizeObserver: ResizeObserver | null = null

// 初始化注释
const initAnnotations = () => {
  annotations.value = []
  isArticleLayout.value = true

  // 优先使用 frontmatter 中的注释数据（来自 markdown-it 插件）
  // markdown-it 已经在服务端处理好了所有注释（块级+行内），客户端只需要替换 blockquote
  if (frontmatter.value.annotations && frontmatter.value.annotations.length > 0) {
    annotations.value = [...frontmatter.value.annotations]

    // 已经由 markdown-it 在服务端生成了引用标记，只需要移除原 blockquote
    const blockquotes = document.querySelectorAll('.vp-doc blockquote')
    blockquotes.forEach(blockquote => {
      if (blockquote.parentNode && blockquote.textContent.trim()) {
        // blockquote 已经被 markdown-it 处理成引用标记了，这里移除残留
        blockquote.remove()
      }
    })
  } else {
    // 降级方案：客户端查找并转换 blockquote
    const blockquotes = document.querySelectorAll('.vp-doc blockquote')
    if (blockquotes.length === 0) {
      isArticleLayout.value = false
      removeAnnotationsSidebar()
      return
    }

    annotations.value = []
    // 遍历每个 blockquote 转换为注释
    blockquotes.forEach((blockquote, index) => {
      const content = blockquote.innerHTML || ''
      if (content.trim()) {
        const annotationIndex = index + 1
        const annotationId = `annotation-${annotationIndex}`
        annotations.value.push({
          id: annotationId,
          content: content,
          index: annotationIndex,
          isInline: false
        })
        // 替换 blockquote 为上标引用
        const refSpan = document.createElement('sup')
        refSpan.className = 'annotation-ref'
        refSpan.setAttribute('data-annotation-id', annotationId)
        refSpan.textContent = annotationIndex.toString()
        blockquote.parentNode?.replaceChild(refSpan, blockquote)
      }
    })
  }

  // 创建侧边栏
  nextTick(() => {
    createAnnotationsSidebar()
    calculateAnnotationPositions()
  })
}

// 创建注释侧边栏
const createAnnotationsSidebar = () => {
  removeAnnotationsSidebar()

  annotationsContainer = document.createElement('div')
  annotationsContainer.className = 'annotations-sidebar'
  annotationsContainer.innerHTML = `
    <div class="annotations-panel">
      <h3 class="panel-title">注释</h3>
      <div class="annotations-list" style="position: relative; min-height: 300px;"></div>
    </div>
  `

  // 添加到 content-container（文章内容容器）而不是外层 container
  // 这样 right 定位是相对于文章内容的右边缘，位置计算正确
  const contentContainer = document.querySelector('.VPDoc .container .content-container')
  if (contentContainer) {
    contentContainer.style.position = 'relative'
    contentContainer.appendChild(annotationsContainer)
  }

  renderAnnotationItems()
  addEventListeners()
}

// 渲染注释项
const renderAnnotationItems = () => {
  const list = document.querySelector('.annotations-sidebar .annotations-list')
  if (!list) return

  list.innerHTML = annotations.value.map(annotation => `
    <div class="annotation-item" data-annotation-id="${annotation.id}"
         style="position: absolute; top: ${annotation.top || 0}px; left: 0; right: 0;">
      <div class="annotation-number">${annotation.index}</div>
      <div class="annotation-content">${annotation.content}</div>
    </div>
  `).join('')
}

// 更新注释位置
const updateAnnotationPositions = () => {
  const items = document.querySelectorAll('.annotations-sidebar .annotation-item')
  items.forEach(item => {
    const id = item.getAttribute('data-annotation-id')
    const annotation = annotations.value.find(a => a.id === id)
    if (annotation && annotation.top !== undefined) {
      (item as HTMLElement).style.top = `${annotation.top}px`
    }
  })
}

// 移除侧边栏
const removeAnnotationsSidebar = () => {
  const existing = document.querySelector('.annotations-sidebar')
  if (existing) {
    existing.remove()
  }
  removeEventListeners()
}

// 计算注释位置
const calculateAnnotationPositions = () => {
  if (!annotations.value.length) return

  const refElements = document.querySelectorAll('.annotation-ref')
  // 注释栏在 content-container 内部，所以相对于 content-container 计算位置
  const contentContainer = document.querySelector('.VPDoc .container .content-container')
  const list = document.querySelector('.annotations-sidebar .annotations-list')

  if (!contentContainer || !list) return

  const panelTitleHeight = 48 // .panel-title 高度 + 底部 padding
  const minGap = 16 // 注释之间的最小间距
  const alignOffset = -80 // 向上偏移：让注释编号和引用标记垂直中心对齐

  // 基准：content-container 相对于整个页面的位置
  const containerRect = contentContainer.getBoundingClientRect()
  const scrollTop = window.scrollY || document.documentElement.scrollTop
  const containerTopRelativeToViewport = containerRect.top
  const containerTop = containerTopRelativeToViewport + scrollTop

  // 第一步：先获取所有引用标记的原始位置
  refElements.forEach(el => {
    const annotationId = el.getAttribute('data-annotation-id')
    if (!annotationId) return

    // 引用标记相对于整个页面的位置
    const rect = el.getBoundingClientRect()
    const elTop = rect.top + scrollTop
    const annotation = annotations.value.find(a => a.id === annotationId)
    if (annotation) {
      // 计算注释在侧边栏列表中的初始位置：
      // (引用页面位置 - 容器页面位置) = 引用在容器中的相对位置
      // 加上 panel 标题高度（已经包含了panel的padding）
      // 再向上偏移让注释编号和引用标记在同一水平线上
      annotation.top = (elTop - containerTop) + panelTitleHeight + alignOffset
    }
  })

  // 第二步：渲染注释到DOM以获取实际高度
  renderAnnotationItems()

  // 第三步：获取每个注释的实际渲染高度
  const annotationItems = list.querySelectorAll('.annotation-item')
  const annotationHeights = new Map<string, number>()

  annotationItems.forEach(item => {
    const id = item.getAttribute('data-annotation-id')
    if (id) {
      const height = (item as HTMLElement).offsetHeight
      annotationHeights.set(id, height)
    }
  })

  // 第四步：调整位置避免重叠，尽可能保持与引用标记的对齐
  const sortedAnnotations = [...annotations.value].sort((a, b) => {
    return (a.top || 0) - (b.top || 0)
  })

  let lastBottom = -Infinity
  let maxBottom = 0
  const adjustments = new Map<string, number>() // 记录每个注释需要调整的偏移量

  sortedAnnotations.forEach(annotation => {
    if (annotation.top === undefined) return

    const originalTop = annotation.top
    const height = annotationHeights.get(annotation.id) || 60 // 保底高度

    // 如果当前位置会和上一个重叠，就向下移动
    if (originalTop < lastBottom) {
      annotation.top = lastBottom
      adjustments.set(annotation.id, annotation.top - originalTop)
    }

    lastBottom = annotation.top + height + minGap
    maxBottom = Math.max(maxBottom, lastBottom)
  })

  // 第五步：如果有调整，尝试向上调整后面的注释以减少整体偏移
  // 从后往前遍历，看是否可以向上移动而不重叠
  for (let i = sortedAnnotations.length - 1; i >= 0; i--) {
    const annotation = sortedAnnotations[i]
    if (annotation.top === undefined) continue

    const height = annotationHeights.get(annotation.id) || 60
    const adjustment = adjustments.get(annotation.id) || 0

    if (adjustment > 0 && i > 0) {
      const prevAnnotation = sortedAnnotations[i - 1]
      const prevHeight = annotationHeights.get(prevAnnotation.id) || 60
      const minAllowedTop = (prevAnnotation.top || 0) + prevHeight + minGap

      // 尽可能向上移动，但不能超过原始位置，也不能和上一个重叠
      const newTop = Math.max(annotation.top - adjustment, minAllowedTop)
      if (newTop < annotation.top) {
        annotation.top = newTop
      }
    }
  }

  // 重新计算最大高度
  lastBottom = -Infinity
  maxBottom = 0
  sortedAnnotations.forEach(annotation => {
    if (annotation.top === undefined) return
    const height = annotationHeights.get(annotation.id) || 60
    lastBottom = annotation.top + height + minGap
    maxBottom = Math.max(maxBottom, lastBottom)
  })

  // 设置列表高度
  list.style.minHeight = `${Math.max(maxBottom + 16, 200)}px`

  // 应用最终位置
  updateAnnotationPositions()
}

// 滚动到对应原文位置
const scrollToAnnotation = (annotationId: string) => {
  const element = document.querySelector(`[data-annotation-id="${annotationId}"]`)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

// 滚动到侧边栏对应注释位置
const scrollToSidebarAnnotation = (annotationId: string) => {
  const element = document.querySelector(`.annotations-sidebar .annotation-item[data-annotation-id="${annotationId}"]`)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    activeAnnotationId.value = annotationId
    highlightAnnotation(annotationId)
  }
}

// 添加事件监听器
const addEventListeners = () => {
  document.addEventListener('mouseover', handleMouseOver)
  document.addEventListener('mouseout', handleMouseOut)
  document.addEventListener('click', handleAnnotationClick)
  window.addEventListener('scroll', handleScroll, { passive: true })
  window.addEventListener('resize', handleResize)

  // 监听文档内容变化，动态更新注释位置
  const doc = document.querySelector('.vp-doc')
  if (doc && ResizeObserver) {
    resizeObserver = new ResizeObserver(() => {
      // 防抖处理
      clearTimeout((window as any).annotationResizeTimeout)
      ;(window as any).annotationResizeTimeout = setTimeout(() => {
        calculateAnnotationPositions()
      }, 100)
    })
    resizeObserver.observe(doc)
  }
}

const removeEventListeners = () => {
  document.removeEventListener('mouseover', handleMouseOver)
  document.removeEventListener('mouseout', handleMouseOut)
  document.removeEventListener('click', handleAnnotationClick)
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('resize', handleResize)

  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  clearTimeout((window as any).annotationResizeTimeout)
}

const handleMouseOver = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (target.classList.contains('annotation-ref')) {
    const id = target.getAttribute('data-annotation-id')
    if (id) {
      activeAnnotationId.value = id
      highlightAnnotation(id)
    }
  } else if (target.closest('.annotation-item')) {
    const item = target.closest('.annotation-item') as HTMLElement
    const id = item.getAttribute('data-annotation-id')
    if (id) {
      activeAnnotationId.value = id
      highlightRef(id)
    }
  }
}

const handleMouseOut = () => {
  activeAnnotationId.value = null
  clearHighlights()
}

const handleResize = () => {
  // 窗口大小变化时重新计算注释位置
  clearTimeout((window as any).annotationResizeTimeout)
  ;(window as any).annotationResizeTimeout = setTimeout(() => {
    calculateAnnotationPositions()
  }, 100)
}

const handleScroll = () => {
  // 滚动时不需要重新计算，因为sticky定位已经处理了
}

const highlightAnnotation = (id: string) => {
  clearHighlights()
  const item = document.querySelector(`.annotations-sidebar .annotation-item[data-annotation-id="${id}"]`)
  if (item) {
    item.classList.add('annotation-active')
  }
}

const highlightRef = (id: string) => {
  clearHighlights()
  const ref = document.querySelector(`.annotation-ref[data-annotation-id="${id}"]`)
  if (ref) {
    ref.classList.add('annotation-active')
  }
}

const handleAnnotationClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  const annotationItem = target.closest('.annotation-item')
  if (annotationItem) {
    const annotationId = annotationItem.getAttribute('data-annotation-id')
    if (annotationId) {
      e.preventDefault()
      scrollToAnnotation(annotationId)
    }
  }
  // 点击原文引用标记，滚动到侧边栏对应注释
  const annotationRef = target.closest('.annotation-ref')
  if (annotationRef) {
    const annotationId = annotationRef.getAttribute('data-annotation-id')
    if (annotationId) {
      e.preventDefault()
      scrollToSidebarAnnotation(annotationId)
    }
  }
}

const clearHighlights = () => {
  document.querySelectorAll('.annotation-item, .annotation-ref').forEach(el => {
    el.classList.remove('annotation-active')
  })
}

onMounted(async () => {
  await nextTick()
  setTimeout(initAnnotations, 300)
})

watch(() => route.path, async () => {
  await nextTick()
  setTimeout(initAnnotations, 300)
})

onUnmounted(() => {
  removeAnnotationsSidebar()
})
</script>

<template>
  <DefaultTheme.Layout />
</template>
