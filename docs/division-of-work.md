# 两人分工

> 从 CLAUDE.md 提取。详细模块分配与接口契约。

---

## 模块分配

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

### 公共模块（双方维护）

| 模块 | 目录 | 职责 |
|------|------|------|
| Schema 类型 | `src/schema/` | 三个 Schema 的 TS 类型派生 + ajv 验证封装 |
| ID 生成 | `src/shared/id-generator.ts` | 所有 ID 规则（含 character_id） |
| 修订历史 | `src/shared/revision-history.ts` | revision_history 维护 (F77) |
| 公共常量 | `src/shared/constants.ts` | 枚举值/默认配置/Provider 列表/AI 模型映射 |
| 跨阶段 AI 引擎 | `src/shared/ai-config.ts` | AI 引擎配置读写，确保三阶段共用同一 ai_config |

---

## 接口契约

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
