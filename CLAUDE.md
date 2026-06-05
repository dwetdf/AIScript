# CLAUDE.md

## 项目概述

AI 辅助剧本创作工具 —— 将 3 章以上小说文本自动转换为结构化剧本（YAML 格式），让作者快速获得可编辑、可进一步打磨的剧本初稿。

**核心流水线：** 小说导入与分析 → 改编规划 → 分场大纲 → beat 展开 → 编辑导出
**数据标准（三 Schema 体系）：**

| Schema 文件 | 阶段 | 用途 |
|---|---|---|
| `novel-analysis.schema.yaml` v1.1.0 | 阶段 1 | 小说分析产物 |
| `adaptation-plan.schema.yaml` v1.1.0 | 阶段 2 | 改编规划产物 |
| `screenplay.schema.yaml` v1.1.0 | 阶段 3 | 最终剧本产物 |
| `SCHEMA_DESIGN.md` | — | 体系设计文档（三个 Schema 的设计理由） |

---

## 完整功能点（114 项）

### 一、小说导入与预处理（6 项）

| 编号 | 功能点 | 说明 |
|------|--------|------|
| F1 | 多格式小说导入 | 支持 .txt / .docx / .md / .epub |
| F2 | 分章节识别 | 自动识别章节边界（"第X章"、标题模式、分隔符），≥3 章 |
| F3 | 分段落解析 | 保留原文段落结构，用于 source_ref 溯源 |
| F4 | 编码自动检测 | UTF-8 / GBK / GB2312 等中文编码 |
| F5 | 章节范围选择 | 选择转换范围（source_chapters.start/end） |
| F6 | 原文预处理清洗 | 去除广告、章节尾注、作者碎碎念 |

### 二、小说分析 — 阶段 1（12 项）

| 编号 | 功能点 | 说明 |
|------|--------|------|
| F7 | 主题分析 | 核心主题/次要主题/基调特征提取 → theme_analysis |
| F8 | 世界观分析 | 时代背景/势力分布/空间规则/硬约束提取 → world_building |
| F9 | 剧情主线提取 | 主线概述 + stakes → plot_analysis.main_plot |
| F10 | 暗线/支线提取 | 支线识别 + 与主线的关联方式 → plot_analysis.sub_plots |
| F11 | 核心冲突分析 | 冲突类型 + 多层面分析 → plot_analysis.core_conflict |
| F12 | 关键事件时间线 | 按章节列出关键事件 + dramatic_function 标注 → plot_analysis.key_events |
| F13 | 叙事结构分析 | 时间线类型/POV/叙事技巧/节奏总结 → plot_analysis.narrative_structure |
| F14 | 人物识别与分配 ID | 识别人物 + 分配 character_id（snake_case 拼音，贯穿全流水线） + 身份/动机/弧线 → character_analysis |
| F15 | 人物特征提取 | 对白风格/习惯动作/外貌/口头禅 → character_analysis[].distinctive_traits |
| F16 | 人物重要性评级 | essential / major / supporting / minor → character_analysis[].importance |
| F17 | 改编适用性分析 | 每个人物的改编注意事项 → character_analysis[].adaptability_notes |
| F18 | 章节摘要与原文标注 | 每章概述 + 原文段落按序号存储 + 类型/重要性/改编提示标注 → chapter_summaries + raw_passages[] |

### 三、改编规划 — 阶段 2（13 项）

| 编号 | 功能点 | 说明 |
|------|--------|------|
| F19 | 基调映射 | 原著基调 → 剧本目标基调 → adaptation_strategy.tone_adaptation |
| F20 | 结构改编决策 | 删减/重排/合并决策（decision + rationale + impact）→ structural_decisions |
| F21 | 人物改编决策 | 保留/合并/扩展/删除每个人物的决策 → character_adaptations（基于 character_id） |
| F22 | 节奏规划 | 整体节奏 + 高张力占比 + 缓冲策略 → pacing_strategy |
| F23 | 外化策略 | 内心独白→对白、心理→动作的转化策略 → externalization_strategy |
| F24 | 叙述压缩规则 | 环境/动作/对白的压缩规则 → compression_rules |
| F25 | 幕结构规划 | 幕划分（act_type/synopsis/预估场景数/关键时刻/对应章节）→ episode_plan |
| F26 | 分场景大纲生成 | 每个场景大纲（位置/地点/时间/dramatic_function/tension/人物）→ scene_plan[] |
| F27 | 场景原文上下文提取 | 从 raw_passages[] 提取场景对应原文（概述+对白+动作+环境+改编注意事项）→ scene_plan[].source_context |
| F28 | 场景 beat 规划 | 预估节拍数 + 必须包含的关键 beat + 展开指导 → scene_plan[].beat_plan |
| F29 | 人物表初稿生成 | 基于人物分析生成 characters_draft[]（沿用 character_id） |
| F30 | 地点表初稿生成 | 基于世界观分析生成 locations_draft[] |
| F31 | 改编方案对比 | 保存多份 adaptation_plan 并对比差异 |

### 四、AI 转换核心引擎 — 阶段 3（14 项）

| 编号 | 功能点 | 说明 |
|------|--------|------|
| F32 | 场景 beat 展开 | 基于 scene_plan.source_context + beat_plan 逐个场景展开为完整 beats[] |
| F33 | 对白提取与改写 | 基于 source_context.key_dialogues 改写为剧本对白（去引号、按行宽规范） |
| F34 | 内心独白外化 | 基于 raw_passages[type=internal_monologue] 转为对白/动作/表情/VO |
| F35 | 叙述压缩 | 基于 compression_rules + raw_passages[type=narrative] 压缩为简练 action beat |
| F36 | 过渡内容补全 | AI 生成连接性内容，标记 is_ai_generated: true |
| F37 | 场景头自动生成 | 按 INT./EXT. 地点 — 时间 格式生成 scene_heading |
| F38 | tension_level 精化 | 基于实际 beat 内容精化阶段 2 的张力预估值 |
| F39 | 时长精确估算 | beat 级 estimated_duration_seconds，场景级自动求和 |
| F40 | 人物表完整构建 | 继承 characters_draft，补充 first_appearance/voice_notes 等 → characters[] |
| F41 | 人物关系填入 | 从 character_analysis 继承 relationships → characters[].relationships |
| F42 | production_notes 生成 | 映射 structural_decisions → production_notes.adaptation_decisions |
| F43 | unresolved_items 标注 | AI 识别的不确定改编点自动标注 |
| F44 | source_ref 自动溯源 | 基于 raw_passages[].paragraph 为源于原著的 beat 填 {chapter, paragraph, excerpt} |
| F45 | 分级感知转换 | 根据 rating 过滤/改写超限内容 |

### 五、AI 引擎配置与可配置参数（11 项）

| 编号 | 功能点 | 说明 |
|------|--------|------|
| F46 | AI 提供商选择 | 支持 deepseek（默认）/ openai / anthropic / zhipu / moonshot / custom |
| F47 | AI 模型选择 | 对应提供商的模型，如 deepseek-chat / gpt-4o / claude-sonnet-4-20250514 |
| F48 | 自定义 API 端点 | ai_provider 为 custom 时自定义 URL |
| F49 | 对白密度控制 | dialogue_density: sparse / balanced / dense（默认 balanced） |
| F50 | 动作详细度控制 | action_detail_level: minimal / standard / detailed（默认 standard） |
| F51 | 舞台指示风格 | stage_direction_style: concise / descriptive（默认 descriptive） |
| F52 | 目标媒介选择 | target_medium: film / tv_series / web_series / stage_play / audio_drama |
| F53 | 类型标签设置 | genre 多选 |
| F54 | 基调设置 | tone: serious / comedic / dark 等 |
| F55 | 集数规划 | 剧集模式设置 total_episodes，自动分配章节 |
| F56 | 配置模板保存 | 一键复用转换参数组合（含 AI 引擎配置） |

### 六、结构化输出与校验（10 项）

| 编号 | 功能点 | 说明 |
|------|--------|------|
| F57 | novel_analysis YAML 生成 | 阶段 1 产物 YAML 序列化 + Schema 校验 |
| F58 | adaptation_plan YAML 生成 | 阶段 2 产物 YAML 序列化 + Schema 校验 |
| F59 | screenplay YAML 生成 | 阶段 3 产物 YAML 序列化 + Schema 校验 + beat-less 场景支持 |
| F60 | Schema 版本标注 | 三个产物各自写入 schema_version |
| F61 | beat_id 自动编号 | 按 E{集}A{幕}S{场}B{节拍} 规则 |
| F62 | is_ai_generated 标记 | AI 新增 beat 标记 true，原著 beat 标记 false |
| F63 | source_text_ref 溯源 | 人类可读原文摘要 |
| F64 | YAML 格式校验 | 三个 Schema 各自的 required/枚举/正则/条件必填验证 |
| F65 | 跨阶段数据一致性校验 | scene_plan 条目数 = screenplay scenes 数；character_id 跨三个阶段一致 |
| F66 | 跨阶段 AI 引擎统一 | 三个阶段共用同一 ai_config，每个阶段产物记录使用的引擎信息 |

### 七、剧本编辑与审校（12 项）

| 编号 | 功能点 | 说明 |
|------|--------|------|
| F67 | beat 级编辑 | 逐 beat 修改对白/动作/顺序 |
| F68 | beat 增删 | 插入/删除 beat（beat-less 场景允许 beats 为空） |
| F69 | 场景增删改 | 新增/删除/调整场景顺序 |
| F70 | 人物信息编辑 | 修改 characters 表，全局同步 |
| F71 | 人物改名全局同步 | 改 character_id 对应 name，所有引用自动更新 |
| F72 | AI 内容高亮 | is_ai_generated: true 的 beat 用不同样式标记 |
| F73 | 原文对照视图 | 左侧原著段落，右侧对应 beat，分屏核对 |
| F74 | 跳转原著位置 | 点击 source_ref 跳转到 raw_passages 对应段落 |
| F75 | 一键删除 AI 内容 | 清除所有 is_ai_generated: true 的 beat |
| F76 | 撤销/重做 | 完整 Undo/Redo |
| F77 | 编辑历史记录 | revision_history 自动追加 |
| F78 | 版本对比 | diff 两个 revision 的变更 |

### 八、分析与审阅工具（12 项）

| 编号 | 功能点 | 说明 |
|------|--------|------|
| F79 | 张力曲线图 | 按 tension_level 绘制全剧情绪起伏 |
| F80 | 节奏分析报告 | 高潮位置、激励事件、张力分布检查 |
| F81 | 人物出场统计 | 按角色统计出场场景数/beat 数/台词行数 |
| F82 | 人物关系图谱 | 按 relationships 可视化关系网络 |
| F83 | 人物台词聚合 | 一键查看某角色全部台词 |
| F84 | 场景时长统计 | 全剧/每幕/每场景时长汇总 |
| F85 | 对白/动作占比 | dialogue vs action beat 数量和篇幅占比 |
| F86 | 叙事功能结构检查 | 激励事件/中点/高潮缺失警告 |
| F87 | dramatic_function 分布图 | 各叙事功能在全剧的分布可视化 |
| F88 | 幕间节奏对比 | 各幕 tension_level/场景数/时长对比 |
| F89 | 媒介适配检查 | 时长是否符合目标媒介规范 |
| F90 | 闪回段落分析 | 统计闪回段落时长和频次 |

### 九、渲染与导出（9 项）

| 编号 | 功能点 | 说明 |
|------|--------|------|
| F91 | 标准剧本格式渲染 | Final Draft 风格排版 |
| F92 | 按媒介差异化渲染 | 根据 target_medium 调整输出 |
| F93 | 导出 PDF | 带页码/场景号/标准排版 |
| F94 | 导出 Final Draft (.fdx) | Final Draft / Celtx / WriterSolo 兼容 |
| F95 | 导出 Fountain | 纯文本标记语言格式 |
| F96 | 导出 HTML | 格式化网页剧本 |
| F97 | 导出纯文本 | .txt 保持缩进格式 |
| F98 | 打印预览 | 打印前预览排版效果 |
| F99 | 水印叠加 | "AI 辅助生成 / 初稿"水印 |

### 十、项目管理（6 项）

| 编号 | 功能点 | 说明 |
|------|--------|------|
| F100 | 项目创建 | 新建项目，关联原著名/作者/目标媒介 |
| F101 | 项目列表 | 多项目管理，搜索/排序/筛选 |
| F102 | 多集管理 | 剧集项目下管理多集，每集独立三阶段 YAML 产物链 |
| F103 | 章节进度追踪 | 已转换到第 X 章/共 N 章，可追加转换 |
| F104 | 项目存档与恢复 | 保存/加载/备份/恢复 |
| F105 | 配置关联 | 记住项目最后使用的转换配置 + AI 引擎配置 |

### 十一、协作功能（4 项）

| 编号 | 功能点 | 说明 |
|------|--------|------|
| F106 | 评论/标注 | beat/scene 上添加 editorial_note |
| F107 | 任务分配 | 场景/角色对白指派给团队成员 |
| F108 | 变更追踪 | 修订模式，追踪编辑变更，支持接受/拒绝 |
| F109 | 导出评审包 | 含注释/待办项，供导演/制片审阅 |

### 十二、扩展与集成（5 项）

| 编号 | 功能点 | 说明 |
|------|--------|------|
| F110 | 接景连续性检查 | 交叉校验前后场景 continuity_notes |
| F111 | 多语言翻译 | 剧本对白翻译为其他语言 |
| F112 | API 接口 | REST API，供第三方工具集成 |
| F113 | 插件系统 | 第三方渲染器/分析维度插件 |
| F114 | 自定义 AI 引擎集成 | 支持任意 OpenAI 兼容 API 端点（ai_provider: custom + ai_api_base_url） |

---

## 核心功能点（MVP，共 35 项）

**第一期必须实现 阶段 1 → 阶段 2 → 阶段 3 → 编辑 → 导出 PDF 完整闭环。**

### 小说导入（3 项）

| 编号 | 功能点 | 优先级理由 |
|------|--------|-----------|
| **F1** | 多格式导入（.txt/.docx） | 入口 |
| **F2** | 分章节识别 | 分析基本单位 |
| **F3** | 分段落解析 | source_ref 溯源基石 |

### 阶段 1 — 小说分析（7 项）

| 编号 | 功能点 | 优先级理由 |
|------|--------|-----------|
| **F7** | 主题分析 | 改编的"北极星" |
| **F11** | 核心冲突分析 | 决定剧本的冲突结构 |
| **F12** | 关键事件时间线 | 幕划分和场景切分的直接输入 |
| **F14** | 人物识别与分配 ID | character_id 贯穿全流水线的起点 |
| **F15** | 人物特征提取 | 对白风格/习惯动作——beat 展开的写作指导 |
| **F16** | 人物重要性评级 | 人物合并/删减决策的基础 |
| **F18** | 章节摘要与原文标注 | 防漂移机制第一层 + 溯源索引 |

### 阶段 2 — 改编规划（8 项）

| 编号 | 功能点 | 优先级理由 |
|------|--------|-----------|
| **F19** | 基调映射 | 决定写作风格 |
| **F20** | 结构改编决策 | 删什么留什么的核心决策 |
| **F21** | 人物改编决策 | 人物合并/删减/强化 |
| **F25** | 幕结构规划 | 剧本骨架 |
| **F26** | 分场景大纲生成 | 场景级结构，beat 展开的输入 |
| **F27** | 场景原文上下文提取 | 防漂移机制第二层：原文注入 Prompt |
| **F28** | 场景 beat 规划 | 每个场景的展开指导 |
| **F29** | 人物表初稿生成 | 沿用 character_id，为阶段 3 准备 |

### 阶段 3 — beat 展开（6 项）

| 编号 | 功能点 | 优先级理由 |
|------|--------|-----------|
| **F32** | 场景 beat 展开（基于 source_context） | 核心生成能力 |
| **F33** | 对白提取与改写（基于 key_dialogues） | 剧本的核心内容 |
| **F35** | 叙述压缩 | 小说→剧本刚需 |
| **F36** | 过渡内容补全 | + is_ai_generated 标记 |
| **F37** | 场景头自动生成 | 标准格式元素 |
| **F61** | beat_id 自动编号 | 全局唯一引用 |

### AI 引擎配置（2 项）

| 编号 | 功能点 | 优先级理由 |
|------|--------|-----------|
| **F46** | AI 提供商选择 | 默认 deepseek，支持切换 |
| **F47** | AI 模型选择 | 决定转换质量 |

### 输出与校验（4 项）

| 编号 | 功能点 | 优先级理由 |
|------|--------|-----------|
| **F59** | screenplay YAML 生成（含 beat-less 场景） | 最终产物 |
| **F62** | is_ai_generated 标记 | 作者审校关键依赖 |
| **F64** | YAML 格式校验 | 保证输出有效 |
| **F66** | 跨阶段 AI 引擎统一 | 三阶段共享同一 AI 配置 |

### 编辑与导出（5 项）

| 编号 | 功能点 | 优先级理由 |
|------|--------|-----------|
| **F67** | beat 级编辑（含 beat-less 场景） | 最小编辑粒度 |
| **F68** | beat 增删 | 基本操作 |
| **F72** | AI 内容高亮 | 作者审校核心 |
| **F76** | 撤销/重做 | 编辑体验基础 |
| **F93** | 导出 PDF | 最通用分发格式 |

---

## 分期规划

| 阶段 | 范围 | 功能数 | 目标 |
|------|------|--------|------|
| **MVP** | 核心功能点（上表 35 项） | 35 | "导入→分析→规划→展开→编辑→导出PDF"闭环 |
| **第二期** | 分析工具 + 多格式导出 + 原文对照 + 项目管理 | ~25 | 提升审校效率和专业度 |
| **第三期** | 协作 + API + 插件 + 多语言 | ~15 | 个人工具升级为团队/平台工具 |

---

## 技术栈

| 层面 | 选择 | 说明 |
|------|------|------|
| 前端框架 | React 18 + TypeScript | SPA，编辑器需高频交互 |
| 状态管理 | Zustand | 轻量，适合 YAML 树频繁局部更新 |
| YAML 处理 | js-yaml | 解析/序列化三个 Schema 的产物 |
| Schema 验证 | ajv | JSON Schema Draft-07 验证器 |
| AI 接口 | DeepSeek API（默认）/ Anthropic API / OpenAI API / 智谱 API / 月之暗面 API / 自定义 OpenAI 兼容端点 | 三阶段 Prompt 调用，provider 可切换 |
| 文档解析 | mammoth (.docx) + marked (.md) | 小说导入 |
| 导出 | Puppeteer (PDF) + 自研 (FDX/HTML/TXT) | 剧本渲染 |
| 构建工具 | Vite | 快速 HMR |

---

## 目录结构

```
/aiscript
├── CLAUDE.md
├── novel-analysis.schema.yaml       # 阶段 1 数据标准
├── adaptation-plan.schema.yaml      # 阶段 2 数据标准
├── screenplay.schema.yaml           # 阶段 3 数据标准
├── SCHEMA_DESIGN.md                 # 体系设计文档
├── package.json
├── tsconfig.json
├── vite.config.ts
│
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   │
│   ├── schema/                      # Schema 类型与校验（公共）
│   │   ├── types.ts                 # 三个 Schema 的 TS 类型定义
│   │   ├── novel-analysis.ts        # NovelAnalysis 类型
│   │   ├── adaptation-plan.ts       # AdaptationPlan 类型
│   │   ├── screenplay.ts            # Screenplay 类型
│   │   ├── validator.ts             # ajv 验证封装（三个 Schema 共用）
│   │   └── cross-validator.ts       # 跨阶段数据一致性校验 (F60)
│   │
│   ├── parser/                      # 模块 A：小说导入 (F1-F6)
│   │   ├── index.ts                 #   入口 + 格式分发
│   │   ├── txt.ts                   #   TXT 解析
│   │   ├── docx.ts                  #   DOCX 解析
│   │   ├── md.ts                    #   Markdown 解析
│   │   ├── chapter-detector.ts      #   章节边界识别
│   │   ├── encoding.ts              #   编码检测
│   │   └── cleaner.ts               #   预处理清洗
│   │
│   ├── analyzer/                    # 模块 B：小说分析 — 阶段 1 (F7-F18)
│   │   ├── index.ts                 #   分析流程编排：导入文本 → NovelAnalysis
│   │   ├── theme.ts                 #   主题分析 (F7)
│   │   ├── world-building.ts        #   世界观分析 (F8)
│   │   ├── plot.ts                  #   剧情分析 (F9-F13)
│   │   ├── character.ts             #   人物分析 (F14-F17)
│   │   ├── chapter-summaries.ts     #   章节摘要与原文标注 (F18)
│   │   └── prompt-templates/        #   阶段 1 Prompt 模板
│   │       ├── full-analysis.md
│   │       ├── theme.md
│   │       ├── character.md
│   │       └── plot.md
│   │
│   ├── planner/                     # 模块 C：改编规划 — 阶段 2 (F19-F31)
│   │   ├── index.ts                 #   规划流程编排：NovelAnalysis + Config → AdaptationPlan
│   │   ├── tone-mapping.ts          #   基调映射 (F19)
│   │   ├── structural-decisions.ts  #   结构改编决策 (F20)
│   │   ├── character-adaptation.ts  #   人物改编决策 (F21)
│   │   ├── pacing.ts                #   节奏规划 (F22)
│   │   ├── externalization.ts       #   外化策略 (F23)
│   │   ├── compression-rules.ts     #   压缩规则 (F24)
│   │   ├── episode-plan.ts          #   幕结构规划 (F25)
│   │   ├── scene-plan.ts            #   分场景大纲 (F26-F28)
│   │   ├── draft-builder.ts         #   characters_draft / locations_draft (F29-F30)
│   │   └── prompt-templates/        #   阶段 2 Prompt 模板
│   │       ├── adaptation-strategy.md
│   │       ├── episode-plan.md
│   │       └── scene-plan.md
│   │
│   ├── converter/                   # 模块 D：beat 展开 — 阶段 3 (F32-F45)
│   │   ├── index.ts                 #   展开流程编排：AdaptationPlan → Screenplay
│   │   │                           #   关键：Prompt 注入 scene_plan[].source_context（原文上下文）
│   │   ├── beat-expander.ts         #   场景 → beats[] (F32)
│   │   ├── dialogue.ts              #   对白提取改写 (F33)
│   │   ├── internal-external.ts     #   心理外化 (F34)
│   │   ├── compression.ts           #   叙述压缩 (F35)
│   │   ├── transition-filler.ts     #   过渡补全 (F36)
│   │   ├── scene-heading.ts         #   场景头生成 (F37)
│   │   ├── tension-refiner.ts       #   张力精化 (F38)
│   │   ├── duration-estimator.ts    #   时长估算 (F39)
│   │   ├── character-builder.ts     #   characters[] 完整构建 (F40-F41)
│   │   ├── production-notes.ts      #   production_notes 生成 (F42-F43)
│   │   ├── source-tracer.ts         #   source_ref 溯源 (F44)
│   │   └── prompt-templates/        #   阶段 3 Prompt 模板
│   │       ├── beat-expansion.md
│   │       ├── dialogue-rewrite.md
│   │       └── transition-fill.md
│   │
│   ├── yaml-builder/                # 模块 E：YAML 输出构建 (F57-F66)
│   │   ├── index.ts                 #   三个 Schema 的 YAML 序列化/反序列化
│   │   ├── beat-id.ts               #   beat_id 自动编号 (F61)
│   │   └── metadata.ts              #   元数据填充
│   │
│   ├── editor/                      # 模块 G：剧本编辑器 (F67-F78)
│   │   ├── index.tsx                #   编辑器主入口
│   │   ├── EditorLayout.tsx         #   整体布局
│   │   ├── views/
│   │   │   ├── ScriptView.tsx       #   剧本编辑主视图
│   │   │   ├── OutlineView.tsx      #   大纲视图（幕/场景树）
│   │   │   ├── CharacterView.tsx    #   人物表视图
│   │   │   ├── SourceCompareView.tsx#   原文对照分屏 (F73)
│   │   │   ├── PlanView.tsx         #   改编规划查看/编辑视图
│   │   │   └── AnalysisView.tsx     #   小说分析查看视图
│   │   ├── components/
│   │   │   ├── ActPanel.tsx
│   │   │   ├── SceneCard.tsx
│   │   │   ├── BeatLine.tsx         #   核心组件：单行 beat 编辑器
│   │   │   ├── BeatAction.tsx
│   │   │   ├── BeatDialogue.tsx
│   │   │   ├── BeatParenthetical.tsx
│   │   │   ├── BeatTransition.tsx
│   │   │   ├── BeatFlashback.tsx
│   │   │   ├── BeatInsert.tsx
│   │   │   ├── BeatTitleCard.tsx
│   │   │   ├── CharacterEditor.tsx  #   人物编辑弹窗 (F70-F71)
│   │   │   ├── SceneHeadingEditor.tsx
│   │   │   ├── AiBadge.tsx          #   AI 标记渲染 (F72)
│   │   │   ├── SourceRefTooltip.tsx #   原文引用提示 (F74)
│   │   │   └── BeatToolbar.tsx
│   │   ├── hooks/
│   │   │   ├── useBeatEdit.ts       #   (F67-F68)
│   │   │   ├── useSceneEdit.ts      #   (F69)
│   │   │   ├── useCharacterSync.ts  #   (F71)
│   │   │   ├── useHeadingOverride.ts
│   │   │   └── useUndoRedo.ts       #   (F76)
│   │   └── styles/
│   │       ├── screenplay-print.css
│   │       └── editor-theme.css
│   │
│   ├── analysis/                    # 模块 H：分析工具 (F79-F90)
│   │   ├── tension-curve.ts
│   │   ├── rhythm-report.ts
│   │   ├── character-stats.ts
│   │   ├── relationship-graph.ts
│   │   ├── dialogue-aggregator.ts
│   │   ├── duration-stats.ts
│   │   ├── beat-ratio.ts
│   │   ├── structure-checker.ts
│   │   └── flashback-stats.ts
│   │
│   ├── renderer/                    # 模块 I：渲染导出 (F91-F99)
│   │   ├── index.ts
│   │   ├── final-draft.ts
│   │   ├── pdf.ts
│   │   ├── fdx.ts
│   │   ├── fountain.ts
│   │   ├── html.ts
│   │   ├── txt.ts
│   │   └── watermark.ts
│   │
│   ├── project/                     # 模块 J：项目管理 (F100-F105)
│   │   ├── ProjectManager.tsx
│   │   ├── ProjectStore.ts
│   │   ├── EpisodeManager.tsx
│   │   └── progress-tracker.ts
│   │
│   ├── store/                       # 全局状态（公共）
│   │   ├── index.ts
│   │   ├── scriptStore.ts           #   当前剧本 Screenplay
│   │   ├── planStore.ts             #   当前 AdaptationPlan
│   │   ├── analysisStore.ts         #   当前 NovelAnalysis
│   │   ├── configStore.ts           #   转换配置
│   │   └── editorStore.ts           #   编辑器 UI 状态
│   │
│   ├── shared/                      # 公共工具
│   │   ├── constants.ts             #   枚举值、默认配置
│   │   ├── id-generator.ts          #   character_id/location_id/beat_id 生成
│   │   └── revision-history.ts      #   revision_history 维护 (F77)
│   │
│   └── api/                         # API 层
│       ├── client.ts
│       └── endpoints.ts
│
└── tests/
    ├── parser/                      # 模块 A 测试
    ├── analyzer/                    # 模块 B 测试
    ├── planner/                     # 模块 C 测试
    ├── converter/                   # 模块 D 测试
    ├── yaml-builder/                # 模块 E 测试
    ├── editor/                      # 模块 F 测试
    └── fixtures/                    # 测试数据
        ├── sample-novel-1.txt
        ├── expected-analysis-1.yaml
        ├── expected-plan-1.yaml
        └── expected-screenplay-1.yaml
```

---

## 两人分工（按模块）

### 人 A：模块 A/B/C/D/E/F（数据流 + 分析 + Prompt + API）

| 模块 | 目录 | 功能编号 | 职责 |
|------|------|----------|------|
| Parser 解析器 | `src/parser/` | F1-F6 | 小说文件导入、章节识别、清洗 |
| Analyzer 分析器 | `src/analyzer/` | F7-F18 | 阶段 1：主题/世界观/剧情/人物/章节分析 + 原文段落标注 + Prompt 模板 |
| Planner 规划器 | `src/planner/` | F19-F31 | 阶段 2：改编策略/幕规划/场景大纲/source_context/beat_plan + Prompt 模板 |
| Converter 转换器 | `src/converter/` | F32-F45 | 阶段 3：beat 展开（注入 source_context + beat_plan）/对白/外化/压缩 + Prompt 模板 |
| YamlBuilder | `src/yaml-builder/` | F57-F66 | 三个 Schema 的 YAML 序列化/校验/beat_id 生成/跨阶段一致性/AI 引擎统一 |
| API 层 | `src/api/` | — | 多 Provider AI 接口调用封装（deepseek/openai/anthropic/zhipu/moonshot/custom） + 文件存储 |

### 人 B：模块 G/H/I/J/K（编辑器 + 渲染 + 分析工具 + 项目管理 + 配置）

| 模块 | 目录 | 功能编号 | 职责 |
|------|------|----------|------|
| Editor 编辑器 | `src/editor/` | F67-F78 | 剧本编辑器界面、beat/scene/character 编辑（含 beat-less 支持）、AI 标记高亮、原文对照、撤销重做 |
| Analysis 分析工具 | `src/analysis/` | F79-F90 | 张力曲线/节奏分析/人物统计/关系图/时长统计/结构检查/闪回分析 |
| Renderer 渲染器 | `src/renderer/` | F91-F99 | 标准剧本格式渲染/PDF/FDX/Fountain/HTML/TXT 导出/水印 |
| Project 项目管理 | `src/project/` | F100-F105 | 项目创建/列表/多集管理/进度追踪/存档恢复 |
| Store 全局状态 | `src/store/` | — | 所有 Zustand stores（scriptStore/planStore/analysisStore/configStore/editorStore） |
| Config 配置面板 | `src/config/` | F46-F56 | AI 引擎配置面板/转换参数面板/配置模板管理 |

| 模块 | 目录 | 职责 |
|------|------|------|
| Schema 类型 | `src/schema/` | 三个 Schema 的 TS 类型派生 + ajv 验证封装 |
| ID 生成 | `src/shared/id-generator.ts` | 所有 ID 规则（含 character_id） |
| 修订历史 | `src/shared/revision-history.ts` | revision_history 维护 (F77) |
| 公共常量 | `src/shared/constants.ts` | 枚举值/默认配置/Provider 列表/AI 模型映射 |
| 跨阶段 AI 引擎 | `src/shared/ai-config.ts` | AI 引擎配置读写，确保三阶段共用同一 ai_config |

### 契约 1：共享数据类型（`src/schema/types.ts`）

人 A 从三个 Schema YAML 文件派生 TS 类型，人 B 的所有 store 和组件消费这些类型。**任何 Schema 变更必须先更新类型，双方确认。**

### 契约 2：人 A 导出签名（人 B 调用）

```typescript
// ---- 解析 ----
export function parseNovel(file: File): Promise<ParsedNovel>;

// ---- 阶段 1：分析 ----
export async function analyzeNovel(
  novel: ParsedNovel,
  aiConfig: AiConfig           // ← ai_provider + ai_model + api_base_url
): Promise<NovelAnalysis>;

// ---- 阶段 2：规划 ----
export async function planAdaptation(
  analysis: NovelAnalysis,
  config: ConversionConfig,
  aiConfig: AiConfig           // ← 同源配置
): Promise<AdaptationPlan>;

// ---- 阶段 3：展开 ----
export async function expandBeats(
  plan: AdaptationPlan,
  aiConfig: AiConfig           // ← 同源配置，Prompt 注入 plan.scene_plan[].source_context
): Promise<Screenplay>;

// ---- YAML 序列化 ----
export function toYaml(data: NovelAnalysis | AdaptationPlan | Screenplay): string;
export function fromYaml<T>(yaml: string): T;
export function validate<T>(data: unknown, schemaName: 'novel-analysis' | 'adaptation-plan' | 'screenplay'): ValidationResult;
```

### 契约 3：人 B 的 Store（人 A 的渲染器可读）

```typescript
// src/store/scriptStore.ts
interface ScriptStore {
  screenplay: Screenplay | null;
  setScreenplay: (s: Screenplay) => void;
  updateBeat: (beatId: string, patch: Partial<Beat>) => void;
  insertBeat: (sceneGlobalNumber: number, index: number, beat: Beat) => void;
  deleteBeat: (beatId: string) => void;
  updateScene: (sceneGlobalNumber: number, patch: Partial<Scene>) => void;
  insertScene: (actNumber: number, index: number, scene: Scene) => void;
  deleteScene: (sceneGlobalNumber: number) => void;
  updateCharacter: (characterId: string, patch: Partial<Character>) => void;
  isDirty: boolean;
  markClean: () => void;
}

// src/store/planStore.ts — 同上模式，管理 AdaptationPlan
// src/store/analysisStore.ts — 同上模式，管理 NovelAnalysis
// src/store/configStore.ts — 管理 ConversionConfig + 模板
// src/store/editorStore.ts — 管理 UI 状态（选中 beat、展开的幕、焦点等）
```

---

## 开发工作流

### 分支策略

```
main
├── feat/parser-analyzer    ← 人 A：模块 A+B
├── feat/planner-converter  ← 人 A：模块 C+D
├── feat/editor             ← 人 B：模块 G
├── feat/analysis           ← 人 B：模块 H
├── feat/renderer           ← 人 B：模块 I
└── feat/project            ← 人 B：模块 J
```

- 每人可同时推进多个模块（多分支并行）
- PR 必须另一个人 review 后合并
- 接口契约变更必须双方确认

### 提交规范

```
feat: 新功能        feat(analyzer): 主题分析功能
fix: 修复           fix(editor): beat_id 拖拽排序后未更新
refactor: 重构      refactor(store): 拆分 scriptStore
docs: 文档          docs(CLAUDE): 更新接口契约
test: 测试          test(planner): 场景大纲生成测试
chore: 杂项         chore: 升级 vite 到 v6
```

### PR 规范

**核心原则：一个 PR 只做一件事。**

| 规则 | 说明 |
|------|------|
| **单一职责** | 每个 PR 只实现或修改一项功能；尽可能小、粒度尽可能细 |
| **大功能拆分** | 复杂功能必须拆分为多个独立 PR，分步提交、逐步合并 |
| **主分支可运行** | PR 合并后 `main` 必须保持可运行状态，任意时刻拉取均可复现当前进展 |

**PR 内容要求：**

1. **标题** —— 一句话说明本 PR 新增/修改了什么。格式：`feat(module): 简述` 或 `fix(module): 简述`。
2. **功能描述** —— 说明该功能的作用与使用方式，附必要截图或示例。
3. **实现思路** —— 简要说明技术选型、核心实现逻辑、涉及的模块与文件。
4. **测试方式** —— 如何验证该功能正常运行：操作步骤、预期结果、边界情况。

**Review 规则：**

- 每个 PR 必须至少一个 reviewer 审核通过后方可合并
- 接口契约变更（Schema 类型、导出签名、Store 接口）的 PR 必须双方 reviewer 都确认
- 发现 PR 混杂了无关改动时，reviewer 应要求拆分后重新提交

### 开发顺序（MVP）

```
Phase 1 — 基础设施（两人并行）
  A: src/schema/types.ts 类型派生 + src/shared/id-generator.ts + src/shared/constants.ts + src/shared/ai-config.ts
  B: src/store/ 五个 Store 搭建 + src/config/ 配置模块搭建 + App 路由骨架

Phase 2 — 阶段 1 通路（人 A 主攻）
  A: parser/ → analyzer/ → NovelAnalysis YAML 输出 + 校验
  B: AnalysisView 只读展示 NovelAnalysis

Phase 3 — 阶段 2 通路（人 A 主攻）
  A: planner/ → AdaptationPlan YAML 输出 + 校验
  B: PlanView 可编辑 AdaptationPlan（场景大纲调整）

Phase 4 — 阶段 3 通路 + 编辑器（双方并行）
  A: converter/ → Screenplay YAML 输出
  B: ScriptView + BeatLine 编辑器 + AiBadge (F67-F68-F72-F76)

Phase 5 — 配置 + 导出（双方）
  A: F46+F47 配置项接入 AI 管线
  B: 配置面板 UI + configStore 集成 + PDF 导出 (F93)

Phase 6 — 集成测试
  双方：端到端流程（导入小说 → 分析 → 规划 → 展开 → 编辑 → 导出 PDF）
```

---

## 通用约定

### 代码风格
- TypeScript strict mode
- 函数优先于 class，纯函数优先于有副作用函数
- 文件名：kebab-case（`beat-expander.ts`），组件名：PascalCase（`BeatLine.tsx`）
- 超过 50 行的函数必须拆分
- 导出函数必须有 JSDoc 注释

### 数据流规则
- **parser/analyzer/planner/converter 不 import editor/**（纯数据模块不知道 UI 存在）
- **editor/ 不 import parser/analyzer/planner/converter 的内部文件**，只 import 公开导出
- **Store 是数据桥梁**：editor 写 Store，renderer 读 Store
- Store 中始终是完整对象（NovelAnalysis / AdaptationPlan / Screenplay），不做字段级拆分

### 不要重复实现
- 类型定义：只在 `src/schema/`
- 枚举值：只在 `src/shared/constants.ts`
- ID 生成：只用 `src/shared/id-generator.ts`
- 校验逻辑：只用 `src/schema/validator.ts`
- 渲染逻辑：只在 `src/renderer/`
- Prompt 模板：只在各自模块的 `prompt-templates/` 目录

---

## 关键设计决策（必须遵守）

1. **三 Schema 体系：** 不是一步到位，是 分析→规划→展开 三级流水线。屏幕剧本 scene beats 允许为空以支持中间状态。
2. **character_id 贯穿全流水线：** 阶段 1 分配 character_id（snake_case 拼音），阶段 2 和阶段 3 沿用。不再使用中文姓名作为引用键。
3. **原文上下文不丢失：** raw_passages（阶段 1）→ source_context（阶段 2）→ Prompt 注入（阶段 3）→ source_ref（阶段 3 beat）。三层防漂移，AI 基于原文而非梗概写作。
4. **AI 引擎可配置：** 默认 DeepSeek，支持 openai/anthropic/zhipu/moonshot/custom。三阶段共用同一 ai_config。每个产物记录使用的引擎。
5. **Single Source of Truth：** 人物/地点只在 characters/locations 表定义一次，通过 ID 引用。
6. **Schema 即验证：** 所有条件必填约束在 Schema 中以 `allOf`+`if/then` 表达。
7. **AI 溯源不可省略：** is_ai_generated 必须正确标记，source_ref 必须在源于原著时填写。
8. **beat_id 全局唯一：** `E{集}A{幕}S{场}B{节拍}`，单集固定 E1。
9. **scene_heading_override 规则：** 手动修改 → override=true；修改 location/time_of_day 且 override=false → 自动重新生成。
10. **revision_history 自动维护：** 每次保存追加记录，AI 初始生成为 revision 1。
11. **parenthetical 是独立 beat：** 不作为 dialogue 子字段，渲染器按线性顺序处理。
12. **数据模块零 DOM 依赖：** parser/analyzer/planner/converter 不引入 React/DOM/浏览器 API。
13. **adaptation_plan.scene_plan 字段名 = screenplay.scenes 字段名（不含 beats）：** 阶段 2→3 可直接映射场景元数据，beats 由阶段 3 单独展开。

---

## 参考文件

| 文件 | 用途 | 维护方 |
|------|------|--------|
| `novel-analysis.schema.yaml` | v1.1.0 | 阶段 1 数据标准 | 两人协商 |
| `adaptation-plan.schema.yaml` | v1.1.0 | 阶段 2 数据标准 | 两人协商 |
| `screenplay.schema.yaml` | v1.1.0 | 阶段 3 数据标准（beat-less 场景支持） | 两人协商 |
| `SCHEMA_DESIGN.md` | 三 Schema 设计理由 | 两人协商 |
| `src/schema/types.ts` | TS 类型定义 | 人 A |
| `src/store/` | 所有 Zustand stores | 人 B |
| `src/shared/constants.ts` | 枚举值/默认值 | 两人同步 |
