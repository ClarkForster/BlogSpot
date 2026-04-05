<script setup lang="ts">
import { ref, onMounted, watch, nextTick, onUnmounted } from 'vue'
import { useData, useRoute } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import DailyQuoteFooter from './DailyQuoteFooter.vue'

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
const annotationMode = ref<'sidebar' | 'inline'>('inline')
let annotationsContainer: HTMLElement | null = null
let resizeObserver: ResizeObserver | null = null
let initTimeout: ReturnType<typeof setTimeout> | null = null
let sidebarHost: HTMLElement | null = null
let sidebarHostPrevPosition: string | null = null

// 初始化注释
const initAnnotations = () => {
  annotations.value = []
  isArticleLayout.value = true

  // 优先使用 frontmatter 中的注释数据（来自 markdown-it 插件）
  // markdown-it 已经在服务端处理好了所有注释（块级+行内），客户端只需要替换 blockquote
  if (frontmatter.value.annotations && frontmatter.value.annotations.length > 0) {
    annotations.value = [...frontmatter.value.annotations]

    // markdown-it 已经在服务端同时生成了引用标记和原始注释内容
    // 原始注释内容通过CSS控制在小屏幕下显示，不需要移除
  } else {
    // 降级方案：客户端查找并转换 blockquote
    const blockquotes = document.querySelectorAll('.vp-doc blockquote')
    if (blockquotes.length === 0) {
      isArticleLayout.value = false
      resetToInlineMode()
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
        // 同时保留引用标记和原始blockquote
        const refSpan = document.createElement('sup')
        refSpan.className = 'annotation-ref'
        refSpan.setAttribute('data-annotation-id', annotationId)
        refSpan.textContent = annotationIndex.toString()
        // 给原始blockquote添加类名
        blockquote.classList.add('annotation-original')
        blockquote.setAttribute('data-annotation-index', annotationIndex.toString())
        // 插入引用标记在blockquote前面
        blockquote.parentNode?.insertBefore(refSpan, blockquote)
      }
    })
  }

  // 根据可用宽度选择模式（sidebar / inline）
  nextTick(() => {
    updateAnnotationMode({ recomputePositions: true })
  })
}

const setRootAnnotationModeClass = (mode: 'sidebar' | 'inline') => {
  document.documentElement.classList.toggle('annotations-mode--sidebar', mode === 'sidebar')
  document.documentElement.classList.toggle('annotations-mode--inline', mode === 'inline')
  document.documentElement.classList.toggle('article-layout--coordinated', mode === 'sidebar')
  document.documentElement.classList.toggle('article-layout--inline', mode === 'inline')
}

let annotationResizeTimeout: ReturnType<typeof setTimeout> | null = null

const scheduleAnnotationRecompute = () => {
  if (annotationResizeTimeout) {
    clearTimeout(annotationResizeTimeout)
  }

  annotationResizeTimeout = setTimeout(() => {
    updateAnnotationMode({ recomputePositions: true })
  }, 100)
}

const resetToInlineMode = () => {
  annotationMode.value = 'inline'
  setRootAnnotationModeClass('inline')
  removeAnnotationsSidebar()
}

const canUseSidebarMode = (): boolean => {
  const desktopBreakpoint = 1440
  if (window.innerWidth < desktopBreakpoint) {
    return false
  }

  const layoutContainer = document.querySelector('.VPDoc .container') as HTMLElement | null
  const contentContainer = document.querySelector('.VPDoc .container .content-container') as HTMLElement | null
  if (!layoutContainer || !contentContainer) {
    return false
  }

  const sidebarWidth = 340
  const outlineWidth = 340
  const sideGap = 48
  const safePadding = 32
  const hasOutline = document.querySelector('.VPDoc.has-aside .VPDocAside') !== null

  const containerRect = layoutContainer.getBoundingClientRect()
  const contentRect = contentContainer.getBoundingClientRect()
  const leftRailWidth = hasOutline ? outlineWidth + sideGap : 0
  const rightSpace = containerRect.right - contentRect.right
  const leftSpace = contentRect.left - containerRect.left

  return leftSpace >= leftRailWidth + safePadding && rightSpace >= sidebarWidth + sideGap + safePadding
}

const attachBlockAnnotationRefsToPreviousBlock = () => {
  const refs = document.querySelectorAll('sup.annotation-ref:not(.annotation-ref--block)')
  refs.forEach(ref => {
    const next = ref.nextElementSibling
    if (!(next instanceof HTMLElement)) return

    // 仅处理“块级注释（blockquote）”的引用标记：它在 DOM 中紧邻原始 blockquote
    if (next.tagName !== 'BLOCKQUOTE' || !next.classList.contains('annotation-original')) return

    let host = ref.previousElementSibling as HTMLElement | null
    while (host) {
      const isAnnotationRef = host.tagName === 'SUP' && host.classList.contains('annotation-ref')
      const isHiddenAnnotationBlock = host.classList.contains('annotation-original') || host.classList.contains('annotation-original-inline')

      if (!isAnnotationRef && !isHiddenAnnotationBlock) {
        break
      }

      host = host.previousElementSibling as HTMLElement | null
    }

    if (!host) return

    host.classList.add('annotation-ref-host')
    ref.classList.add('annotation-ref--block')
    host.appendChild(ref)
  })
}

const updateAnnotationMode = ({ recomputePositions }: { recomputePositions: boolean }) => {
  if (!isArticleLayout.value || annotations.value.length === 0) {
    resetToInlineMode()
    return
  }

  const desiredMode: 'sidebar' | 'inline' = canUseSidebarMode() ? 'sidebar' : 'inline'
  const modeChanged = desiredMode !== annotationMode.value

  if (modeChanged) {
    annotationMode.value = desiredMode
    setRootAnnotationModeClass(desiredMode)

    if (desiredMode === 'sidebar') {
      attachBlockAnnotationRefsToPreviousBlock()
      createAnnotationsSidebar()
      calculateAnnotationPositions()
    } else {
      removeAnnotationsSidebar()
    }

    return
  }

  if (annotationMode.value === 'sidebar') {
    attachBlockAnnotationRefsToPreviousBlock()

    if (!document.querySelector('.annotations-sidebar')) {
      createAnnotationsSidebar()
    }

    if (recomputePositions) {
      calculateAnnotationPositions()
    }
  }
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

  const layoutContainer = document.querySelector('.VPDoc .container') as HTMLElement | null
  if (layoutContainer) {
    sidebarHost = layoutContainer
    sidebarHostPrevPosition = layoutContainer.style.position
    layoutContainer.style.position = 'relative'
    layoutContainer.appendChild(annotationsContainer)
  }

  renderAnnotationItems()
  addEventListeners()
}

// 渲染注释项
const renderAnnotationItems = () => {
  const list = document.querySelector('.annotations-sidebar .annotations-list')
  if (!list) return

  list.innerHTML = annotations.value.map(annotation => {
    const top = annotation.top ?? (annotation.index - 1) * 84
    return `
      <div class="annotation-item" data-annotation-id="${annotation.id}"
           style="position: absolute; top: ${top}px; left: 0; right: 0;">
        <div class="annotation-number">${annotation.index}</div>
        <div class="annotation-content">${annotation.content}</div>
      </div>
    `
  }).join('')
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

  if (sidebarHost) {
    sidebarHost.style.position = sidebarHostPrevPosition ?? ''
    sidebarHost = null
    sidebarHostPrevPosition = null
  }

  removeEventListeners()
}

// 计算注释位置
const calculateAnnotationPositions = () => {
  if (!annotations.value.length) return

  const refElements = document.querySelectorAll('.annotation-ref')
  const contentContainer = document.querySelector('.VPDoc .container .content-container')
  const list = document.querySelector('.annotations-sidebar .annotations-list')

  if (!contentContainer || !list) return

  const minGap = 16 // 注释之间的最小间距

  const containerRect = contentContainer.getBoundingClientRect()
  const listRect = (list as HTMLElement).getBoundingClientRect()
  const scrollTop = window.scrollY || document.documentElement.scrollTop
  const containerTop = containerRect.top + scrollTop
  const listTop = listRect.top + scrollTop
  const listOffsetFromContainer = listTop - containerTop

  // 第一步：先获取所有引用标记的原始位置
  refElements.forEach(el => {
    const annotationId = el.getAttribute('data-annotation-id')
    if (!annotationId) return

    // 引用标记相对于整个页面的位置
    const rect = el.getBoundingClientRect()
    const elTop = rect.top + scrollTop
    const annotation = annotations.value.find(a => a.id === annotationId)
    if (annotation) {
      const refCenter = elTop + rect.height / 2
      annotation.top = Math.max(0, refCenter - containerTop - listOffsetFromContainer)
    }
  })

  // 第二步：渲染注释到DOM以获取实际高度
  renderAnnotationItems()

  // 第三步：获取每个注释的实际渲染高度
  const annotationItems = list.querySelectorAll('.annotation-item')
  const annotationHeights = new Map<string, number>()
  const listWidth = (list as HTMLElement).clientWidth

  annotationItems.forEach(item => {
    const element = item as HTMLElement
    element.style.left = '0'
    element.style.right = '0'
    element.style.maxWidth = `${listWidth}px`
    element.style.width = `${listWidth}px`
    element.style.boxSizing = 'border-box'

    const id = item.getAttribute('data-annotation-id')
    if (id) {
      const height = element.offsetHeight
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

  // 监听文档内容变化，动态更新注释位置
  const doc = document.querySelector('.vp-doc')
  if (doc && ResizeObserver) {
    resizeObserver = new ResizeObserver(() => {
      scheduleAnnotationRecompute()
    })
    resizeObserver.observe(doc)
  }
}

const removeEventListeners = () => {
  document.removeEventListener('mouseover', handleMouseOver)
  document.removeEventListener('mouseout', handleMouseOut)
  document.removeEventListener('click', handleAnnotationClick)

  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }

  if (annotationResizeTimeout) {
    clearTimeout(annotationResizeTimeout)
    annotationResizeTimeout = null
  }
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
  scheduleAnnotationRecompute()
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

const scheduleInitAnnotations = async () => {
  await nextTick()

  if (initTimeout) {
    clearTimeout(initTimeout)
  }

  initTimeout = setTimeout(initAnnotations, 300)
}

onMounted(async () => {
  await scheduleInitAnnotations()
  window.addEventListener('resize', handleResize)
})

watch(() => route.path, async () => {
  // 先清掉上一页残留的 sidebar/模式，避免在 300ms 延迟窗口里闪烁或错误隐藏
  resetToInlineMode()

  await scheduleInitAnnotations()
})

onUnmounted(() => {
  if (initTimeout) {
    clearTimeout(initTimeout)
    initTimeout = null
  }

  window.removeEventListener('resize', handleResize)
  removeAnnotationsSidebar()
  document.documentElement.classList.remove(
    'annotations-mode--sidebar',
    'annotations-mode--inline',
    'article-layout--coordinated',
    'article-layout--inline'
  )
})
</script>

<template>
  <DefaultTheme.Layout>
    <template #layout-bottom>
      <DailyQuoteFooter />
    </template>
  </DefaultTheme.Layout>
</template>
