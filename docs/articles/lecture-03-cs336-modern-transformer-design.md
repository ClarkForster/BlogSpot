---
layout: doc
title: CS336 Lecture 03 - 现代 Transformer 设计选择
date: 2026-04-13
lastUpdated: 2026-04-14
category: 人工智能
description: Stanford CS336 第三讲：梳理现代大语言模型在归一化、激活函数、位置编码与超参数上的主流设计选择，理解“为什么今天的 Transformer 长这样”。
tags: [CS336, Transformer, 架构设计, RMSNorm, RoPE]
featured: false
---

# CS336 Lecture 03 - 现代 Transformer 设计选择

> 注：本文整理自 Stanford CS336 的 2026 版 Lecture 03 讲义；文末课程主页链接仍指向公开可访问的既有课程站点，用于补充背景资料。

> Stanford CS336: Language Models From Scratch（2026 春季）第三讲，讨论现代语言模型的架构细节与超参数选择：为什么大家几乎都走向了 LLaMA-like 设计，哪些改动是真正重要的，哪些只是经验上逐渐稳定下来的工程结论。

## 本讲在回答什么问题？

Lecture 03 讨论的不是“Transformer 能不能工作”，而是另一个更贴近真实工程的问题：**既然 Transformer 已经成为基础模板，那么今天的大模型具体应该怎么设计？**

从原始 Transformer 到现代主流大模型，表面上看变化很多：

- post-norm 变成 pre-norm
- LayerNorm 变成 RMSNorm
- ReLU 变成 SwiGLU / GeGLU 一类 gated activation
- 绝对位置编码逐渐被 RoPE 替代
- bias 项越来越常被删掉

但这节课真正想建立的是一种判断框架：面对大量 architecture tweaks，应该区分哪些是核心共识，哪些只是局部试验，哪些是为了训练稳定性，哪些是为了节省带宽与参数移动成本。

## 从“原始 Transformer”到“现代变体”

讲义先回顾了经典 Transformer 的标准配置：

- 位置编码使用正余弦
- FFN 使用 ReLU
- 归一化使用 post-norm LayerNorm
- 线性层通常带 bias

而课程实现版本采用的是一个更现代、也更接近今天主流开源模型的变体：

- 使用 **pre-norm**
- 使用 **RoPE（Rotary Position Embeddings）**
- FFN 使用 **SwiGLU** 而不是 ReLU
- 线性层和归一化层通常 **不带 bias**

这并不是为了“追新”，而是因为这些选择已经在很多模型中反复被验证，逐渐成为默认配置。

## 为什么现代模型几乎都选择 pre-norm？

Lecture 03 强调了一个如今几乎已经成为共识的判断：**在大规模语言模型里，pre-norm 往往比 post-norm 更稳定。**

### pre-norm 和 post-norm 的差别

两者区别不在于“有没有归一化”，而在于归一化是否直接插入主 residual stream：

- **post-norm**：先做残差相加，再做 LayerNorm
- **pre-norm**：先做归一化，再进入 attention / FFN 子层，主残差路径更干净

这一点看起来只是位置变化，但它会直接影响梯度传播方式。

### 为什么更稳定？

讲义提到了几类常见解释：

- 减轻梯度衰减
- 缓解梯度 spike
- 允许更大的学习率
- 大网络训练时更不依赖精细 warmup

可以把它理解为：**pre-norm 尽量不去破坏 residual connection 作为“信息高速路”的作用**。当网络变深、模型变大之后，这种差异就会变得非常关键。

### 还有更进一步的变体

现代模型并不满足于“只做 pre-norm”。有些新模型开始尝试：

- residual stream 内维持 pre-norm
- residual stream 外再补一个额外的 post-norm

它背后的想法是：既想保留 pre-norm 的训练稳定性，也想保留某些 post-processing 的好处。Lecture 03 的态度很明确：这类变体值得关注，但真正稳定的主流共识仍然是 **non-residual norm + pre-norm**。

## LayerNorm 为什么逐渐让位于 RMSNorm？

原始 Transformer 使用的是 **LayerNorm**，它会对隐藏维度做均值和方差归一化；而许多现代模型改用 **RMSNorm**，只根据均方根进行缩放，不再显式减均值，也通常不带 bias。

### RMSNorm 的直观优势

从公式上看，RMSNorm 做的事情更少，因此：

- 运算更简单
- 参数更少
- 访存更少

如果只看 FLOPs，这些收益似乎不大，因为 Transformer 里最重的依然是矩阵乘法。但 Lecture 03 特别提醒了一个很重要的系统视角：**FLOPs 不是 runtime，本地数据搬运同样会支配实际时间。**

这和第二讲的 roofline 视角是连起来的：

- matmul 是计算主角
- norm 这类操作常常更受 memory movement 影响
- 因此哪怕 FLOPs 降幅不大，只要数据移动减少，也可能带来真实 wall-clock 收益

### 为什么大家会接受 RMSNorm？

核心原因不是“它理论上更优雅”，而是：

- 实践里效果通常不差于 LayerNorm
- 训练更快
- 参数与访存成本更低
- 很适合现代大模型的系统瓶颈结构

这节课传递出的判断标准很实用：**当一个替代方案在效果上几乎不损失，而在系统成本上更便宜，它就很容易成为默认选择。**

## 为什么 bias 项越来越少？

Lecture 03 还总结了另一个几乎已经渗透到现代大模型里的趋势：**很多线性层和归一化层都不再使用 bias。**

原因并不神秘，主要有两类：

1. **系统成本**：多一个 bias，就多一份参数存储和访存
2. **优化经验**：在很多大模型设定里，bias 的收益并不明显

如果某个参数既不能显著改善最终效果，又会引入额外的数据移动成本，那它在现代 LLM 里就很容易被删掉。这个判断逻辑和 RMSNorm 的流行其实是同一条主线：**小处的简化，乘上超大规模后就会变得很值钱。**

## FFN 与激活函数：为什么大家不再满足于 ReLU？

原始 Transformer 的 FFN 通常是 `Linear -> ReLU -> Linear`。但现代语言模型里，更常见的是：

- GeLU
- Swish / SiLU
- GLU 系列
- GeGLU
- ReGLU
- **SwiGLU**

Lecture 03 没有把重点放在死记这些名字，而是强调了一个趋势：**越来越多模型选择带门控（gated）的 FFN 变体。**

### 为什么 gated activation 流行？

直觉上，gated 结构给 FFN 提供了更灵活的通道选择能力。相比单纯做一个逐点非线性，它允许模型在隐藏维度上更细致地调节信息流。

SwiGLU 之所以常见，可以从两个角度理解：

- 它继承了 Swish / SiLU 类激活较平滑的特性
- 它又带有 GLU 结构的门控能力

因此很多现代模型会把它作为默认 FFN 方案。Lecture 03 的真正结论不是“永远用 SwiGLU”，而是：**FFN 已经不再被视为一个固定模板，而是模型表达能力的重要调节器。**

## 位置编码：为什么 RoPE 成为主流？

课程实现里直接用了 **RoPE**，这也反映了现实中的主流趋势。

相比早期的绝对位置编码，RoPE 的吸引力主要在于：

- 更自然地融入 attention 计算
- 对相对位置信息更友好
- 在长上下文扩展时更容易继续做工程变体

虽然讲义这一页不是专门讲位置编码的完整谱系，但它把 RoPE 放在“现代标准配置”里，本身就传达了一个信号：**今天的大模型默认不再从正余弦绝对位置编码开始思考。**

## 架构讨论里，最容易犯什么错？

Lecture 03 提醒了一个很现实的问题：2024–2025 年每年都会出现大量新模型，其中很多只是做了少量 tweak。面对这些变化，最容易犯的错误有两个：

### 1. 误以为每个 tweak 都决定成败

事实上，很多模型共享的主干高度一致。大多数成功模型仍然围绕类似的骨架展开：

- decoder-only Transformer
- pre-norm
- RMSNorm 或近似变体
- RoPE
- gated FFN
- 无 bias 或少 bias

这说明真正重要的是先识别“共识层”，而不是被局部差异牵着走。

### 2. 只从论文命名看差异，不从系统代价看差异

Lecture 03 反复强调：现代 LLM 的很多设计选择，并不是因为它们带来了戏剧性的理论变化，而是因为它们在**稳定性、吞吐、访存、可扩展性**上形成了更好的综合权衡。

也就是说，架构设计从来不只是“表达能力竞赛”，更是“系统代价管理”。

## 超参数该怎么理解？

这节课还把讨论范围扩展到了若干常见超参数问题，例如：

- FFN 隐藏层到底设多大？
- multi-head 的维度一定要刚好加起来等于 model dimension 吗？
- vocabulary size 需要怎么定？
- 哪些超参数真的敏感，哪些只是局部可调？

Lecture 03 在这里最重要的贡献，不是给出一个固定答案，而是给出一种态度：**超参数并不是独立于架构之外的附属设置，它们和训练稳定性、系统成本、tokenizer 设计、并行实现方式紧密耦合。**

因此，不能把“某模型用了某个超参数”直接理解为普适最优，而应该理解为它在特定训练预算与系统目标下的局部最优解。

## 本讲最值得带走的几条经验

如果把 Lecture 03 压缩成几条可执行的工程经验，大概是：

1. **优先从主流共识开始，而不是从论文 novelty 开始。**
   当你实现一个现代 Transformer，pre-norm、RoPE、RMSNorm、gated FFN 往往是更稳的默认起点。

2. **关注 residual stream 的“干净程度”。**
   许多稳定性技巧，本质上都在保护梯度和信息沿主路径顺畅传播。

3. **不要把 FLOPs 当成唯一指标。**
   RMSNorm、删 bias 这类选择提醒我们，访存成本往往同样重要。

4. **现代架构演化很多时候是“保守升级”，不是彻底革命。**
   大模型领域最常见的成功路线，往往不是推翻 Transformer，而是在共识骨架上持续打磨。

## 总结

Lecture 03 可以看作一堂“现代 Transformer 审美课”。它告诉我们：今天的大语言模型为什么普遍长得像 LLaMA，又为什么那些看似微小的设计差别会在大规模训练中不断累积出真实差异。

这节课最重要的收获，不是记住所有 activation 名字或 norm 变体，而是建立一种工程判断力：

- 哪些设计已经成为大规模训练的稳定共识
- 哪些改动主要是为了节省参数和带宽
- 哪些超参数需要和系统实现一起看
- 哪些“新架构”其实只是对共同骨架的小幅调整

如果说第二讲是在建立资源核算的系统直觉，那么第三讲就是在建立**架构选择的系统直觉**：现代 LLM 的设计不是随机堆叠出来的，而是在稳定性、效率与经验积累中逐渐收敛出来的。

## 相关资源

- [CS336 课程主页](https://stanford-cs336.github.io/spring2025/)
- [Xiong et al. 2020: On Layer Normalization in the Transformer Architecture](https://arxiv.org/abs/2002.04745)
- [Zhang & Sennrich 2019: Root Mean Square Layer Normalization](https://arxiv.org/abs/1910.07467)
- [RoFormer: Enhanced Transformer with Rotary Position Embedding](https://arxiv.org/abs/2104.09864)
