# 目录结构

> 从 CLAUDE.md 提取。TypeScript 全栈项目，`src/` 统一包含前端 UI 模块和后端数据流水线模块。

---

```
/aiscript
├── CLAUDE.md                         # 项目引导文件
├── docs/                             # 详细参考文档
│   ├── features.md                   #   完整功能点清单（114项 + MVP + 分期）
│   ├── directory-structure.md        #   本文件：完整目录树
│   └── division-of-work.md           #   两人分工详情 + 接口契约
├── novel-analysis.schema.yaml        # 阶段 1 数据标准
├── adaptation-plan.schema.yaml       # 阶段 2 数据标准
├── screenplay.schema.yaml            # 阶段 3 数据标准
├── SCHEMA_DESIGN.md                  # 体系设计文档
├── package.json
├── tsconfig.json
├── vite.config.ts
│
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   │
│   ├── schema/                       # Schema 类型与校验（公共）
│   │   ├── types.ts                  #   三个 Schema 的 TS 类型定义
│   │   ├── novel-analysis.ts         #   NovelAnalysis 类型
│   │   ├── adaptation-plan.ts        #   AdaptationPlan 类型
│   │   ├── screenplay.ts             #   Screenplay 类型
│   │   ├── validator.ts              #   ajv 验证封装（三个 Schema 共用）
│   │   └── cross-validator.ts        #   跨阶段数据一致性校验 (F60)
│   │
│   ├── parser/                       # 模块 A：小说导入 (F1-F6)
│   │   ├── index.ts                  #   入口 + 格式分发
│   │   ├── txt.ts                    #   TXT 解析
│   │   ├── docx.ts                   #   DOCX 解析
│   │   ├── md.ts                     #   Markdown 解析
│   │   ├── chapter-detector.ts       #   章节边界识别
│   │   ├── encoding.ts               #   编码检测
│   │   └── cleaner.ts                #   预处理清洗
│   │
│   ├── analyzer/                     # 模块 B：小说分析 — 阶段 1 (F7-F18)
│   │   ├── index.ts                  #   分析流程编排：导入文本 → NovelAnalysis
│   │   ├── theme.ts                  #   主题分析 (F7)
│   │   ├── world-building.ts         #   世界观分析 (F8)
│   │   ├── plot.ts                   #   剧情分析 (F9-F13)
│   │   ├── character.ts              #   人物分析 (F14-F17)
│   │   ├── chapter-summaries.ts      #   章节摘要与原文标注 (F18)
│   │   └── prompt-templates/         #   阶段 1 Prompt 模板
│   │       ├── full-analysis.md
│   │       ├── theme.md
│   │       ├── character.md
│   │       └── plot.md
│   │
│   ├── planner/                      # 模块 C：改编规划 — 阶段 2 (F19-F31)
│   │   ├── index.ts                  #   规划流程编排：NovelAnalysis + Config → AdaptationPlan
│   │   ├── tone-mapping.ts           #   基调映射 (F19)
│   │   ├── structural-decisions.ts   #   结构改编决策 (F20)
│   │   ├── character-adaptation.ts   #   人物改编决策 (F21)
│   │   ├── pacing.ts                 #   节奏规划 (F22)
│   │   ├── externalization.ts        #   外化策略 (F23)
│   │   ├── compression-rules.ts      #   压缩规则 (F24)
│   │   ├── episode-plan.ts           #   幕结构规划 (F25)
│   │   ├── scene-plan.ts             #   分场景大纲 (F26-F28)
│   │   ├── draft-builder.ts          #   characters_draft / locations_draft (F29-F30)
│   │   └── prompt-templates/         #   阶段 2 Prompt 模板
│   │       ├── adaptation-strategy.md
│   │       ├── episode-plan.md
│   │       └── scene-plan.md
│   │
│   ├── converter/                    # 模块 D：beat 展开 — 阶段 3 (F32-F45)
│   │   ├── index.ts                  #   展开流程编排：AdaptationPlan → Screenplay
│   │   │                            #   关键：Prompt 注入 scene_plan[].source_context（原文上下文）
│   │   ├── beat-expander.ts          #   场景 → beats[] (F32)
│   │   ├── dialogue.ts               #   对白提取改写 (F33)
│   │   ├── internal-external.ts      #   心理外化 (F34)
│   │   ├── compression.ts            #   叙述压缩 (F35)
│   │   ├── transition-filler.ts      #   过渡补全 (F36)
│   │   ├── scene-heading.ts          #   场景头生成 (F37)
│   │   ├── tension-refiner.ts        #   张力精化 (F38)
│   │   ├── duration-estimator.ts     #   时长估算 (F39)
│   │   ├── character-builder.ts      #   characters[] 完整构建 (F40-F41)
│   │   ├── production-notes.ts       #   production_notes 生成 (F42-F43)
│   │   ├── source-tracer.ts          #   source_ref 溯源 (F44)
│   │   └── prompt-templates/         #   阶段 3 Prompt 模板
│   │       ├── beat-expansion.md
│   │       ├── dialogue-rewrite.md
│   │       └── transition-fill.md
│   │
│   ├── yaml-builder/                 # 模块 E：YAML 输出构建 (F57-F66)
│   │   ├── index.ts                  #   三个 Schema 的 YAML 序列化/反序列化
│   │   ├── beat-id.ts                #   beat_id 自动编号 (F61)
│   │   └── metadata.ts               #   元数据填充
│   │
│   ├── editor/                       # 模块 G：剧本编辑器 (F67-F78)
│   │   ├── index.tsx                 #   编辑器主入口
│   │   ├── EditorLayout.tsx          #   整体布局
│   │   ├── views/
│   │   │   ├── ScriptView.tsx        #   剧本编辑主视图
│   │   │   ├── OutlineView.tsx       #   大纲视图（幕/场景树）
│   │   │   ├── CharacterView.tsx     #   人物表视图
│   │   │   ├── SourceCompareView.tsx #   原文对照分屏 (F73)
│   │   │   ├── PlanView.tsx          #   改编规划查看/编辑视图
│   │   │   └── AnalysisView.tsx      #   小说分析查看视图
│   │   ├── components/
│   │   │   ├── ActPanel.tsx
│   │   │   ├── SceneCard.tsx
│   │   │   ├── BeatLine.tsx          #   核心组件：单行 beat 编辑器
│   │   │   ├── BeatAction.tsx
│   │   │   ├── BeatDialogue.tsx
│   │   │   ├── BeatParenthetical.tsx
│   │   │   ├── BeatTransition.tsx
│   │   │   ├── BeatFlashback.tsx
│   │   │   ├── BeatInsert.tsx
│   │   │   ├── BeatTitleCard.tsx
│   │   │   ├── CharacterEditor.tsx   #   人物编辑弹窗 (F70-F71)
│   │   │   ├── SceneHeadingEditor.tsx
│   │   │   ├── AiBadge.tsx           #   AI 标记渲染 (F72)
│   │   │   ├── SourceRefTooltip.tsx  #   原文引用提示 (F74)
│   │   │   └── BeatToolbar.tsx
│   │   ├── hooks/
│   │   │   ├── useBeatEdit.ts        #   (F67-F68)
│   │   │   ├── useSceneEdit.ts       #   (F69)
│   │   │   ├── useCharacterSync.ts   #   (F71)
│   │   │   ├── useHeadingOverride.ts
│   │   │   └── useUndoRedo.ts        #   (F76)
│   │   └── styles/
│   │       ├── screenplay-print.css
│   │       └── editor-theme.css
│   │
│   ├── analysis/                     # 模块 H：分析工具 (F79-F90)
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
│   ├── renderer/                     # 模块 I：渲染导出 (F91-F99)
│   │   ├── index.ts
│   │   ├── final-draft.ts
│   │   ├── pdf.ts
│   │   ├── fdx.ts
│   │   ├── fountain.ts
│   │   ├── html.ts
│   │   ├── txt.ts
│   │   └── watermark.ts
│   │
│   ├── project/                      # 模块 J：项目管理 (F100-F105)
│   │   ├── ProjectManager.tsx
│   │   ├── ProjectStore.ts
│   │   ├── EpisodeManager.tsx
│   │   └── progress-tracker.ts
│   │
│   ├── store/                        # 全局状态（公共）
│   │   ├── index.ts
│   │   ├── scriptStore.ts            #   当前剧本 Screenplay
│   │   ├── planStore.ts              #   当前 AdaptationPlan
│   │   ├── analysisStore.ts          #   当前 NovelAnalysis
│   │   ├── configStore.ts            #   转换配置
│   │   └── editorStore.ts            #   编辑器 UI 状态
│   │
│   ├── shared/                       # 公共工具
│   │   ├── constants.ts              #   枚举值、默认配置
│   │   ├── id-generator.ts           #   character_id/location_id/beat_id 生成
│   │   └── revision-history.ts       #   revision_history 维护 (F77)
│   │
│   └── api/                          # API 层
│       ├── client.ts                 #   多 Provider AI 接口调用封装
│       └── endpoints.ts              #   文件存储与业务路由
│
└── tests/
    ├── parser/                       # 模块 A 测试
    ├── analyzer/                     # 模块 B 测试
    ├── planner/                      # 模块 C 测试
    ├── converter/                    # 模块 D 测试
    ├── yaml-builder/                 # 模块 E 测试
    ├── editor/                       # 模块 G 测试
    └── fixtures/                     # 测试数据
        ├── sample-novel-1.txt
        ├── expected-analysis-1.yaml
        ├── expected-plan-1.yaml
        └── expected-screenplay-1.yaml
```
