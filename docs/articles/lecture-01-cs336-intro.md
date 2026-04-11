---
layout: doc
title: CS336 Lecture 01 - 课程介绍
date: 2026-04-11
lastUpdated: 2026-04-11
category: 人工智能
description: Stanford CS336 语言模型从零构建课程第一讲 - 课程介绍与语言模型基础
tags: [CS336, 语言模型, 深度学习, 自然语言处理]
featured: true
---

# CS336 Lecture 01 - 课程介绍

> Stanford CS336: Language Models From Scratch（2026 春季）第一讲，介绍课程背景、目标与语言模型的基础概念。

## 交互式执行过程

下面的内容是可以逐步交互浏览的——你可以使用键盘方向键或点击控制面板来逐步查看代码的执行过程：

<div class="trace-viewer-container">
  <iframe
    src="/edtrace/?trace=var/traces/lecture_01.json"
    width="100%"
    height="800"
    style="border:none; border-radius:8px;"
    title="CS336 Lecture 01 Interactive Trace"
  ></iframe>
</div>

## 课程简介

CS336 是斯坦福大学的「Language Models From Scratch」课程，旨在从零开始构建和理解语言模型。本课程采用 "from scratch" 的教学理念，让学生深入理解语言模型的底层原理，而非仅仅停留在 API 调用层面。

### 课程特色

- **从零构建**：不依赖现成框架，深入理解每个组件的工作原理
- **理论与实践结合**：将理论知识与代码实现紧密结合
- **前沿内容**：涵盖混合专家模型（MoE）、长上下文处理、智能体等现代语言模型核心组件

### 适合人群

- 对语言模型底层原理感兴趣的开发者
- 希望深入理解 AI 系统的研究人员
- 想要从零构建自己语言模型的工程师

## 关键概念

### 什么是语言模型？

语言模型是一种能够理解和生成人类文本的统计模型。它通过计算给定上下文中下一个词的概率分布，来实现对语言的理解和生成。

### 为什么需要 "From Scratch"？

在现代 AI 研究中，越来越多地依赖 API 和高层抽象虽然提高了开发效率，但也带来了一些问题：

- 抽象是泄漏的（与编程语言或操作系统不同）
- 仍然需要基础研究来深入理解底层机制
- **全面理解**技术是实现**基础研究**的必要条件

## 课程结构

本课程将涵盖以下核心主题：

1. **语言模型基础**：从最基本的概率模型开始
2. **神经网络架构**：Transformer 等现代架构
3. **训练方法**：预训练、微调、对齐
4. **现代组件**：混合专家模型、长上下文处理、智能体系统
5. **评估与应用**：如何评估语言模型的性能

## 相关资源

- [CS336 课程主页](https://stanford-cs336.github.io/spring2025/)
- [往期讲座录像（2025 春季）](https://www.youtube.com/playlist?list=PLoROMvodv4rOY23Y0BoGoBGgQ1zmU_MT_)
- [交互式执行跟踪](/edtrace/?trace=var/traces/lecture_01.json)（全屏查看）
