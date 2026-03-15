# Blogspot

一个基于 VitePress 的个人技术博客骨架，偏向中文写作、长文阅读体验和低维护成本。

## 本地开发

```bash
pnpm install
pnpm dev
```

默认访问地址：`http://localhost:5173`

## 构建

```bash
pnpm build
pnpm preview
```

构建产物位于 `docs/.vitepress/dist/`。

## 内容结构

- `docs/index.md`：首页
- `docs/articles.md`：文章索引
- `docs/about.md`：关于页
- `docs/posts/*.md`：博客文章
- `docs/.vitepress/config.ts`：站点配置
- `docs/.vitepress/theme/custom.css`：主题样式

## 写作约定

```yaml
---
title: 文章标题
date: 2026-03-09
description: 一句话描述，用于列表和 SEO
tags: [标签1, 标签2]
featured: false
category: 技术
draft: false
---
```

- 文件名使用 `kebab-case`
- 文章 URL 为 `/posts/<slug>`
- 图片建议放到 `docs/public/images/posts/<slug>/`

## 部署

仓库内已包含 `.github/workflows/deploy.yml` 示例，可配合 EdgeOne Pages 的 Git 自动部署使用。
