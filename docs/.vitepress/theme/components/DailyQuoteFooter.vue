<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vitepress'
import { getRandomFallbackQuote, type DailyQuote } from '../data/dailyQuote'

interface HitokotoResponse {
  hitokoto?: string
  from_who?: string | null
  from?: string | null
}

const route = useRoute()
const quote = ref<DailyQuote>(getRandomFallbackQuote())
const copyState = ref<'idle' | 'copied'>('idle')
let activeRequestId = 0
let activeController: AbortController | null = null
let copyResetTimeout: ReturnType<typeof setTimeout> | null = null

const isHitokotoResponse = (value: unknown): value is HitokotoResponse => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const payload = value as Record<string, unknown>
  return typeof payload.hitokoto === 'string'
}

const normalizeQuote = (value: unknown): DailyQuote | null => {
  if (!isHitokotoResponse(value)) {
    return null
  }

  const content = value.hitokoto?.trim()
  if (!content) {
    return null
  }

  const author = value.from_who?.trim() || value.from?.trim() || '一言'
  const normalizedFrom = value.from?.trim()
  const source = normalizedFrom && normalizedFrom !== author ? normalizedFrom : undefined

  return {
    content,
    author,
    source
  }
}

const getCopyText = () => {
  const source = quote.value.source ? ` · ${quote.value.source}` : ''
  return `“${quote.value.content}” —— ${quote.value.author}${source}`
}

const resetCopyState = () => {
  copyState.value = 'idle'

  if (copyResetTimeout) {
    clearTimeout(copyResetTimeout)
    copyResetTimeout = null
  }
}

const resetCopyStateLater = () => {
  if (copyResetTimeout) {
    clearTimeout(copyResetTimeout)
  }

  copyResetTimeout = setTimeout(() => {
    copyState.value = 'idle'
    copyResetTimeout = null
  }, 1600)
}

const fallbackCopyText = (text: string) => {
  if (typeof document === 'undefined') {
    throw new Error('Clipboard unavailable')
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'absolute'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  document.body.removeChild(textarea)

  if (!copied) {
    throw new Error('Clipboard copy failed')
  }
}

const copyQuote = async () => {
  const text = getCopyText()

  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      fallbackCopyText(text)
    }

    copyState.value = 'copied'
    resetCopyStateLater()
  } catch {
    try {
      fallbackCopyText(text)
      copyState.value = 'copied'
      resetCopyStateLater()
    } catch {
      resetCopyState()
    }
  }
}

const handleQuoteKeydown = async (event: KeyboardEvent) => {
  if (event.key !== 'Enter' && event.key !== ' ') {
    return
  }

  event.preventDefault()
  await copyQuote()
}

const refreshQuote = async () => {
  const requestId = ++activeRequestId
  quote.value = getRandomFallbackQuote()

  activeController?.abort()
  const controller = new AbortController()
  activeController = controller
  const timeoutId = window.setTimeout(() => controller.abort(), 4000)

  try {
    const response = await fetch('https://v1.hitokoto.cn/?encode=json&c=i&c=d&c=k', {
      signal: controller.signal,
      headers: {
        Accept: 'application/json'
      }
    })

    if (!response.ok) {
      return
    }

    const data: unknown = await response.json()
    const nextQuote = normalizeQuote(data)
    if (!nextQuote || requestId !== activeRequestId) {
      return
    }

    quote.value = nextQuote
  } catch {
    // keep random fallback silently
  } finally {
    if (activeController === controller) {
      activeController = null
    }
    window.clearTimeout(timeoutId)
  }
}

onMounted(() => {
  void refreshQuote()
})

watch(() => route.path, () => {
  activeRequestId += 1
  resetCopyState()
  void refreshQuote()
})

onBeforeUnmount(() => {
  activeRequestId += 1
  activeController?.abort()
  activeController = null
  resetCopyState()
})
</script>

<template>
  <footer class="daily-quote-footer" aria-label="页脚每日一言">
    <div class="daily-quote-footer__inner">
      <div class="daily-quote-footer__quote-wrap">
        <blockquote
          class="daily-quote-footer__quote"
          :class="{ 'is-copied': copyState === 'copied' }"
          role="button"
          tabindex="0"
          :aria-label="copyState === 'copied' ? '语录已复制' : '点击复制当前语录'"
          @click="copyQuote"
          @keydown="handleQuoteKeydown"
        >
          <p class="daily-quote-footer__content">“{{ quote.content }}”</p>
          <p class="daily-quote-footer__meta">
            <span class="daily-quote-footer__author">{{ quote.author }}</span>
            <span v-if="quote.source" class="daily-quote-footer__source">{{ quote.source }}</span>
          </p>
        </blockquote>
        <div v-if="copyState === 'copied'" class="daily-quote-footer__toast" aria-live="polite">已复制到剪贴板</div>
      </div>
    </div>
  </footer>
</template>
