export interface DailyQuote {
  content: string
  author: string
  source?: string
}

export const fallbackQuotes: DailyQuote[] = [
  {
    content: '真正重要的不是写下多少代码，而是你是否更接近问题的本质。',
    author: 'Blogspot',
    source: 'Fallback'
  },
  {
    content: '把复杂问题拆小，再把每一步都走稳，系统就会逐渐变清楚。',
    author: 'Blogspot',
    source: 'Fallback'
  },
  {
    content: '写作是整理思考，编程是验证思考；两者都在逼近真实。',
    author: 'Blogspot',
    source: 'Fallback'
  }
]

export const getRandomFallbackQuote = (): DailyQuote => {
  if (fallbackQuotes.length === 0) {
    return {
      content: '写作是整理思考，编程是验证思考；两者都在逼近真实。',
      author: 'Blogspot',
      source: 'Fallback'
    }
  }

  return fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)]
}
