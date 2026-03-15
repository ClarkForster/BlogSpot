---
title: 读性能分析报告时，先看趋势，再看热点
date: 2026-03-06
description: 很多性能优化失败，并不是因为工具不够，而是因为阅读报告的方法错了。
tags: [性能, profiling, 系统]
featured: false
category: 系统与性能
draft: false
---

# 读性能分析报告时，先看趋势，再看热点

性能分析工具会给出大量细节，但真正重要的问题通常只有两个：

- 时间主要花在哪一层？
- 这些开销是稳定的，还是某种特定输入触发的？

## 为什么不要一开始就盯热点

热点函数当然重要，但如果你一上来就只看最上面的几个符号，很容易忽略更大的结构问题。

举个例子：

```ts
function render(items: Item[]) {
  return items
    .filter((item) => item.visible)
    .map((item) => expensiveFormat(item))
    .sort(compareByPriority)
}
```

即使 `expensiveFormat` 很慢，真正的问题也可能是整个渲染流程被调用得过于频繁，而不是这一个函数本身。

## 一个更稳妥的阅读顺序

- 先看整体趋势：CPU、内存、I/O 到底是谁在主导。
- 再找重复出现的调用路径。
- 最后才下钻到具体热点函数和源码位置。

这样做的好处是，你优化的对象更可能是“结构性浪费”，而不是“看起来最显眼的一行代码”。
