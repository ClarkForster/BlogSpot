# 右边栏注释功能开发 - 问题总结与解决方案

## 功能需求回顾

实现 Simon Willison 博客风格的**右边栏边注**功能：
- 支持 `>` 块级注释语法
- 支持 `[>]...[/]` 行内注释语法，可以插入到文中任意位置
- 大屏幕（≥ 1440px）：三栏布局 - 目录(左) + 文章(中) + 注释边栏(右)
- 中屏幕（961-1439px）：只显示上标引用，隐藏边栏
- 小屏幕（≤ 960px）：隐藏边栏，注释显示为 blockquote 在原文
- 注释位置与原文引用标记垂直对齐
- 双向点击跳转 + 悬停高亮

---

## 遇到的问题与解决方案

### 问题 1：注释不跟随文章滚动

**问题描述：**
- 最初使用 `position: fixed` 固定注释栏，滚动页面时注释位置不动，与原文引用错位

**解决方案：**
- 修改为 `position: absolute` 相对于文章内容容器
- 给 `.annotations-panel` 使用 `position: sticky` 保持面板可见
- 整个侧边栏容器随文章一起滚动，注释位置始终保持与原文对齐

**关键代码：**
```css
.annotations-sidebar {
  position: absolute !important;
  top: 0 !important;
  /* right 由JS计算定位 */
  width: 400px !important;
  z-index: 10 !important;
}
.annotations-panel {
  position: sticky;
  top: calc(var(--vp-nav-height) + 2rem);
  max-height: calc(100vh - var(--vp-nav-height) - 4rem);
  overflow-y: auto;
}
```

---

### 问题 2：目录和注释栏都在一端，布局不对称

**问题描述：**
- 默认 VitePress 目录在右侧，注释栏也在右侧，两者重叠
- 视觉效果不佳

**解决方案：**
- 将目录 `.VPDocAside` 移动到文章左侧
- 通过 CSS 固定定位：`left: calc((100vw - var(--vp-layout-max-width)) / 2)`
- 文章内容容器 `.content-container` 通过 `margin-left` 让出左侧空间

**最终布局：**
```
┌──────────┬────────────────┬──────────┐
│  目录   │    文章内容    │ 注释边栏 │
│ (fixed) │  (relative)   │ (absolute)
└──────────┴────────────────┴──────────┘
```

---

### 问题 3：左侧目录无法滚动

**问题描述：**
- 文章很长时，目录超出视口底部，无法滚动查看完整目录

**解决方案：**
- 添加最大高度限制和滚动支持：
```css
.VPDoc .VPDocAside {
  max-height: calc(100vh - var(--vp-nav-height)) !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  padding-bottom: 2rem !important;
}
```

---

### 问题 4：注释位置普遍偏下，对齐不准确

**问题描述：**
- 侧边栏中注释编号与原文引用标记垂直方向不对齐，注释整体偏下

**解决方案：**
- 在 JavaScript 位置计算时增加向上偏移量 `alignOffset`：
  - 初始 `-20px` → `-28px` → `-35px` → `-42px`
  - 每次调整都进一步向上移动，最终 `-42px` 对齐效果最好

**关键代码：**
```javascript
const alignOffset = -42 // 让注释编号和引用标记垂直中心对齐
annotation.top = (elTop - containerTop) + panelTitleHeight + alignOffset
```

---

### 问题 5：注释栏宽度不够，长注释显示不佳

**问题描述：**
- 初始宽度 260px → 320px → 360px，仍然偏小
- 较长注释换行太多，阅读体验差

**解决方案：**
- 增大到 `width: 400px`，现在大多数注释可以单行或双行显示

---

### 问题 6：**注释栏位置始终不对，CSS 修改不生效 / 位置不改变**（最棘手问题）

**问题描述：**
- 修改 `right` 值，刷新页面位置没有任何变化
- 尝试多次修改参数，结果都不对

**根因分析：**
- JavaScript 将注释栏添加到错误的父容器：`.VPDoc .container`（外层容器，包含目录+文章整个宽度）
- 实际上应该添加到 `.VPDoc .container .content-container`（只包含文章内容，目录移走后已经向右偏移）
- 由于定位父容器错误，导致 `right` 值计算基准错误，所以怎么改都不对

**解决方案：**
```javascript
// 错误：添加到外层 container
const docContainer = document.querySelector('.VPDoc .container')
docContainer.appendChild(annotationsContainer)

// 正确：添加到文章内容 container
const contentContainer = document.querySelector('.VPDoc .container .content-container')
contentContainer.style.position = 'relative'
contentContainer.appendChild(annotationsContainer)
```

**修正后：**
- `right: -420px` 现在相对于文章内容容器的右边缘
- 400px 宽的注释栏正好完全移出到文章右侧，完全可见，不越出浏览器

---

### 问题 7：缺少双向点击跳转

**问题描述：**
- 最初只有点击侧边栏注释跳转到原文
- 点击原文引用标记不能跳转到侧边栏对应注释

**解决方案：**
- 在 `handleAnnotationClick` 中添加对 `.annotation-ref` 点击的处理
- 新增 `scrollToSidebarAnnotation` 函数，实现平滑滚动到对应注释并高亮

**关键代码：**
```javascript
const handleAnnotationClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  const annotationItem = target.closest('.annotation-item')
  if (annotationItem) {
    const annotationId = annotationItem.getAttribute('data-annotation-id')
    if (annotationId) scrollToAnnotation(annotationId)
  }
  // 新增：点击原文引用跳转到侧边栏
  const annotationRef = target.closest('.annotation-ref')
  if (annotationRef) {
    const annotationId = annotationRef.getAttribute('data-annotation-id')
    if (annotationId) scrollToSidebarAnnotation(annotationId)
  }
}
```

---

### 问题 8：sgemm-analysis.md 文章不在主页列表

**问题描述：**
- 文章放在 `articles/` 目录，但 createContentLoader 只匹配 `posts/*.md`
- 所以首页文章列表看不到这篇文章

**解决方案：**
```typescript
// 修改为：匹配 posts 和 articles 两个目录
export default createContentLoader('{posts,articles}/*.md', {
```

---

## 最终 CSS 参数总结

| 配置项 | 值 | 说明
|--------|-----|-----
| 注释栏宽度 | `400px` | 足够容纳大多数注释
| 注释栏水平位置 | `right: -420px` | 相对于文章内容容器右边缘移出，留出 20px 间隙
| 对齐偏移量 | `-42px` | 注释编号与原文引用标记垂直中心对齐
| 目录宽度 | `var(--vp-sidebar-width)` | 使用 VitePress 默认侧边栏宽度
| 文章左边距 | `calc(var(--vp-sidebar-width) + 32px)` | 给目录留出空间

---

## 最终布局（大屏幕 ≥ 1440px）

```
浏览器视口
┌─────────────────────────────────────────────────────────────┐
│┌──────┐ ┌────────────────┐ ┌────────────┐                    │
││ 目录 │ │   文章内容     │ │  注释边栏  │                    │
││      │ │  720px        │ │  400px     │                    │
│└──────┘ └────────────────┘ └────────────┘                    │
└─────────────────────────────────────────────────────────────┘
←──────────────────────────────────  var(--vp-layout-max-width) →
```

- **目录**：fixed 定位在最左侧，可滚动
- **文章**：居中，相对定位
- **注释栏**：absolute 定位在文章右侧外部，sticky 面板保持可见
- 整体对称，互不重叠

---

## 响应式断点

| 屏幕宽度 | 目录 | 原文引用 | 注释边栏 | 原文 blockquote
|---------|------|----------|----------|----------------
| ≥ 1440px | 左侧显示 | 显示 | 显示 | 隐藏
| 961-1439px | 左侧显示 | 显示 | 隐藏 | 隐藏
| ≤ 960px | 自动隐藏 | 隐藏 | 隐藏 | 显示

---

## 文件修改清单

| 文件 | 修改内容
|------|------------
| `docs/.vitepress/config.ts` | 添加 markdown-it 插件处理 `>` 和 `[>]` 注释语法
| `docs/.vitepress/theme/components/ArticleLayout.vue` | 动态创建注释侧边栏，计算位置，处理交互
| `docs/.vitepress/theme/custom.css` | 所有样式，包括三栏布局、响应式、交互效果
| `docs/.vitepress/theme/index.ts` | 注册自定义布局
| `docs/.vitepress/theme/data/posts.data.ts` | 修改 content loader 匹配 `{posts,articles}/*.md`
| `docs/articles/sgemm-analysis.md` | 添加 frontmatter，发布文章
| `QuestionSummary.md` | 本文件 - 问题总结

---

## 交互功能

| 功能 | 描述
|------|-----
| 悬停高亮 | 悬停原文引用 → 对应侧边栏注释高亮；悬停侧边栏注释 → 对应原文引用高亮
| 点击跳转 | 点击原文引用 → 平滑滚动到侧边栏对应注释并高亮；点击侧边栏注释 → 平滑滚动到原文对应位置
| 窗口resize | resize observer 自动重新计算注释位置
| 页面切换 | watch route 自动重新初始化注释

