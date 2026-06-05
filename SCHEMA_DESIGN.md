# AI 剧本创作工具 — Schema 体系设计文档

**体系版本：** v1.0.0
**包含 Schema：** Novel Analysis v1.1.0 / Adaptation Plan v1.1.0 / Screenplay v1.1.0
**适用工具：** AI 小说转剧本工具
**文档性质：** 规范说明 + 设计理由
**最后更新：** 2024-06-05

---

## 目录

0. [三 Schema 体系总览](#0-三-schema-体系总览)
1. [整体流程与阶段对应](#1-整体流程与阶段对应)
2. [Novel Analysis Schema 设计理由](#2-novel-analysis-schema-设计理由)
3. [Adaptation Plan Schema 设计理由](#3-adaptation-plan-schema-设计理由)
4. [Screenplay Schema v1.1.0](#4-screenplay-schema-v110)
   - [4.0 变更摘要](#40-v110-变更摘要)
   - [4.1 设计原则](#41-设计原则)
   - [4.2 整体结构概览](#42-整体结构概览)
   - [4.3 层级设计：为什么是四层](#43-层级设计为什么是四层)
   - [4.4 各模块字段详解](#44-各模块字段详解)
   - [4.5 beat_type 枚举设计理由](#45-beat_type-枚举设计理由)
   - [4.6 ID 系统设计](#46-id-系统设计)
   - [4.7 条件必填约束设计](#47-条件必填约束设计)
   - [4.8 与业界标准的对应关系](#48-与业界标准的对应关系)
   - [4.9 多媒介兼容策略](#49-多媒介兼容策略)
   - [4.10 AI 生成标记与原文溯源机制](#410-ai-生成标记与原文溯源机制)
   - [4.11 扩展与版本演进](#411-扩展与版本演进)
   - [4.12 验证规则速查表](#412-验证规则速查表)
   - [4.13 典型使用场景示例](#413-典型使用场景示例)

---

## 0. 三 Schema 体系总览

本工具不只有一份剧本 Schema，而是三份 Schema 构成完整的数据流水线：

```
┌─────────────────────────────────────────────────────────────┐
│                    novel-analysis.schema.yaml                │
│                         阶段 1 产物                           │
│                                                             │
│  小说导入 → 全面分析                                         │
│                                                             │
│  source_info    小说基本信息                                  │
│  theme_analysis  主题分析                                    │
│  world_building  世界观分析                                  │
│  plot_analysis   剧情分析（主线/暗线/冲突/叙事结构）            │
│  character_analysis  人物分析（动机/弧线/特征/改编适用性）      │
│  chapter_summaries  章节摘要（每章含改编潜力评级）              │
├─────────────────────────────────────────────────────────────┤
│                    adaptation-plan.schema.yaml               │
│                         阶段 2 产物                           │
│                                                             │
│  分析结果 + 用户配置 → 改编规划                                │
│                                                             │
│  adaptation_strategy  改编策略（基调/结构/人物/节奏/外化/压缩）  │
│  episode_plan         幕级规划（幕划分+关键时刻）              │
│  scene_plan[]         所有场景大纲（位置/目的/beat规划）       │
│  characters_draft     人物表初稿（→ Screenplay characters）   │
│  locations_draft      地点表初稿（→ Screenplay locations）    │
├─────────────────────────────────────────────────────────────┤
│                    screenplay.schema.yaml                    │
│                         阶段 3 产物                           │
│                                                             │
│  场景大纲 → beat 级展开 → 完整剧本                            │
│                                                             │
│  metadata       作品元信息（来源/媒介/配置）                    │
│  characters[]   完整人物表                                   │
│  locations[]    完整地点表                                   │
│  acts[] → scenes[] → beats[]  完整四层叙事结构                │
│  production_notes  制作附注                                  │
│  revision_history  修订历史                                  │
└─────────────────────────────────────────────────────────────┘
```

### 为什么是三份 Schema 而不是一份？

**核心原因：AI 不能一步从小说跳到 beat 级剧本，需要分级控制。**

1. **质量可控：** 每一层的输出对人类可读、可编辑。作者在"场景大纲"层可以增删场景、调整顺序、修正 dramatic_function。如果一步生成 50 页 beat，改一个场景级决策的成本是重跑整个转换。

2. **作者信任：** 分级让作者在每个阶段看清楚 AI "做了什么决策、为什么这么做"。一次性输出全部 beat，作者面对海量内容无法判断哪些是 AI 编的、哪些来自原著。

3. **错误隔离：** 如果阶段 2 的场景划分有问题，只需回到 adaptation_plan 修改重新生成；已确认的场景大纲不需要重复生成。

4. **独立复用：** novel_analysis 可以单独使用（"我只想分析这本小说的结构"）；adaptation_plan 可以反复调整参数重生成；screenplay 可以在不重新分析的情况下反复微调 beat。

### 三个 Schema 之间的数据流向

```
novel_analysis.character_analysis[].name
  → adaptation_plan.characters_draft[].name
    → screenplay.characters[].name

novel_analysis.chapter_summaries
  → adaptation_plan.scene_plan[].source_chapter_ref
    → screenplay.acts[].scenes[].source_chapter_ref

adaptation_plan.scene_plan[]
  → screenplay.acts[].scenes[]   (scene_plan 的字段是 scenes 的超集初稿)

adaptation_plan.characters_draft[]
  → screenplay.characters[]      (draft 是 characters 的初始化数据)

adaptation_plan.adaptation_strategy.structural_decisions[]
  → screenplay.production_notes.adaptation_decisions[]
```

---

## 1. 整体流程与阶段对应

工具的核心数据流水线分为三个阶段，每个阶段对应一个 Schema：

```
阶段 1：小说导入与分析     →  novel-analysis.schema.yaml
阶段 2：改编规划           →  adaptation-plan.schema.yaml
阶段 3：剧本生成与编辑     →  screenplay.schema.yaml
```

### 阶段的完整输入输出

| 阶段 | 输入 | 产物 Schema | 核心输出内容 |
|------|------|-------------|-------------|
| 1. 小说导入 | 小说文件（.txt/.docx/.md/.epub） | novel-analysis | 主题分析、世界观分析、剧情分析（主线/暗线/核心冲突）、人物分析、章节摘要 |
| 2. 改编规划 | novel-analysis + 用户配置（媒介/风格/分级） | adaptation-plan | 改编策略、幕划分、分场景大纲（scene_plan）、人物/地点初稿 |
| 3. 剧本生成 | adaptation-plan 的场景大纲 | screenplay | 每个场景的 beat 级展开、完整人物/地点表、元数据、修订历史 |

### 为什么要分级，不一步到位

1. **质量可控：** 场景大纲层让作者在 beat 生成前就能审视结构——增删场景、调整顺序、修正 dramatic_function。改一个场景只需要修改大纲后重新展开该场景，而不是重跑全书转换。
2. **作者信任：** 分级让作者在每个阶段看清 AI "做了什么决策、为什么这么做"。一次性输出全部 beat，作者面对 50 页内容无法分辨哪些是 AI 编的。
3. **错误隔离：** 阶段 2 的场景划分有问题 → 只回到 adaptation_plan 调整，已确认的场景不需要重新生成。
4. **独立复用：** 作者可以只跑阶段 1 研究小说结构，也可以反复调整阶段 2 的参数对比不同改编方案。

### 三个 Schema 之间的数据继承关系

```
novel-analysis.character_analysis[].name
  → adaptation-plan.characters_draft[].name
    → screenplay.characters[].name

novel-analysis.chapter_summaries
  → adaptation-plan.scene_plan[].source_chapter_ref
    → screenplay.acts[].scenes[].source_chapter_ref

adaptation-plan.scene_plan[]（场景大纲）
  → screenplay.acts[].scenes[]（填充为完整场景，展开 beats[]）

adaptation-plan.adaptation_strategy.structural_decisions[]
  → screenplay.production_notes.adaptation_decisions[]
```

---

## 2. Novel Analysis Schema 设计理由

> 文件：`novel-analysis.schema.yaml` v1.0.0

### 2.1 设计目标

一份**站在改编视角**的小说分析报告。不是文学评论，而是回答：这本小说改编成剧本时，哪些元素必须保留、哪些可以删改、哪些需要转化。

### 2.2 五个分析维度

#### theme_analysis（主题分析）

**为什么需要：** 改编不能偏离原著的核心精神。主题是改编的"北极星"——当面临取舍时，保留什么、牺牲什么，以主题为准绳。

字段 `embodied_by` 连接主题到具体人物/事件，让改编者知道"这个主题由哪些场景承载"，避免在删减场景时无意中切断主题表达。

#### world_building（世界观分析）

**为什么需要：** 世界的规则决定剧本的边界。一个有限制性时间约束（倒计时）和空间约束（封闭城市）的故事，和对一个完全开放世界的故事，改编策略完全不同。

字段 `rules_and_constraints` 是改编的硬约束——违反这些规则会破坏故事的内在逻辑。例如"十二时辰倒计时"决定了所有场景必须在时间压力下推进。

#### plot_analysis（剧情分析）

**为什么需要：** 这是改编规划的核心输入。主线、暗线、核心冲突、关键事件时间线——改编者据此决定"保留哪些事件、合并哪些、删除哪些"。

字段 `dramatic_function` 为每个关键事件标注叙事功能（inciting_incident / midpoint / climax），帮助改编阶段判断："删掉这个事件会破坏哪部分故事结构？"

字段 `narrative_structure` 记录原著的叙事特点（线性/非线性、单视角/多视角、特殊叙事技巧），这些需要映射到剧本的线性时间线中。

#### character_analysis（人物分析）

**为什么需要：** 这是最直接影响改编质量的维度。剧本最终是人物驱动的——对白、动作、场景都围绕人物展开。

`importance` 评级是关键设计：
- `essential`：不可删减，必须保留核心戏份
- `major`：重要但可压缩
- `supporting`：功能性角色，可与其他角色合并
- `minor`：可删减或转为背景

`adaptability_notes` 是对改编团队最重要的字段——"该人物的内心独白多（需外化）"、"出场分散（需合并场景）"、"可与其他配角合并"等。

#### chapter_summaries（章节摘要）

**为什么需要：** 为后续的 `source_ref` 溯源提供索引。每个章节的 `paragraph_count` 是段落索引的范围上限，`adaptation_potential`（high/medium/low/skip）帮助改编规划决定各章节的取舍优先级。

##### raw_passages：原文数据管道的起点

**为什么需要：** 这是三层防漂移机制的第一层。阶段 1 如果不能完整传递原文信息，阶段 2 和阶段 3 就无从溯源。

`raw_passages[]` 以段落为粒度存储原文正文，每个段落附带：
- `paragraph`：序号，对应 `source_ref.paragraph`
- `type`：段落类型（dialogue/action/description/narrative/internal_monologue），指导阶段 2 如何分类处理
- `significance`：critical/major/minor，指导阶段 2 决定取舍优先级
- `adaptation_hint`：预判的改编提示，如"此段为内心独白需外化为对白"

阶段 2 的 Planner 从 `raw_passages` 中提取对应的段落，组装成 `source_context`（key_dialogues、key_actions、key_descriptions），阶段 3 的 Converter 将 `source_context` 与 `beat_plan` 一起注入 Prompt。

数据流：
```
novel_analysis.chapter_summaries[].raw_passages[]   (原文全文)
  →  Planner 从中提取对应段落
    →  adaptation_plan.scene_plan[].source_context   (场景级原文片段)
      →  Converter 注入 Prompt
        →  screenplay.beats[]  (基于原文而非凭空生成)
          →  screenplay.beats[].source_ref  (精准溯源到 raw_passages[].paragraph)
```

### 2.3 Novel Analysis 不是 Screenplay 的一部分

Novel Analysis 完全独立于 Screenplay Schema。原因：
- 它是**分析报告**，不是剧本
- 它可能用于非剧本场景（纯小说结构研究）
- 它与特定剧本的一对一关系是通过 `adaptation_plan.source_analysis_ref` 建立的

---

## 3. Adaptation Plan Schema 设计理由

> 文件：`adaptation-plan.schema.yaml` v1.0.0

### 3.1 设计目标

连接"小说分析"和"剧本生成"的桥梁。输入是 AI 分析 + 用户配置，输出是可指导下一阶段 beat 展开的完整规划。

### 3.2 关键设计决策：scene_plan 的粒度

Adaptation Plan 中 `scene_plan[]` 的每个对象定义到**场景大纲**级别，包含：
- 场景位置（scene_global_number / act_number / scene_number）
- 地点和时间（location / time_of_day）
- 叙事目的（synopsis / dramatic_function / tension_level）
- beat 指导（beat_plan：预估节拍数、必须包含的关键节拍、注意事项）

**为什么不到 beat？** 这个粒度正好是"作者用肉眼判断结构是否合理"的级别——场景编号对不对、高潮位置偏不偏、少了某类情绪场景。同时 `beat_plan.key_beats[]` 给了下一阶段 AI 展开 beat 时的足够指引。

### 3.3 adaptation_strategy 设计

这是三个 Schema 中**最"非结构化"但最重要的模块**。改编策略本质上是自然语言决策记录，不能被严格的枚举值完全捕获。因此：
- `decision / rationale / impact` 三元组提供了半结构化框架
- `affected_characters` 和 `affected_chapters` 使决策可追溯到具体人物和情节
- 这些决策最终流入 Screenplay 的 `production_notes.adaptation_decisions[]`

### 3.4 outward 映射设计

`scene_plan[]` 中场景对象的字段名与 Screenplay Schema 中 `scenes[]` 的字段名一致。这意味着：
- 阶段 3 的生成器可以直接复制 scene_plan → scenes（不包含 beats）
- 然后在每个场景内调用 beat 展开
- 如果作者调整了 scene_plan 中的某个字段（如 dramatic_function），它可以直接覆盖到最终的 Screenplay 中

同样的映射也存在于 `characters_draft[]` → Screenplay `characters[]` 和 `locations_draft[]` → Screenplay `locations[]`。

### 3.5 source_context：防止"传话游戏"式漂移

分级架构的固有风险：阶段 1→2→3，每一层都在抽象。到阶段 3 beat 展开时，AI 的输入如果只有 `scene_plan.synopsis`（一句话）和 `beat_plan.key_beats[].description`（更短的一句话），它看不到原文。这会导致逐层漂移——最后生成的 beat 可能与原著毫无关系。

`s-source_context` 在 Adaptation Plan 的每个场景中存储"该场景对应的原著原文关键片段"：

- `summary`：比 synopsis 更详细的原文概述，准确还原情节细节
- `key_dialogues[]`：原著中该段的实际对白原文，带上下文说明。AI 基于原文改写，而非凭空编造
- `key_actions[]`：原著中该段的关键动作描写。AI 可以直接改编为 action beat
- `key_descriptions[]`：原著中该段的环境/气氛描写。AI 可以压缩改编为 action beat 的布景部分
- `adaptation_notes`：针对该场景的改编注意事项（内心独白外化方式、压缩策略等）

阶段 3 beat 展开时，这个完整的 `source_context` 对象连同 `beat_plan` 一起注入 Prompt。AI 的输出不再是"基于一句话梗概编造"，而是"基于原文片段改编"。

### 3.6 beat_plan 的设计

`beat_plan` 不是完整的 beats[]，而是一个轻量级的"指导说明"：
- `estimated_beat_count`：帮助判断展开结果是否合理（实际 beat 数不应偏差太多）
- `key_beats[]`：规定场景中必须包含的关键节拍及其顺序
- `notes`：自由文本的场景级展开指导
- `from_source`：标记该关键 beat 是否来自原著（影响 `is_ai_generated` 的反值）

这个设计在"给 AI 足够自由度"和"给作者足够控制力"之间取得平衡。作者可以在不编写实际对白的情况下，规定"这个场景必须有一个张小敬反问李泌的对白节拍作为第 4 个 beat"。

---

## 4. Screenplay Schema v1.1.0

> 文件：`screenplay.schema.yaml` v1.1.0

### 4.0 v1.1.0 变更摘要

相对于 v1.0.0，v1.1.0 包含以下变更：

| 变更类型 | 变更内容 | 原因 |
|----------|----------|------|
| **修复** | `beat_id` 增加集号前缀，改为 `E{集}A{幕}S{场}B{节拍}` | 多集场景下原格式不唯一 |
| **新增** | `beat_type` 增加 `flashback_start` / `flashback_end` | 闪回需结构化起止标记 |
| **新增** | `beat.estimated_duration_seconds` | 时长估算粒度下降到 beat 级 |
| **新增** | `beat.source_ref` 结构化引用 | 支持点击跳转原著位置 |
| **新增** | `beat.music_cue` | 正式纳入音乐节点字段 |
| **新增** | `scene.scene_heading_override` | 解决手动覆盖与自动生成冲突 |
| **新增** | `scene.continuity_notes` | 接景连续性注释 |
| **新增** | `revision_history` | 版本追溯和协作编辑 |
| **新增** | `beats.items.allOf` 条件必填约束 | Schema 即验证 |
| **修复** | `first_appearance.scene_number` → `scene_global_number` | 消除命名歧义 |
| **兼容** | v1.0.0 字段全部保留 | 向后兼容，旧文件可被新工具读取 |

### 4.1 设计原则

#### P1：可编辑优先于可阅读

Schema 的第一用途是作者的"可编辑初稿"，而非最终印刷格式。每个字段都必须是人类可直接理解和修改的。因此：

- 所有枚举值使用英文小写（避免中文值在不同编辑器下的编码问题）
- 对话文本（`dialogue_text`）不加任何标点注释——括注单独存为 `parenthetical` 节拍
- 所有字段名均为语义明确的英文，中文仅出现在值字段中

#### P2：单一数据源（Single Source of Truth）

人物信息只定义一次（`characters` 表），在场景中通过 `character_id` 引用。地点同理。这避免了"人物改名后需要全局搜索替换"的问题，也方便后续工具（如人物关系图生成器）直接消费此 Schema。

#### P3：结构对应行业标准

Schema 层级直接映射最广泛使用的剧本格式规范（WGA/Final Draft 标准），使输出可被主流剧本软件（Final Draft、Celtx、WriterSolo）理解，降低作者的迁移成本。

#### P4：AI 生成内容可溯源

所有 AI 新增或推断的内容通过 `is_ai_generated: true` 标记。同时通过 `source_ref`（结构化引用）和 `source_text_ref`（人类可读摘要）双轨制，使作者能清楚区分"原著内容"和"AI 补充内容"。

#### P5：媒介无关的核心 + 媒介特定的扩展

核心层级（acts/scenes/beats）对所有媒介通用；媒介差异通过 `target_medium` 字段驱动渲染器的差异化输出。

#### P6：Schema 即验证（v1.1.0 新增）

所有条件必填约束必须在 Schema 文件中以 `allOf` + `if/then` 表达，使 JSON Schema 验证器可直接检查规则。

---

### 4.2 整体结构概览

```
screenplay
├── schema_version              # 版本锁定（semver）
├── revision_history[]          # 修订历史（v1.1.0 新增）
├── metadata                    # 作品元信息（来源、媒介、配置）
├── characters[]                # 全局人物表（Single Source of Truth）
├── locations[]                 # 全局地点表（可选）
├── acts[]                      # 叙事层级根节点
│   └── scenes[]
│       ├── beats[]             # 最小叙事单元（含条件必填约束）
│       └── ...场景元数据
└── production_notes            # 制作附注（不影响结构）
```

**为什么不用更扁平的结构？**

扁平结构（如只有 `scenes[]` 不分幕）在单一剧本文件中没有问题，但当剧本需要多幕分析（节奏分布、幕间张力对比）时，扁平结构需要遍历所有场景才能得到幕级信息。分层结构使工具可以在任意粒度操作数据。

---

### 4.3 层级设计：为什么是四层

```
schema_version / metadata / characters / locations
        ↓
      acts          ← 叙事大节奏单位（幕）
        ↓
     scenes         ← 时空连续单位（场景）
        ↓
     beats          ← 不可再分的叙事动作（节拍）
```

### 幕（Act）

对应经典三幕式或二幕式结构。是节奏分析的单位——"第一幕用了多少分钟"、"高潮在哪一幕"。对于单集电视剧，全集通常是一幕，内含若干场景。

**为什么不省略幕层级直接写场景？** 省略幕层级意味着多幕剧本（电影、舞台剧）需要用约定俗成的 `act_number` 字段嵌入场景，破坏了数据的层级清晰性。保留幕层级使剧本结构工具（如自动节奏分析）无需解析场景才能理解幕边界。

### 场景（Scene）

对应剧本中的一个场景头（Scene Heading）。定义规则：**同一个时间、同一个地点的连续动作**属于同一场景。时间或地点的跳跃意味着新场景。

`scene_global_number` 和 `scene_number` 并存的原因：前者用于跨幕引用和剧本打印格式（每个场景头标注全局场景号），后者用于幕内相对定位（"第二幕第三场"）。

### 节拍（Beat）

这是 Schema 设计中最关键的决策。Beat 是**单次语义动作**——一段对白、一个动作描写、一次转场指示。它不是"段落"，也不是"镜头"。

**为什么要细化到 beat 而不是把整个场景内容存为一个文本块？**

- 结构化的 beat 可以被工具统计（"这个场景有多少对白节拍 vs 动作节拍"）
- 每个 beat 可以独立被 AI 重写（"帮我重写 E1A1S3B7 这段对白"）
- 人物对白通过 `character_id` 与人物表关联，使"查找张小敬所有台词"成为简单查询
- beat_type 枚举对应标准剧本格式中的不同元素，使渲染器可以正确格式化输出

---

### 4.4 各模块字段详解与设计理由

#### schema_version

```yaml
schema_version: "1.1.0"
```

**设计理由：**
Schema 会演进。当工具升级 Schema 时（如新增字段、修改枚举），存量的 YAML 文件需要知道自己符合哪个版本的 Schema，才能正确被旧版/新版工具处理。采用 semver（major.minor.patch）：

- `major` 变更：破坏性变更（删除字段、修改层级），需要迁移脚本
- `minor` 变更：新增可选字段，向后兼容
- `patch` 变更：文档修正，不影响数据结构

#### revision_history

```yaml
revision_history:
  - revision_number: 1
    timestamp: "2024-06-05T10:30:00+08:00"
    author: "AI"
    change_summary: "AI 初始生成，覆盖原著第1-2章"
  - revision_number: 2
    timestamp: "2024-06-05T14:20:00+08:00"
    author: "张三"
    change_summary: "重写第一幕高潮对白"
    changed_beats: ["E1A1S3B2", "E1A1S3B3"]
```

**设计理由（v1.1.0 新增）：**
剧本是迭代打磨的产物。一个剧本从 AI 初稿到终稿可能经历数十次修改。`revision_history` 提供：

1. **审计追溯：** 知道"是谁在什么时间改了什么"
2. **版本对比：** `changed_beats` 让工具可以只对比变更的节拍，而非全文 diff
3. **回退锚点：** 作者可以根据 revision_number 回退到任意历史版本
4. **协作透明：** 多人编辑时清楚各自的修改范围

`changed_beats` 是可选的增量信息——全量保存时可以不填（摘要中说明即可），精确修改时建议填写（用于 diff 加速和精准回退）。

#### metadata（元数据）

#### target_medium

```yaml
target_medium: "tv_series"  # film | tv_series | web_series | stage_play | audio_drama
```

**设计理由：** 不同媒介对剧本格式有实质差异。电影场景头格式与舞台剧不同；舞台剧需要换景指示；广播剧无视觉动作只有声音。`target_medium` 是渲染器的"模式开关"，决定哪些字段会被输出到最终打印格式中。Schema 本身不因媒介不同而变更，渲染逻辑处理差异。

#### conversion_config

```yaml
conversion_config:
  dialogue_density: "balanced"
  prompt_version: "1.2.0"
  ai_model: "claude-sonnet-4"
```

**设计理由：** 作者可能对同一段小说尝试不同配置（稀疏对白 vs 密集对白）。将配置记录在 YAML 中，使每个文件都携带"这份剧本是如何生成的"的信息，便于：
1. 对比不同配置的输出质量
2. 重现某次高质量的转换结果
3. Bug 排查（"为什么这次输出格式不对"）

#### source_chapters

```yaml
source_chapters:
  start_chapter: 1
  end_chapter: 3
  chapter_titles: ["第一章 困局", ...]
```

**设计理由：** 一集剧本通常对应原著若干章节。记录章节范围使作者在审校时能快速定位原文，也使工具在追加转换时知道"已处理到第几章"。

#### characters（人物表）

#### 为什么要有全局人物表，而不是在场景中直接写人名？

场景中存储的是行为（beats），人物信息是对行为者的描述。二者是不同关注点。将人物集中管理有以下优势：

1. **改名不崩溃：** 修改 `characters` 中的 `name`，所有引用该 `character_id` 的场景自动更新显示名
2. **人物分析：** "统计张小敬出场的所有场景"通过遍历 beats 的 `character_id` 字段即可完成
3. **人物弧线管理：** `arc` 字段让编辑可以在全局角度审视人物成长

#### character_id 的命名规范

```yaml
character_id: "zhang_xiaojing"  # snake_case，拼音或英文
```

选择 snake_case 拼音的原因：中文人名直接作为 ID 在某些 YAML 解析器和编程语言中会引发编码问题（尤其是作为 dict key 时）。拼音 snake_case 在技术层面最安全，同时通过 `name` 字段保留中文显示名。

#### relationships 设计

关系只记录"直接关系"，不冗余。张小敬和李泌的关系只在其中一人的 `relationships` 中记录一次（通常在戏份更重的角色条目下），而不是双向都记录（避免数据不一致）。

#### first_appearance 设计

v1.1.0 中，`first_appearance` 使用 `scene_global_number`（全局场景号）而非 v1.0.0 中的 `scene_number`（幕内场景号）。原因：

- `scene_number` 离开幕号上下文就没有意义（"第 3 场"不知道是哪一幕）
- `scene_global_number` 是全局唯一的场景标识，可以直接定位到具体场景
- 配合 `act_number`，仍然可以表达"第 1 幕第几个场景"

#### locations（地点表）

`locations` 是**可选模块**，适用于地点复杂、多次复用的剧本。对于简单剧本，场景的 `location.name` 直接写字符串即可，无需提前定义 `locations` 表。

#### parent_location_id

```yaml
- location_id: "jing_an_si_hall"
  parent_location_id: "jing_an_si"
```

支持地点层级（靖安司大堂 → 靖安司 → 长安城），便于美术部门按"大场景"组织拍摄计划。

#### acts → scenes → beats（叙事层级）

#### scene 的 scene_heading_override（v1.1.0 新增）

```yaml
scene_heading: "INT. 靖安司大堂 — 夜"
scene_heading_override: false   # false = 自动生成, true = 手动编写
```

**设计理由：** v1.0.0 中 `scene_heading` 文档写"由工具自动组合生成，也可手动覆盖"，但没有区分机制。当用户手动修改 `scene_heading` 后，如果再修改 `location.name` 或 `time_of_day`，工具无法判断应该"重新自动生成"还是"保留手动编辑"。

`scene_heading_override` 解决这个冲突：
- `false`（默认）：工具每次读取 YAML 时，根据 `location` + `interior_exterior` + `time_of_day` 重新组合 `scene_heading`
- `true`：用户手动编写了此值，工具不得覆盖，即使 `location` 或 `time_of_day` 已变更

#### scene 的 dramatic_function

```yaml
dramatic_function: "inciting_incident"
```

**设计理由：** 这是给编辑/编剧顾问使用的结构分析辅助字段，不出现在最终印刷稿中。当 AI 转换完成后，工具可以扫描所有场景的 `dramatic_function`，自动生成"结构分析报告"：

- 是否有明确的激励事件？
- 高潮场景在全剧的位置是否合理（约 80% 处）？
- 是否有足够的人物时刻平衡动作场景？

#### tension_level

```yaml
tension_level: 4  # 1-5
```

**设计理由：** 1-5 的张力值使工具可以绘制"剧本张力曲线"——展示全集的情绪起伏走势。好的剧本应该呈现有节奏的波峰波谷，而不是持续高张力（令人疲劳）或持续低张力（令人昏睡）。

#### estimated_duration_seconds（场景级）

```yaml
estimated_duration_seconds: 195
```

**设计理由：** v1.1.0 中，场景级时长现在由其下所有 beat 的 `estimated_duration_seconds` 之和计算得出（而非独立估算）。这使时长估算更加精确和透明——如果总时长不合理，作者可以 drill-down 到具体的 beat 级别查看哪个节拍被估长了。

#### continuity_notes（v1.1.0 新增）

```yaml
continuity_notes: "注意：张小敬左臂在此场景中已受伤，下一场景需保持血迹位置一致"
```

**设计理由：** 剧本中常存在跨场景的连续性要求——角色在场景 3 撕破了衣服，场景 5 中同一件衣服应该有破损。在剧本数据中记录接景连续性，使场记/服装/化妆部门在拍摄准备时可以据此检查。此字段原规划在 v1.2.0，因与场景关联系数高，提前纳入 v1.1.0。

#### beats 的条件必填约束（v1.1.0 新增）

在 Schema 文件中使用 `allOf` + `if/then` 表达以下规则：

| beat_type | 必填字段 |
|-----------|----------|
| `dialogue` / `voice_over` / `off_screen` | `character_id`, `dialogue_text` |
| `action` | `action_text` |
| `parenthetical` | `character_id`, `parenthetical_text` |
| `transition` | `transition_type` |
| `title_card` | `title_card_text` |
| `insert` | `insert_description` |
| `flashback_start` | `flashback_label` |

**设计理由：** v1.0.0 中这些约束仅在文档中描述，Schema 文件本身无法表达。v1.1.0 使用 JSON Schema Draft-07 的 `if/then` 机制，使验证器可以直接检查条件必填约束，减少了"文档说必填但验证器不检查"的落差。

---

### 4.5 beat_type 枚举设计理由

```
action | dialogue | parenthetical | transition | title_card |
voice_over | off_screen | montage_start | montage_end |
flashback_start | flashback_end | insert
```

每个枚举值对应标准剧本格式中的一种视觉元素：

| beat_type | 剧本格式对应 | 设计理由 |
|---|---|---|
| `action` | 动作行（左边距对齐，全宽） | 最基础的剧本元素，描述可见行为 |
| `dialogue` | 对白行（居中，缩进） | 与 action 分离存储，确保人物 ID 可关联 |
| `parenthetical` | 括注行（居中，缩进，括号内） | 单独节拍而非嵌入对白，原因：括注是对"下一段对白"的修饰，需要独立存在才能正确渲染在人名下方、对白上方 |
| `transition` | 转场行（右对齐） | 独立枚举使渲染器可以正确格式化（右对齐、全大写） |
| `title_card` | 字幕卡 | 影视剧常用，舞台剧不用；独立节拍使渲染器按媒介选择是否输出 |
| `voice_over` | VO（画外音，角色不在场） | 与 `off_screen` 区分：VO 通常是回忆/独白，OS 是角色在画面外 |
| `off_screen` | OS（画外音，角色在场） | 见上 |
| `montage_start/end` | 蒙太奇段落标记 | 蒙太奇是特殊的叙事结构，用开始/结束节拍包裹其中的 action beats |
| `flashback_start/end` | 闪回段落标记（v1.1.0 新增） | 与蒙太奇同理：闪回需要结构化起止标记。`flashback_start` 必填 `flashback_label`，供渲染时输出 SUPERTITLE（如 SUPER: "三年前"） |
| `insert` | 插入镜头 | 特写某一物品的独立镜头，不属于常规 action 描写 |

**为什么 `parenthetical` 是独立节拍而不是 dialogue 的子字段？**

括注在剧本格式中有严格的视觉位置要求（必须在人名下方、对白上方），且一段对白前可以有多个括注。如果嵌入 dialogue 节拍，渲染器需要解析内嵌结构；作为独立节拍，渲染器只需按顺序处理节拍序列即可。

**为什么新增 `flashback_start` / `flashback_end`？**

v1.0.0 中，要表示闪回，只能用 action beat 描述"闪回开始"和"闪回结束"，渲染器无法识别闪回段落的边界从而添加 SUPERTITLE 标注。新增成对的 beat_type 后，渲染器可以：
- 在 `flashback_start` 处自动插入 SUPER: 标注
- 对闪回段落内的场景应用不同的视觉风格（如漂白、柔光等摄影建议）
- 在结构分析工具中统计闪回段落的时长和频率

---

### 4.6 ID 系统设计

Schema 中有三类 ID：

### character_id

```
格式：snake_case 字符串
示例：zhang_xiaojing, li_bi, xu_bin
规则：^[a-z][a-z0-9_]*$
```

### location_id

```
格式：与 character_id 相同
示例：jing_an_si, daming_palace, west_market
```

### beat_id（v1.1.0 修订）

```
v1.0.0 格式：A{幕号}S{场景全局号}B{节拍序号}
v1.1.0 格式：E{集号}A{幕号}S{场景全局号}B{节拍序号}
示例：E1A1S3B7（第1集，第1幕，第3个全局场景，第7个节拍）
规则：^E\d+A\d+S\d+B\d+$
```

**为什么 v1.1.0 增加了 E 前缀？**

v1.0.0 的 beat_id 格式 `A1S1B1` 在单集剧本内是唯一的，但在多集电视剧中会产生冲突——第 1 集和第 5 集都有 `A1S1B1`。如果需要跨集引用（如全剧人物分析、跨集节奏对比），ID 必须全局唯一。

E 前缀使用 `episode_info.episode_number`，对于电影（无集号概念）则固定为 `E1`。

**beat_id 的编码设计：** 包含位置信息的 ID 使得跨文件引用成为可能（如"请 AI 重写 E1A1S3B7"），也便于在工具界面上定位任意节拍。

---

### 4.7 条件必填约束设计

v1.1.0 的核心改进之一是使用 JSON Schema 的 `if/then` 机制将条件必填约束从文档迁移到 Schema 文件中。

### 设计动机

在 v1.0.0 中，以下约束仅在文档中声明：

- "beat_type 为 dialogue 时，character_id 和 dialogue_text 必填"
- "beat_type 为 action 时，action_text 必填"
- 等等

这意味着运行 `jsonschema.validate()` 时，即使一个 dialogue beat 缺少 `character_id`，验证也会通过——违反了"Schema 即验证"的原则。

### 实现方式

在 `beats.items` 下增加 `allOf` 数组，每个条目是一个 `if/then` 条件约束：

```yaml
allOf:
  - if:
      properties:
        beat_type:
          enum: [dialogue, voice_over, off_screen]
      required: [beat_type]
    then:
      required: [character_id, dialogue_text]

  - if:
      properties:
        beat_type:
          const: action
      required: [beat_type]
    then:
      required: [action_text]

  # ... 其他约束类似
```

**注意：** JSON Schema 的 `if/then` 在使用 `required` 时，如果 `if` 中的属性不存在，`if` 结果为 `false`，然后 `then` 会被跳过（不会报错说缺少字段）。这就是为什么 `if` 中需要 `required: [beat_type]`——确保 beat_type 存在后再做条件判断；如果 beat_type 不存在，beat 本身的 required 约束（`required: [beat_id, beat_type]`）会先在顶层报错。

### 约束一览

| beat_type | 条件必填字段 | 原因 |
|-----------|-------------|------|
| `dialogue` / `voice_over` / `off_screen` | `character_id`, `dialogue_text` | 需要知道谁说 + 说了什么 |
| `action` | `action_text` | 动作描写的核心内容 |
| `parenthetical` | `character_id`, `parenthetical_text` | 需要知道谁会做出这个表情/动作 |
| `transition` | `transition_type` | 需要知道具体转场方式 |
| `title_card` | `title_card_text` | 需要知道显示什么文字 |
| `insert` | `insert_description` | 需要描述特写内容 |
| `flashback_start` | `flashback_label` | 需要知道闪回段落的标识 |

---

### 4.8 与业界标准的对应关系

| Schema 概念 | 行业术语 | Final Draft 元素 | WGA 格式规范 |
|---|---|---|---|
| `act` | Act | — | 幕（Fadeout 前后分隔） |
| `scene` | Scene | Scene Heading | INT./EXT. 开头的场景头 |
| `scene_heading` | Slug Line | Scene Header | 格式：INT/EXT. 地点 — 时间 |
| `beat: action` | Action Line | Action | 动作行 |
| `beat: dialogue` | Dialogue | Dialogue | 居中缩进对白 |
| `beat: parenthetical` | Parenthetical | Parenthetical | (括注) |
| `beat: transition` | Transition | Transition | CUT TO: 等 |
| `beat: voice_over` | Voice Over | Extension (V.O.) | 角色名后的 (V.O.) |
| `beat: off_screen` | Off Screen | Extension (O.S.) | 角色名后的 (O.S.) |
| `beat: flashback_start` | Flashback / SUPER | — | 闪回标注，SUPERTITLE |
| `beat: insert` | Insert Shot | — | 插入镜头 |

---

### 4.9 多媒介兼容策略

Schema 本身对所有媒介**通用**。渲染器根据 `metadata.target_medium` 决定差异化处理：

| 字段/节拍 | film | tv_series | stage_play | audio_drama |
|---|---|---|---|---|
| `title_card` 节拍 | 输出 | 输出 | 不输出（改为舞台说明） | 不输出 |
| `camera_suggestion` | 可保留 | 可保留 | 不输出 | 不输出 |
| `insert` 节拍 | 输出 | 输出 | 不输出 | 不输出 |
| `location.interior_exterior` | INT./EXT. | INT./EXT. | 不输出（用地点名） | 不输出 |
| `beat: action` | 完整输出 | 完整输出 | 转换为舞台动作说明 | 转换为音效/旁白说明 |
| `beat: flashback_start` | 输出 SUPER + 视觉提示 | 同电影 | 输出灯光变化说明 | 输出音效过渡 + 旁白说明 |
| `beat: parenthetical` | 输出 | 输出 | 输出 | 转换为语气旁白 |

---

### 4.10 AI 生成标记与原文溯源机制

### 双轨制溯源设计

v1.1.0 引入了双轨原文溯源：

#### 轨道一：结构化引用 `source_ref`（工具消费）

```yaml
source_ref:
  chapter: 1
  paragraph: 3
  excerpt: "他的眼睛扫过大堂四壁，停在一处不起眼的标记上。"
```

用途：工具实现"点击跳转到原著对应段落"、自动对比原文与改编文本。

#### 轨道二：人类可读摘要 `source_text_ref`（人类消费）

```yaml
source_text_ref: "原文：'他的眼睛扫过大堂四壁，停在一处不起眼的标记上。'"
```

用途：在 YAML 编辑器中直接显示，作者无需离开编辑器即可核对。

**为什么两条轨道并存而不是二选一？**

- `source_ref` 是结构化的，适合工具消费（跳转、校验、对比），但对人类来说阅读 YAML 中的结构化字段不直观
- `source_text_ref` 是自由文本，适合人类快速扫读，但无法被工具解析出"第几章第几段"
- 两条轨道互补，各自服务于不同的消费角色

### is_ai_generated 标记

```yaml
is_ai_generated: true   # 默认值，表示此节拍由 AI 生成
is_ai_generated: false  # 表示此节拍内容直接来自原著
```

**设计逻辑：** 小说转剧本不是逐句翻译，AI 必然会：

1. **新增连接性对白**（原著两段动作描写之间，AI 补充过渡对话）
2. **外化心理活动**（原著的心理描写变成对白或表情动作）
3. **压缩非核心叙述**（多段原著描写压缩为一个动作节拍）

`is_ai_generated: false` 专门标记"这段台词/动作在原著中有明确对应"的节拍，帮助作者在审校时快速确认关键内容是否被准确还原。

配合 `source_ref` 和 `source_text_ref`，作者可以在不打开原著的情况下，在 YAML 内直接核对改编准确性。

### 溯源信息的存储策略

不是每个 beat 都需要填写 `source_ref` 和 `source_text_ref`。推荐策略：

- `is_ai_generated: false` 的 beat **应**填写溯源信息（因为来源于原著）
- `is_ai_generated: true` 的 beat **可**填写溯源信息（如基于哪段原文做的外化改写）
- transition / title_card 等纯格式 beat 可以不填

---

### 4.11 扩展与版本演进

### 当前版本不包含的内容（有意留空）

- **镜头/分镜（Shot list）：** 属于导演工作阶段，不在编剧 Schema 范围内。`camera_suggestion` 是非正式的创作参考，不是镜头表。
- **预算/制作信息：** 属于制片阶段。
- **演员绑定：** 选角属于制作阶段，`characters` 中只记录角色，不记录演员。

### 版本路线图

| 版本 | 计划新增 |
|---|---|
| v1.0.0 | 初始版本 |
| **v1.1.0（当前）** | `flashback_start/end`、`revision_history`、`beat.estimated_duration_seconds`、`beat.music_cue`、`beat.source_ref`、`scene.scene_heading_override`、`scene.continuity_notes`、条件必填约束、beat_id 增加 E 前缀 |
| v1.2.0 | `metadata.translations[]` 多语言版本支持、`characters.pronouns` 代词偏好 |
| v2.0.0 | 多季/系列管理、非线性叙事支持（跳跃时间线）、分镜表扩展 |

### 向后兼容承诺

- **v1.x.x 版本**：不删除任何 required 字段，不修改任何枚举值的语义
- **v2.0.0 版本**：允许破坏性变更，但提供迁移工具和文档

---

### 4.12 验证规则速查表

| 字段 | 类型 | 必填 | 约束 |
|---|---|---|---|
| `schema_version` | string | ✅ | 符合 `\d+\.\d+\.\d+` |
| `revision_history` | array | ❌ | 每项含 revision_number、timestamp、change_summary |
| `metadata.title` | string | ✅ | 1-200 字符 |
| `metadata.target_medium` | enum | ✅ | 见枚举列表 |
| `metadata.language` | string | ✅ | BCP-47 格式 |
| `metadata.generated_at` | string | ✅ | ISO 8601 date-time |
| `characters[].character_id` | string | ✅ | `^[a-z][a-z0-9_]*$`，全局唯一 |
| `characters[].role_type` | enum | ✅ | 见枚举列表 |
| `characters[].first_appearance.scene_global_number` | integer | ❌ | ≥ 1 |
| `acts[].act_number` | integer | ✅ | ≥ 1 |
| `scenes[].scene_global_number` | integer | ✅ | ≥ 1，全剧唯一 |
| `scenes[].scene_heading_override` | boolean | ❌ | 默认 false |
| `scenes[].tension_level` | integer | ❌ | 1-5 |
| `scenes[].estimated_duration_seconds` | integer | ❌ | ≥ 1 |
| `beats[].beat_id` | string | ✅ | `^E\d+A\d+S\d+B\d+$`，全剧唯一 |
| `beats[].beat_type` | enum | ✅ | 见枚举列表 |
| `beats[].estimated_duration_seconds` | integer | ❌ | ≥ 1 |
| `beats[].character_id` | string | 条件必填 | beat_type 为 dialogue/voice_over/off_screen/parenthetical 时必填，且须存在于 characters 表 |
| `beats[].dialogue_text` | string | 条件必填 | beat_type 为 dialogue/voice_over/off_screen 时必填 |
| `beats[].action_text` | string | 条件必填 | beat_type 为 action 时必填 |
| `beats[].parenthetical_text` | string | 条件必填 | beat_type 为 parenthetical 时必填 |
| `beats[].transition_type` | enum | 条件必填 | beat_type 为 transition 时必填 |
| `beats[].title_card_text` | string | 条件必填 | beat_type 为 title_card 时必填 |
| `beats[].insert_description` | string | 条件必填 | beat_type 为 insert 时必填 |
| `beats[].flashback_label` | string | 条件必填 | beat_type 为 flashback_start 时必填 |
| `beats[].is_ai_generated` | boolean | ❌ | 默认 true |
| `beats[].source_ref.chapter` | integer | ❌ | ≥ 1 |
| `beats[].source_ref.paragraph` | integer | ❌ | ≥ 1 |
| `production_notes.adaptation_decisions` | array | ❌ | 每项含 decision + rationale |

---

### 4.13 典型使用场景示例

### 场景 A：AI 工具批量转换

```python
# 工具读取转换配置
config = yaml["metadata"]["conversion_config"]

# 遍历所有场景
for act in yaml["acts"]:
    for scene in act["scenes"]:
        for beat in scene["beats"]:
            if beat["beat_type"] == "dialogue":
                render_dialogue(
                    character=get_character(beat["character_id"]),
                    text=beat["dialogue_text"],
                    medium=yaml["metadata"]["target_medium"]
                )
            elif beat["beat_type"] == "flashback_start":
                render_flashback_super(beat["flashback_label"])
```

### 场景 B：作者审校 AI 生成内容

```bash
# 查找所有 AI 新增节拍
grep -n "is_ai_generated: true" screenplay.yaml

# 查找张小敬所有台词
grep -A3 'character_id: "zhang_xiaojing"' screenplay.yaml | grep dialogue_text

# 查找所有闪回段落
grep -n "flashback_start\|flashback_end" screenplay.yaml

# 查看修订历史
grep -A5 "revision_history" screenplay.yaml
```

### 场景 C：节奏分析工具

```python
# 绘制全集张力曲线
scenes = [s for act in yaml["acts"] for s in act["scenes"]]
tension_curve = [
    (s["scene_global_number"], s.get("tension_level", 0))
    for s in scenes
    if "tension_level" in s
]
# → 可视化输出，检查张力分布是否合理

# 按 beat 统计时长
total_duration = sum(
    b.get("estimated_duration_seconds", 0)
    for act in yaml["acts"]
    for scene in act["scenes"]
    for b in scene["beats"]
)
print(f"预估总时长: {total_duration // 60} 分钟")
```

### 场景 D：闪回段落分析

```python
# 统计所有闪回段落的时长和频次
flashback_duration = 0
in_flashback = False
for beat in all_beats:
    if beat["beat_type"] == "flashback_start":
        in_flashback = True
        print(f"闪回: {beat.get('flashback_label', '未标注')}")
    elif beat["beat_type"] == "flashback_end":
        in_flashback = False
    elif in_flashback:
        flashback_duration += beat.get("estimated_duration_seconds", 0)
```

### 场景 E：版本对比

```python
# 对比两个修订版本之间的差异
rev1_beats = get_beats_by_revision(yaml, revision_number=2)
rev2_beats = get_beats_by_revision(yaml, revision_number=3)

changed = set(rev1_beats.keys()) ^ set(rev2_beats.keys())
for beat_id in changed:
    print(f"修改: {beat_id}")
```

### 场景 F：渲染为 Final Draft 格式

```
INT. 靖安司大堂 — 夜
                                                              1

张小敬被带入靖安司大堂。脚镣声在大理石地面上回响。

                              李泌
          长安城今夜有危险。我需要你帮我找到那批人。

                           张小敬
                    （停顿，打量李泌）
          你凭什么觉得，我会帮你？

                                                      CUT TO:
```

---

*本文档随 Schema 版本同步更新。如有字段设计疑问，请提 issue 或联系维护团队。*
