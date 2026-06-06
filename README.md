# AIScript — AI 辅助剧本创作工具

将 3 章以上小说文本自动转换为结构化剧本（YAML 格式），让作者快速获得可编辑、可进一步打磨的剧本初稿。

[![GitHub release](https://img.shields.io/github/v/release/dwetdf/AIScript)](https://github.com/dwetdf/AIScript/releases)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Platform](https://img.shields.io/badge/platform-Windows%2010%2B-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18-green)

---

## 目录

- [核心概念](#核心概念)
- [三级流水线架构](#三级流水线架构)
- [技术栈](#技术栈)
- [功能清单](#功能清单)
- [快速开始](#快速开始)
- [项目结构](#项目结构)
- [三 Schema 体系](#三-schema-体系)
- [AI 引擎配置](#ai-引擎配置)
- [Electron 桌面端](#electron-桌面端)
- [开发指南](#开发指南)
- [贡献指南](#贡献指南)
- [许可证](#许可证)

---

## 核心概念

### 不是一步到位，而是三级流水线

传统 AI 剧本工具：丢一本小说 → 等 5 分钟 → 得到 50 页剧本 → 不知道怎么改。

**AIScript 的做法：**

```
📖 小说导入 → 🔍 阶段1：分析 → 📋 阶段2：改编规划 → ✍️ 阶段3：剧本展开 → 📄 编辑导出
```

每一级的输出**对人类可读、可编辑**，你可以在任何阶段介入：

- **分析完发现角色识别错了？** → 在分析报告中修正，重新规划
- **场景大纲节奏不对？** → 拖拽调整场景顺序，再展开 beat
- **某段对白不满意？** → 在编辑器里逐 beat 修改，或者单场景重新生成

### 三层防漂移机制

AI 最容易出现的问题——"传话游戏"式漂移：分析 → 梗概 → 剧本，每一步都在丢失原文细节。

AIScript 的解决方案：

| 层级 | 机制 | 阶段 |
|------|------|------|
| **第一层** | `curated_passages[]` — AI 精选原文高价值片段（≤200字/条） | 阶段 1 |
| **第二层** | `source_context` — 场景级原文上下文（对白原文+动作描写+环境描写+改编提示） | 阶段 2 |
| **第三层** | `source_ref` — beat 级溯源引用（{chapter, paragraph, excerpt}），可点击跳转 | 阶段 3 |

AI 基于**原文片段**而非梗概写作，大幅降低"AI 编造"的概率。

---

## 三级流水线架构

```
┌─────────────────────────────────────────────────────────────────┐
│                       阶段 1：小说分析                            │
│  输入：小说文件 (.txt / .docx / .md)                             │
│  输出：NovelAnalysis (YAML)                                     │
│                                                                 │
│  主题分析 · 世界观分析 · 剧情分析（主线/暗线/冲突/叙事）            │
│  人物分析（动机/弧线/特征/改编适用性）· 章节摘要 · AI精选原文片段    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                       阶段 2：改编规划                            │
│  输入：NovelAnalysis + 用户配置（媒介/风格/密度）                   │
│  输出：AdaptationPlan (YAML)                                    │
│                                                                 │
│  改编策略（基调/结构/人物/节奏/外化/压缩）                          │
│  幕级规划 · 分场景大纲 · 场景级原文上下文注入 · beat 规划            │
│  人物表初稿 · 地点表初稿                                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                       阶段 3：剧本展开                            │
│  输入：AdaptationPlan + source_context（原文）                    │
│  输出：Screenplay (YAML)                                        │
│                                                                 │
│  beat 级展开（基于原文）· 对白改写 · 心理外化 · 叙述压缩             │
│  过渡补全 · 场景头生成 · 张力精化 · 时长估算 · 溯源标记              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │   编辑器 + 分析工具   │
                  │                     │
                  │  beat 级编辑 · AI标记│
                  │  人物管理 · 原文对照  │
                  │  张力曲线 · 节奏分析  │
                  │  导出 PDF/FDX/HTML…  │
                  └─────────────────────┘
```

---

## 技术栈

| 层面 | 选型 | 说明 |
|------|------|------|
| **语言** | TypeScript (strict) | 全栈统一 |
| **前端** | React 18 + React Router 6 | SPA，编辑器需高频交互 |
| **状态管理** | Zustand 5 | 轻量，适合 YAML 树频繁局部更新 |
| **构建** | Vite 6 | 快速 HMR |
| **YAML 处理** | js-yaml 4 | 解析/序列化三个 Schema 的产物 |
| **Schema 验证** | AJV 8 | JSON Schema Draft-07 验证器 |
| **文档解析** | mammoth (.docx) + marked (.md) | 小说导入 |
| **导出** | 自研渲染器 (PDF/FDX/HTML/TXT/Fountain) | 剧本渲染 |
| **桌面端** | Electron 42 + electron-builder | Windows 桌面应用 |
| **AI 接口** | DeepSeek / Anthropic / OpenAI / 智谱 / 月之暗面 / 自定义 | Provider 可切换 |

---

## 功能清单

### ✅ 已实现

| 模块 | 核心功能 |
|------|----------|
| **小说导入** | 多格式导入 (.txt/.docx/.md)、自动分章识别、编码检测、段落解析 |
| **阶段 1 分析** | 主题分析、世界观分析、剧情分析（主线/暗线/冲突）、人物识别与 ID 分配、章节摘要、AI 精选原文片段 |
| **阶段 2 规划** | 改编策略决策、幕结构规划、分场景大纲、场景级原文上下文注入、beat 规划、人物表/地点表初稿 |
| **阶段 3 展开** | 场景 beat 展开（基于 source_context）、对白改写、心理外化、叙述压缩、过渡补全、is_ai_generated 标记、source_ref 溯源 |
| **AI 引擎** | 6 种 Provider 支持（DeepSeek/Anthropic/OpenAI/智谱/月之暗面/自定义 OpenAI 兼容端点）、模型选择、API Key 配置 |
| **编辑器** | beat 级编辑/增删、场景增删改、人物信息编辑、AI 内容高亮标记、撤销/重做、修订历史 |
| **导出** | PDF 导出（Electron 内静默打印）、FDX (Final Draft)、Fountain、HTML、TXT |
| **项目管理** | 多项目并存、项目创建/导入/导出/切换、数据 localStorage 持久化 |
| **分析工具** | 张力曲线图、节奏分析报告、人物出场统计、时长统计 |

### 📋 规划中

| 阶段 | 内容 |
|------|------|
| **第二期** | 原文对照视图、人物关系图谱、闪回段落分析、配置模板保存、macOS 打包 |
| **第三期** | 协作功能（评论/标注/变更追踪）、REST API、插件系统、多语言翻译 |

> 完整 114 项功能清单见 [docs/features.md](docs/features.md)

---

## 快速开始

### 前置要求

- **Node.js** >= 18
- **npm** >= 9

### 安装与运行

```bash
# 1. 克隆仓库
git clone https://github.com/dwetdf/AIScript.git
cd AIScript

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev
# → 浏览器访问 http://localhost:5173

# 4. （可选）Electron 桌面模式
npm run electron:dev   # 开发模式
npm run electron:start # 生产模式预览
```

### 打包桌面应用

```bash
# 构建 Windows 安装包（NSIS + 便携版）
npm run electron:package

# 产物在 release/ 目录：
#   AIScript Setup x.x.x.exe   — 安装版
#   AIScript x.x.x.exe         — 便携版
```

### 配置 AI 引擎

1. 打开应用 → 点击右上角 ⚙️ 齿轮图标进入**设置页面**
2. 选择 AI 提供商（DeepSeek / Anthropic / OpenAI / 智谱 / 月之暗面 / 自定义）
3. 填写 API Key
4. 选择模型
5. 返回主界面，导入小说开始使用

> **推荐模型：** DeepSeek (deepseek-chat) 性价比最高；Claude (claude-sonnet-4-6) 文学理解能力最强。

---

## 项目结构

```
AIScript/
├── CLAUDE.md                           # Claude Code 项目引导文件
├── SCHEMA_DESIGN.md                    # 三 Schema 体系设计文档
├── novel-analysis.schema.yaml          # 阶段 1 数据标准
├── adaptation-plan.schema.yaml         # 阶段 2 数据标准
├── screenplay.schema.yaml              # 阶段 3 数据标准
├── package.json
├── vite.config.ts
├── tsconfig.json
│
├── docs/                               # 参考文档
│   ├── features.md                     #   114 项功能清单 + MVP + 分期
│   ├── directory-structure.md          #   完整目录树
│   └── division-of-work.md             #   分工详情 + 接口契约
│
├── src/
│   ├── schema/          # TS 类型定义 + Schema 校验（公共契约）
│   ├── parser/          # 模块 A：小说导入与预处理
│   ├── analyzer/        # 模块 B：阶段 1 — 小说分析
│   ├── planner/         # 模块 C：阶段 2 — 改编规划
│   ├── converter/       # 模块 D：阶段 3 — beat 展开
│   ├── yaml-builder/    # 模块 E：YAML 输出构建与校验
│   ├── editor/          # 模块 G：剧本编辑器 UI
│   ├── analysis/        # 模块 H：分析工具（张力/节奏/统计）
│   ├── renderer/        # 模块 I：渲染导出（PDF/FDX/HTML/TXT）
│   ├── project/         # 模块 J：项目管理
│   ├── store/           # Zustand 全局状态管理
│   ├── shared/          # 公共工具（常量/ID生成/修订历史）
│   └── api/             # AI 接口调用 + 文件存储
│
├── electron/            # Electron 桌面端
│   ├── main.ts          #   主进程
│   ├── preload.ts       #   预加载脚本（contextBridge）
│   └── tsconfig.json
│
├── build/               # Electron 打包资源（图标等）
└── tests/               # 测试文件
```

---

## 三 Schema 体系

AIScript 不只有一份剧本 Schema，而是三份独立 Schema 构成完整数据流水线：

| Schema | 阶段 | 版本 | 用途 |
|--------|------|------|------|
| `novel-analysis.schema.yaml` | 阶段 1 | v1.1.0 | 小说分析产物 |
| `adaptation-plan.schema.yaml` | 阶段 2 | v1.1.0 | 改编规划产物 |
| `screenplay.schema.yaml` | 阶段 3 | v1.1.0 | 最终剧本产物 |

### 为什么是三份 Schema？

1. **质量可控** — 每一层的输出可读、可编辑。场景大纲层可以增删场景、调整顺序，修改后只需重跑该场景。
2. **作者信任** — 分级让作者看清 AI "做了什么决策、为什么这么做"。
3. **错误隔离** — 阶段 2 的场景划分有问题，只回到 adaptation_plan 调整，已确认的内容不需要重新生成。
4. **独立复用** — 可以只跑阶段 1 分析小说结构，也可以反复调整阶段 2 参数对比不同改编方案。

### 文档结构（Screenplay）

```
screenplay
├── schema_version / revision_history
├── metadata（标题/媒介/语言/来源/配置）
├── characters[] — 全局人物表（character_id 贯穿全流水线）
├── locations[] — 全局地点表
├── acts[] → scenes[] → beats[] — 四层叙事结构
└── production_notes — 制作附注
```

### Beat 类型

`action` | `dialogue` | `parenthetical` | `transition` | `title_card` | `voice_over` | `off_screen` | `montage_start` | `montage_end` | `flashback_start` | `flashback_end` | `insert`

### Beat ID 规则

```
E{集}A{幕}S{场}B{节拍}
示例：E1A1S3B7 = 第1集 第1幕 第3场 第7个beat
```

> 详细设计理由见 [SCHEMA_DESIGN.md](SCHEMA_DESIGN.md)

---

## AI 引擎配置

### 支持的 Provider

| Provider | 默认模型 | 说明 |
|----------|----------|------|
| **DeepSeek** | deepseek-chat | 性价比最高，中文能力强 |
| **Anthropic** | claude-sonnet-4-20250514 | 文学理解最细腻 |
| **OpenAI** | gpt-4o | 通用能力强 |
| **智谱 GLM** | glm-4 | 国产模型，中文优化 |
| **月之暗面** | moonshot-v1-8k | 国产模型，长文本支持 |
| **自定义** | 任意 | 兼容 OpenAI API 格式的端点 |

### 可配置参数

| 参数 | 可选值 | 默认值 | 说明 |
|------|--------|--------|------|
| `dialogue_density` | sparse / balanced / dense | balanced | 对白密度 |
| `action_detail_level` | minimal / standard / detailed | standard | 动作描写详细度 |
| `target_medium` | film / tv_series / web_series / stage_play / audio_drama | tv_series | 目标媒介 |
| `genre` | 多选 | — | 类型标签 |
| `tone` | serious / comedic / dark 等 | — | 剧本基调 |

三阶段共用同一 AI 配置，每个阶段的产物都记录使用的引擎信息。

---

## Electron 桌面端

### 特性

- **原生窗口** — 完整 BrowserWindow，支持最小尺寸限制 (1024×700)
- **PDF 静默导出** — 使用 Electron `printToPDF()` API，不弹出打印对话框
- **安全的 IPC 通信** — `contextBridge` + `contextIsolation` 模式
- **双模式运行** — 开发模式（连接 Vite Dev Server）+ 生产模式（加载构建产物）

### 打包产物

| 文件 | 类型 | 说明 |
|------|------|------|
| `AIScript Setup x.x.x.exe` | NSIS 安装版 | 可选安装路径，创建开始菜单快捷方式 |
| `AIScript x.x.x.exe` | 便携版 | 免安装，双击直接运行 |

### 手动打包

```bash
# 确保依赖已安装
npm install

# 构建并打包
npm run electron:package
# → 产物在 release/ 目录
```

---

## 开发指南

### 代码风格

- TypeScript strict mode
- 函数优先于 class，纯函数优先于有副作用函数
- 文件名：kebab-case（`beat-expander.ts`），组件名：PascalCase（`BeatLine.tsx`）
- 超过 50 行的函数必须拆分
- 导出函数必须有 JSDoc 注释

### 数据流规则

```
parser → analyzer → planner → converter → Store ← editor
                                              ← renderer
```

- **数据模块**（parser/analyzer/planner/converter）不引入 React/DOM/浏览器 API
- **UI 模块**（editor/）不 import 数据模块的内部文件，只 import 公开导出
- **Store** 是数据桥梁：editor 写 Store，renderer 读 Store

### CLI 命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动 Vite 开发服务器 |
| `npm run build` | TypeScript 编译 + Vite 生产构建 |
| `npm run preview` | 预览生产构建 |
| `npm run electron:dev` | Electron 开发模式 |
| `npm run electron:start` | Electron 生产模式预览 |
| `npm run electron:package` | Electron 打包 Windows 安装包 |
| `npm run electron:build` | 仅构建 Electron 主进程 TS |

### 提交规范

```
feat(module): 简述    → 新功能
fix(module): 简述     → 修复
refactor(module): 简述 → 重构
docs: 简述            → 文档/README 更新
test: 简述            → 测试
chore: 简述           → 杂项（依赖/配置/构建）
```

### 分支策略

```
main
├── feat/* — 功能分支
├── fix/*  — 修复分支
└── chore/* — 杂项分支
```

---

## 贡献指南

欢迎提交 Issue 和 Pull Request！

### PR 规范

1. **单一职责** — 每个 PR 只做一件事
2. **标题格式** — `feat(module): 简述` 或 `fix(module): 简述`
3. **功能描述** — 说明功能作用与使用方式
4. **实现思路** — 技术选型、核心逻辑、涉及的模块与文件
5. **测试方式** — 如何验证功能正常运行

### 开发前建议

1. 阅读 [CLAUDE.md](CLAUDE.md) 了解项目全貌和设计决策
2. 阅读 [SCHEMA_DESIGN.md](SCHEMA_DESIGN.md) 理解数据模型
3. 确认你的修改不破坏三个 Schema 的接口契约

---

## 许可证

MIT License

---

*Made with ❤️ by AIScript Team*
*AI 辅助创作，人类精心打磨。*
