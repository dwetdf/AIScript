# AGENTS.md

## 项目概述

AI 辅助剧本创作工具 —— 将 3 章以上小说文本自动转换为结构化剧本（YAML 格式），让作者快速获得可编辑、可进一步打磨的剧本初稿。

TypeScript 全栈项目（React 18 前端 + Node.js 后端管线），统一 `src/` 目录。

**核心流水线：** 小说导入与分析 → 改编规划 → 分场大纲 → beat 展开 → 编辑导出

**数据标准（三 Schema 体系）：**

| Schema 文件 | 阶段 | 用途 |
|---|---|---|
| `novel-analysis.schema.yaml` v1.1.0 | 阶段 1 | 小说分析产物 |
| `adaptation-plan.schema.yaml` v1.1.0 | 阶段 2 | 改编规划产物 |
| `screenplay.schema.yaml` v1.1.0 | 阶段 3 | 最终剧本产物 |
| `SCHEMA_DESIGN.md` | — | 体系设计文档（三个 Schema 的设计理由） |

---

## 技术栈

| 层面 | 选择 | 说明 |
|------|------|------|
| 语言 | TypeScript（strict mode） | 全栈统一 |
| 前端框架 | React 18 | SPA，编辑器需高频交互 |
| 状态管理 | Zustand | 轻量，适合 YAML 树频繁局部更新 |
| YAML 处理 | js-yaml | 解析/序列化三个 Schema 的产物 |
| Schema 验证 | ajv | JSON Schema Draft-07 验证器 |
| AI 接口 | DeepSeek API（默认）/ Anthropic API / OpenAI API / 智谱 API / 月之暗面 API / 自定义 OpenAI 兼容端点 | 三阶段 Prompt 调用，provider 可切换 |
| 文档解析 | mammoth (.docx) + marked (.md) | 小说导入 |
| 导出 | Puppeteer (PDF) + 自研 (FDX/HTML/TXT) | 剧本渲染 |
| 构建工具 | Vite | 快速 HMR |

---

## 目录结构

> 完整目录树见 [docs/directory-structure.md](docs/directory-structure.md)。

```
src/
├── schema/          # TS 类型 + Schema 校验（公共契约）
├── parser/          # 模块 A：小说导入 (F1-F6)
├── analyzer/        # 模块 B：阶段 1 — 小说分析 (F7-F18)
├── planner/         # 模块 C：阶段 2 — 改编规划 (F19-F31)
├── converter/       # 模块 D：阶段 3 — beat 展开 (F32-F45)
├── yaml-builder/    # 模块 E：YAML 输出构建 (F57-F66)
├── editor/          # 模块 G：剧本编辑器 UI (F67-F78)
├── analysis/        # 模块 H：分析工具 (F79-F90)
├── renderer/        # 模块 I：渲染导出 (F91-F99)
├── project/         # 模块 J：项目管理 (F100-F105)
├── store/           # Zustand 全局状态
├── shared/          # 公共工具（constants / id-generator / revision-history）
└── api/             # AI 接口调用 + 文件存储
```

顶层 `docs/` 存放详细参考文档，Codex 需要时自行读取。

---

## 功能概览

> 完整 114 项功能点见 [docs/features.md](docs/features.md)。
> MVP 35 项核心功能点 + 分期规划见同一文件。

MVP 目标：**阶段 1 → 阶段 2 → 阶段 3 → 编辑 → 导出 PDF** 完整闭环。

---

## 两人分工

> 详见 [docs/division-of-work.md](docs/division-of-work.md)。

| 角色 | 模块 | 职责 |
|------|------|------|
| **人 A** | parser / analyzer / planner / converter / yaml-builder / api | 数据流水线 + AI Prompt + YAML 输出 |
| **人 B** | editor / analysis / renderer / project / store / config | 编辑器 UI + 渲染导出 + 项目管理 + 状态管理 |
| **公共** | schema / shared | 类型契约 + 公共工具，双方协商维护 |

### 接口契约

人 A 提供纯函数导出，人 B 通过 Store 消费。详见 [docs/division-of-work.md](docs/division-of-work.md) 中的契约 1-3。

```typescript
// ---- 解析 ----
export function parseNovel(file: File): Promise<ParsedNovel>;

// ---- 阶段 1：分析 ----
export async function analyzeNovel(novel: ParsedNovel, aiConfig: AiConfig): Promise<NovelAnalysis>;

// ---- 阶段 2：规划 ----
export async function planAdaptation(analysis: NovelAnalysis, config: ConversionConfig, aiConfig: AiConfig): Promise<AdaptationPlan>;

// ---- 阶段 3：展开 ----
export async function expandBeats(plan: AdaptationPlan, aiConfig: AiConfig): Promise<Screenplay>;

// ---- YAML 序列化 ----
export function toYaml(data: NovelAnalysis | AdaptationPlan | Screenplay): string;
export function fromYaml<T>(yaml: string): T;
export function validate<T>(data: unknown, schemaName: 'novel-analysis' | 'adaptation-plan' | 'screenplay'): ValidationResult;
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
docs: 文档          docs(Codex): 更新接口契约
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

1. **三 Schema 体系：** 不是一步到位，是 分析→规划→展开 三级流水线。screenplay scene beats 允许为空以支持中间状态。
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
| `novel-analysis.schema.yaml` | v1.1.0 阶段 1 数据标准 | 两人协商 |
| `adaptation-plan.schema.yaml` | v1.1.0 阶段 2 数据标准 | 两人协商 |
| `screenplay.schema.yaml` | v1.1.0 阶段 3 数据标准（beat-less 场景支持） | 两人协商 |
| `SCHEMA_DESIGN.md` | 三 Schema 设计理由 | 两人协商 |
| `docs/features.md` | 完整 114 功能点 + MVP 35 项 + 分期规划 | 两人同步 |
| `docs/directory-structure.md` | 完整目录树 | 两人同步 |
| `docs/division-of-work.md` | 两人分工详情 + 接口契约 | 两人同步 |
| `src/schema/types.ts` | TS 类型定义 | 人 A |
| `src/store/` | 所有 Zustand stores | 人 B |
| `src/shared/constants.ts` | 枚举值/默认值 | 两人同步 |
