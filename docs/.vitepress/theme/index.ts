import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import './custom.css'

import HomePage from './components/HomePage.vue'
import ArticleList from './components/ArticleList.vue'
import ResumePage from './components/ResumePage.vue'
import ResumeTimeline from './components/ResumeTimeline.vue'
import StandalonePageLayout from './components/StandalonePageLayout.vue'
import ArticleLayout from './components/ArticleLayout.vue'

const theme: Theme = {
  extends: DefaultTheme,
  Layout: ArticleLayout,
  enhanceApp({ app }) {
    app.component('HomePage', HomePage)
    app.component('ArticleList', ArticleList)
    app.component('ResumePage', ResumePage)
    app.component('ResumeTimeline', ResumeTimeline)
    app.component('StandalonePageLayout', StandalonePageLayout)
    app.component('ArticleLayout', ArticleLayout)
  }
}

export default theme
