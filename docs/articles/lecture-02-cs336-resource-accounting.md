---
layout: doc
title: CS336 Lecture 02 - 资源核算与系统直觉
date: 2026-04-13
lastUpdated: 2026-04-13
category: 人工智能
description: Stanford CS336 第二讲：从内存与算力核算出发，理解训练效率、算术强度、Roofline 与常见内存优化策略。
tags: [CS336, 语言模型, 系统, 训练优化, Roofline]
featured: false
---

# CS336 Lecture 02 - 资源核算与系统直觉

> Stanford CS336: Language Models From Scratch（2026 春季）第二讲，从资源核算的角度理解语言模型训练：显存是如何被占用的、算力是如何被消耗的，以及为什么一些操作受限于计算而另一些受限于带宽。

## 交互式执行过程

下面的内容是可以逐步交互浏览的——你可以使用键盘方向键或点击控制面板来逐步查看代码的执行过程：

<div class="trace-viewer-container">
  <iframe
    src="/edtrace/?trace=var/traces/lecture_02.json"
    width="100%"
    height="800"
    style="border:none; border-radius:8px;"
    title="CS336 Lecture 02 Interactive Trace"
  ></iframe>
</div>

## 本讲在回答什么问题？

如果给定固定的资源预算，例如 GPU 数量、显存大小和训练时间，我们究竟能训练多大的模型？

Lecture 02 的核心不是某个新的模型结构，而是一种工程思维：**resource accounting（资源核算）**。也就是把训练过程拆成可度量的内存占用与计算开销，从而快速判断系统瓶颈在哪里。

讲义一开始就提出了两个很有代表性的问题：

- 一个 70B 参数模型，在 1024 张 H100 上训练 15T tokens，大概要多久？
- 如果手上只有 8 张 H100，并且使用 AdamW，最多能容纳多大的模型？

这类问题的意义在于，它们迫使我们把“训练语言模型”还原成一些可计算的量：参数量、激活、梯度、优化器状态、FLOPs、带宽等。只有先学会这种估算，我们才谈得上理解效率。

## 资源核算基础：Tensor 与内存

从系统角度看，训练过程中的一切几乎都可以归结为 tensor：

- 数据（data）
- 参数（parameters）
- 梯度（gradients）
- 优化器状态（optimizer state）
- 激活值（activations）

这也是为什么 Lecture 02 先从 tensor 的 rank、shape 和 device 讲起。对 Transformer 来说，类似 `batch × seq × heads × hidden` 这样的四维张量是最常见的基本单位。

### 显存由什么决定？

一个 tensor 占多少内存，主要看两件事：

1. 元素个数（numel）
2. 每个元素的字节数（element size）

因此，同样形状的张量，只要数据类型变了，显存占用就会立刻变化。

### fp32、fp16、bf16 的工程意义

讲义通过几个简单例子说明了不同精度的实际差异：

- **fp32**：默认精度，稳定，但显存开销大
- **fp16**：内存减半，但动态范围较差，容易下溢
- **bf16**：与 fp16 占用相同内存，但动态范围更接近 fp32，更适合训练

这里最重要的结论不是“bf16 更高级”，而是：**它在不显著增加内存开销的前提下，改善了训练稳定性**。讲义用 `1e-8` 的例子展示了 fp16 可能直接下溢为 0，而 bf16 不会，这就是现代大模型训练大量使用 bf16 的直观原因。

### Mixed Precision 为什么成为主流

在实际训练中，通常不会把所有状态都放在同一种精度里。Lecture 02 给出的经验是：

- 参数、激活、梯度常用 bf16
- 优化器状态通常保留 fp32

这是典型的 mixed precision 思路：把显存和稳定性一起纳入统一的工程权衡。也正因为优化器状态往往使用 fp32，它常常成为显存预算里一个很大的组成部分。

### CPU 与 GPU：数据在哪里

讲义还提醒了一个经常被忽略的问题：tensor 不只是有形状和 dtype，还有 **device**。默认张量可能在 CPU 上，而想要利用 GPU 的并行能力，就必须把数据移动到 GPU memory 中。很多性能问题，实际上都隐藏在“数据在哪里”这个问题背后。

## 算力核算基础：FLOPs、FLOP/s 与 MFU

讨论完显存，下一步自然是计算量。

这里有两个很容易混淆但必须区分的概念：

- **FLOPs**：总共做了多少浮点运算
- **FLOP/s**：硬件每秒能执行多少浮点运算

前者描述“工作量”，后者描述“机器速度”。

### 一个矩阵乘法要多少 FLOPs？

在讲义的线性模型示例中，若输入是 `B × D`，权重是 `D × K`，那么矩阵乘法的 FLOPs 近似为：

`2 × B × D × K`

原因很直接：对每个 `(i, j, k)`，大致会发生一次乘法和一次加法。这种数量级估算，是后面分析训练成本的基础。

### 什么是 MFU？

Lecture 02 引入了 **Model FLOPs Utilization（MFU）**：

`MFU = 实际 FLOP/s / 理论峰值 FLOP/s`

这个指标衡量的不是模型“聪不聪明”，而是你的训练有没有把硬件吃满。讲义特别指出，MFU 能达到 0.5 往往就已经相当不错了。这说明训练效率远远不只是“看 GPU 型号”，还取决于操作模式、数据移动和瓶颈结构。

## 算术强度与 Roofline：到底卡在算力还是带宽？

为什么 MFU 很难接近 1？Lecture 02 给出的答案是：很多计算并不是真的受限于算力，而是受限于内存带宽。

讲义把一次计算拆成三个步骤：

1. 把输入从内存送到加速器
2. 执行计算
3. 把输出写回内存

因此，总耗时同时受两个因素影响：

- accelerator speed（FLOP/s）
- memory bandwidth（bytes/s）

### Arithmetic Intensity 的直觉

所谓 **arithmetic intensity**，就是“每传输一个字节，实际做了多少计算”。

- 如果计算很多、数据搬运相对少，就更可能是 **compute-bound**
- 如果计算不多、但要频繁读写内存，就更可能是 **memory-bound**

Lecture 02 用多个例子建立了这种直觉：

- ReLU：memory-bound
- GELU：虽然计算比 ReLU 多，但依然可能 memory-bound
- dot product：memory-bound
- matrix-vector product：memory-bound
- matrix-matrix multiplication：当矩阵足够大时，通常 compute-bound

这也是本讲最值得记住的反直觉结论之一：**计算更多不一定更慢**。如果系统瓶颈本来就在内存带宽上，那么增加一点算术操作，未必会显著增加总时间。

### 为什么训练常常 compute-bound，而推理常常 memory-bound？

讲义把这个问题说得很清楚：

- Transformer 训练里，大量核心算子是大矩阵乘法，因此更容易吃满计算单元
- 推理时更常见的是 matrix-vector product，因此更容易被内存带宽限制

这解释了为什么“同一张 GPU”，训练和推理的性能画像会完全不同。

### Roofline 分析是什么？

Roofline 图把算术强度和可达到的性能联系起来。图中的“拐点”对应硬件的 accelerator intensity：

- 拐点左边，多数是 memory-bound
- 拐点右边，多数是 compute-bound

Lecture 02 进一步用这个图解释 MFU：性能上限并不总是由 GPU 的峰值 FLOP/s 决定，还会被数据搬运能力提前压住。这个视角非常重要，因为它告诉我们：优化训练速度，不能只盯着算子计算量，还要看数据移动模式。

## 训练一步到底要多少计算？

Lecture 02 的另一个核心结论，是训练 FLOPs 的经典近似：

- Forward pass：`2 × (# data points) × (# parameters)`
- Backward pass：`4 × (# data points) × (# parameters)`
- Total：`6 × (# data points) × (# parameters)`

也就是常说的 **6ND**。

### 为什么 backward 比 forward 更贵？

讲义通过一个两层线性网络把这个结论拆开来讲：

- forward 需要完成正常的矩阵乘法
- backward 则既要计算对输入的梯度，也要计算对权重的梯度

因此反向传播大约是前向传播的两倍。把所有层加总后，就得到 `forward = 2ND`、`backward = 4ND`、总计 `6ND` 的近似公式。

这不是拍脑袋记忆公式，而是从具体张量计算推出来的。因此它在工程上特别有价值：只要知道数据规模和参数规模，就能迅速估算训练一轮的大致成本。

### 这个公式有什么边界？

讲义也没有把它说成绝对真理。它先在 MLP 上推导，再指出：对短上下文长度下的 Transformer，这仍然是一个相当有用的近似。也就是说，它更像一条工程估算规则，而不是对所有网络结构都严格精确的解析式。

## 内存不仅有参数，还有优化器状态

很多人第一次估算显存时，只想到参数本身，但 Lecture 02 强调，训练中的显存账单至少包括：

- 参数
- 梯度
- 激活
- 优化器状态

以讲义中的示例为例：

- 参数若用 bf16，大约是 2 bytes / parameter
- 梯度若用 bf16，也是 2 bytes / parameter
- AdaGrad 的优化器状态约为 4 bytes / parameter
- Adam 则通常约为 8 bytes / parameter

这就是为什么“同样大小的模型”，选择不同优化器时，能否放进显存会差很多。讲义开头关于“8 张 H100 最多能训练多大模型”的估算，本质上就在利用这套账本做快速判断。

同时还要记住一个关键 caveat：**只按参数、梯度和优化器状态估算出来的模型规模，通常只是上界，因为 activations 还没有计入。**

## 两种关键显存优化：Gradient Accumulation 与 Activation Checkpointing

在显存不够时，Lecture 02 介绍了两种非常实用的策略。

### Gradient Accumulation

大 batch 往往有利于训练稳定性，但 activation memory 会随着 batch size 增长。如果一次性塞不下完整 batch，可以：

1. 把大 batch 拆成多个 micro-batch
2. 逐个 micro-batch 计算梯度
3. 暂时不更新参数，只累积梯度
4. 等累积到目标 batch size 后再统一更新参数

这样做的本质是：**用更多时间换取更低的瞬时激活内存**。

### Activation Checkpointing

训练时，为了反向传播，通常需要保存每一层的激活；但推理不需要保存全部历史激活，因此显存压力小很多。

Activation checkpointing（也叫 gradient checkpointing 或 rematerialization）的思想是：

- 前向传播时，不保存所有层的激活，只在少数 checkpoint 处保存
- 反向传播时，把缺失的激活重新算出来

本质上就是：**用重算换显存**。

Lecture 02 还总结了不同策略的复杂度权衡：

- 保存所有层激活：内存 `O(L)`，几乎不需要重算
- 什么都不保存：内存 `O(1)`，但重算代价高到 `O(L²)`
- 每隔 `sqrt(L)` 层保存一次：内存 `O(sqrt(L))`，重算约 `O(L)`

这个结论很有价值，因为它说明 checkpointing 不是一个“开或不开”的技巧，而是一个可以继续细调的设计空间。

## 总结

Lecture 02 传达的并不是某个零散的系统技巧，而是一套统一的工程视角：

- 训练本质上是在操作 tensors
- 显存开销来自参数、梯度、激活和优化器状态
- 计算效率不能只看 FLOPs，还要看 FLOP/s、带宽与算术强度
- 大矩阵乘法常常 compute-bound，而很多逐元素运算与推理算子更容易 memory-bound
- 训练一步的 FLOPs 近似可以用 `6ND` 快速估算
- 当显存成为约束时，可以用 gradient accumulation 和 activation checkpointing 做系统级权衡

如果说第一讲是在建立“语言模型是什么”的整体地图，那么第二讲则是在建立“训练到底花掉了什么资源”的系统直觉。对于后续理解 Transformer、并行训练和大模型系统优化，这一讲几乎是必须打牢的基础。

## 相关资源

- [CS336 课程主页](https://stanford-cs336.github.io/spring2025/)
- [Roofline 分析参考（JAX Scaling Book）](https://jax-ml.github.io/scaling-book/roofline/)
- [PyTorch Automatic Mixed Precision 文档](https://pytorch.org/docs/stable/amp.html)
- [Transformer Training Memory Usage](https://erees.dev/transformer-memory/)
- [Transformer FLOPs 估算](https://www.adamcasson.com/posts/transformer-flops)
- <a href="/edtrace/?trace=var/traces/lecture_02.json" target="_blank" rel="noopener">交互式执行跟踪</a>（全屏查看）
