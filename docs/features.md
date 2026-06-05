# 功能点清单

> 从 CLAUDE.md 提取，避免占用主引导文件上下文。功能编号（F1-F114）贯穿全项目。

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
