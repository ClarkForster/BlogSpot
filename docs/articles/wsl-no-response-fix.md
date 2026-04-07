---
layout: doc
title: WSL 无响应问题修复
date: 2026-04-07
category: 环境配置
description: 记录一次 WSL 终端无响应、相关命令卡住时的排查过程，以及最终通过重置 WinSock 配置解决问题的处理方法。
tags: [WSL, Windows, 故障排查, 网络, 环境配置]
featured: false
---
# WSL 无响应问题修复
> 前几天跑代码的时候发现wsl无法打开，遂上网查询资料，经验证如下方法可以有效解决问题

## 问题描述

wsl终端无响应，停留在初始化页面（图一）

![image.png](/Photos/wsl-no-response-fix/terminal-hang.png)

图一

使用 `wsl --shutdown`  等 wsl 相关命令卡住

## 主流修复方案

### 一、销毁重启 LxssManager 进程

1. 管理员权限启动 Terminal

2. 执行命令： `tasklist /svc /fi “imagename eq svchost.exe”`

3. 找到 LxssManager的PID，在任务管理器里详情里找到该进程并结束进程树

4. 在任务管理器-服务中重新启动 LxssManager

### 二、重启 WinSock 配置

1. 管理员身份启动 Powershell

2. 执行 netsh winsock reset

3. 重启主机

    > 注意：执行 netsh winsock reset  命令前不要打开代理，否则重启后网络会出现问题。若重启后网络出现问题，可以把代理关闭并重新执行上述修复流程

1. 启动 wsl，验证问题是否修复

### 三、备份重装 WSL 

![image.png](/Photos/wsl-no-response-fix/reinstall-plan.png)

## 解决方案

法一在执行 `tasklist /svc /fi “imagename eq svchost.exe”` 命令后没有返回 LxssManager 的PID，因此作罢，最终成功解决方案为：**法二-重启 WinSock 配置**

## 参考

### netsh winsock reset

在 Windows 中，`netsh winsock reset` 命令用于重置网络套接字（Winsock）配置。 这可以解决由于网络软件或驱动程序的错误引起的网络连接问题。 Winsock（Windows Sockets）是 Windows 用于处理网络请求的接口，通过重置它可以修复以下常见问题：

1. **网络连接异常**：网络连接不稳定、无法连接到网络或网络速度变慢。

2. **浏览器问题**：网页无法加载或浏览器出现连接错误。

3. **DNS 解析问题**：可能解决 DNS 无法解析的问题。

4. **软件冲突**：有时安装或卸载网络相关的软件（如 VPN、网络监控工具）会导致 Winsock 配置出错。

运行 `netsh winsock reset` 命令的步骤如下：

1. 打开命令提示符（以管理员身份）。

2. 输入命令：`netsh winsock reset`。

3. 执行后，重启计算机使更改生效。

执行此命令后，Winsock 将重置为默认状态，通常不会影响其他网络配置（如 IP 地址等），但会影响一些依赖于 Winsock 的软件设置。

### **LxssManager**

**LxssManager** 是 WSL 的核心服务之一，用于管理 Linux 子系统的启动与运行。如果该服务停止或挂起，WSL 可能无法正常启动或执行命令。因此可以通过销毁-重启 LxssManager 尝试修复 wsl 无响应问题

## 参考文档

[https://zhuanlan.zhihu.com/p/1958924154700014768](https://zhuanlan.zhihu.com/p/1958924154700014768)

[https://www.hetong-re4per.com/posts/fixing-wsl-startup-issues/](https://www.hetong-re4per.com/posts/fixing-wsl-startup-issues/)

[https://www.hetong-re4per.com/posts/fixing-wsl-startup-issues/](https://www.hetong-re4per.com/posts/fixing-wsl-startup-issues/)
