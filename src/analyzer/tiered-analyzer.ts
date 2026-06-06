// ============================================================================
// 双层并行分析编排器 — Tier 1 逐章并行 + Tier 2 全文综合 → NovelAnalysis
//
// Tier 1 (flash 模型，逐章并行): 每章独立分析 → 摘要 + 精选原文 + 事件线索 + 主题线索
// Tier 2 (主模型，全文): 全局综合 → 主题/世界观/剧情/人物弧线
// 两者并行运行 (Promise.all)，最后纯代码合并
// ============================================================================

import type { NovelAnalysis, AiConfig, CuratedPassage, ChapterSummary, PlotAnalysis, CharacterAnalysis, KeyEvent, CharacterRelation } from '../schema/types';
import { SCHEMA_VERSIONS, DEFAULT_TIER1_CONCURRENCY } from '../shared/constants';
import { generateCharacterId } from '../shared/id-generator';
import { chatCompletionJson, batchChatCompletionJson } from '../api/client';
import type { ParsedNovel, ChapterData } from '../parser';
import { buildChapterAnalysisPrompt, buildChapterText } from './prompt-templates/chapter-analysis';
import { buildGlobalSynthesisPrompt, buildNovelText } from './prompt-templates/global-synthesis';

// ============================== 类型 ==============================

/** Tier 1 单章 AI 返回结构 */
interface Tier1ChapterResult {
  chapter_number: number;
  summary: string;
  key_events?: string[];
  characters_appeared?: string[];
  locations?: string[];
  adaptation_potential?: string;
  valuable_passages?: Array<{
    text: string;
    passage_type: string;
    characters_involved?: string[];
    source_paragraph?: number;
    why_valuable?: string;
  }>;
  event_threads?: Array<{
    thread_label: string;
    phase_this_chapter: string;
    what_happens: string;
    connected_to_previous: boolean;
    connected_to_next: boolean;
    is_key_moment: boolean;
    key_moment_description?: string;
  }>;
  theme_hints?: Array<{
    motif: string;
    embodied_by: string;
  }>;
  relationship_changes?: Array<{
    character_a: string;
    character_b: string;
    change: string;
    key_interaction: string;
  }>;
}

/** Tier 2 全局 AI 返回结构（与 full-analysis 相同，不含 chapter_summaries） */
interface Tier2GlobalResult {
  theme_analysis: NovelAnalysis['theme_analysis'];
  world_building: NovelAnalysis['world_building'];
  plot_analysis: {
    main_plot: { description: string; stakes: string };
    sub_plots?: Array<{ description: string; connection_to_main: string; key_characters?: string[] }>;
    core_conflict: PlotAnalysis['core_conflict'];
    key_events: Array<{ event: string; chapter: number; description: string; dramatic_function?: string }>;
    narrative_structure?: Record<string, unknown>;
  };
  character_analysis: Array<{
    name: string;
    aliases?: string[];
    role: string;
    importance: string;
    identity?: string;
    motivation?: { external: string; internal: string };
    character_arc?: string;
    relationships?: Array<{ target: string; type: string; description: string; dynamics?: string }>;
    distinctive_traits?: {
      speech_style?: string;
      catchphrases?: string[];
      habits?: string[];
      appearance?: string;
    };
    adaptability_notes?: string;
  }>;
}

export interface TieredAnalyzerOptions {
  /** Tier 1 并发数，默认 DEFAULT_TIER1_CONCURRENCY */
  tier1Concurrency?: number;
  /** Tier 1 使用的模型（覆盖自动推导），默认从 aiConfig 推导 flash 模型 */
  tier1Model?: string;
  /** 进度回调：Tier1 逐章完成时触发 */
  onProgress?: (chunk: number, totalChunks: number, label: string) => void;
  /** 中断信号 */
  signal?: AbortSignal;
}

// ============================== 主入口 ==============================

/**
 * 双层并行分析：Tier 1 逐章 + Tier 2 全文，并行执行后合并
 */
export async function tieredAnalyze(
  novel: ParsedNovel,
  aiConfig: AiConfig,
  options?: TieredAnalyzerOptions
): Promise<NovelAnalysis> {
  const totalChapters = novel.chapters.length;
  const signal = options?.signal;

  // Tier 1 使用的模型：aiConfig.tier1_model 为空则用默认模型
  const tier1Model = aiConfig.tier1_model || aiConfig.ai_model;
  const tier1Config: AiConfig = { ...aiConfig, ai_model: tier1Model };

  // ====== Phase 1: 并行执行 Tier 1 + Tier 2 ======
  const [tier1Results, tier2Result] = await Promise.all([
    runTier1(novel, tier1Config, options),
    runTier2(novel, aiConfig, signal),
  ]);

  // 检查中断
  if (signal?.aborted) {
    throw new Error('分析已被取消');
  }

  // ====== Phase 2: 纯代码合并 ======
  return mergeTieredResults(tier1Results, tier2Result, novel, aiConfig);
}

// ============================== Tier 1: 逐章并行分析 ==============================

async function runTier1(
  novel: ParsedNovel,
  tier1Config: AiConfig,
  options?: TieredAnalyzerOptions
): Promise<(Tier1ChapterResult | null)[]> {
  const totalChapters = novel.chapters.length;
  const concurrency = options?.tier1Concurrency ?? DEFAULT_TIER1_CONCURRENCY;
  const signal = options?.signal;

  // 构建逐章任务
  const tasks = novel.chapters.map((ch, i) => {
    const chapterText = buildChapterText(ch);
    const chapterNum = i + 1;
    const prompt = buildChapterAnalysisPrompt(chapterText, chapterNum, totalChapters, novel.title);

    return {
      messages: [
        {
          role: 'system' as const,
          content: `你是一位专业的小说分析专家。你正在逐章分析《${novel.title}》的第 ${chapterNum}/${totalChapters} 章。请只输出 JSON。`,
        },
        { role: 'user' as const, content: prompt },
      ],
      config: tier1Config,
      options: { temperature: 0.4, maxTokens: 8192 },
    };
  });

  // 并行执行，每完成一章触发进度回调
  let completedCount = 0;
  const results = await batchChatCompletionJson<Tier1ChapterResult>(
    tasks,
    concurrency,
    (index, result, _error) => {
      completedCount++;
      const chapterNum = index + 1;
      const ch = novel.chapters[index];
      const label = result
        ? `第${chapterNum}章 ${ch?.title || ''}`
        : `第${chapterNum}章 (失败)`;
      options?.onProgress?.(completedCount, totalChapters, label);
    },
    signal
  );

  return results;
}

// ============================== Tier 2: 全文全局综合 ==============================

async function runTier2(
  novel: ParsedNovel,
  aiConfig: AiConfig,
  signal?: AbortSignal
): Promise<Tier2GlobalResult> {
  const novelText = buildNovelText(novel);
  const prompt = buildGlobalSynthesisPrompt(novelText, novel.chapters.length);

  return chatCompletionJson<Tier2GlobalResult>(
    [
      {
        role: 'system',
        content: '你是一位资深的小说分析和剧本改编专家。请从全局视角分析整本小说，只输出 JSON。',
      },
      { role: 'user', content: prompt },
    ],
    aiConfig,
    { temperature: 0.4, maxTokens: 16384, signal }
  );
}

// ============================== Merge: Tier1 + Tier2 → NovelAnalysis ==============================

function mergeTieredResults(
  tier1Results: (Tier1ChapterResult | null)[],
  tier2Result: Tier2GlobalResult,
  novel: ParsedNovel,
  aiConfig: AiConfig
): NovelAnalysis {
  // 过滤失败章节
  const validChapters = tier1Results.filter((r): r is Tier1ChapterResult => r !== null);

  // 构建章节摘要（不含原文）
  const chapterSummaries: ChapterSummary[] = novel.chapters.map((ch) => {
    const ai = validChapters.find((r) => r.chapter_number === ch.chapterNumber);

    return {
      chapter_number: ch.chapterNumber,
      chapter_title: ch.title,
      summary: ai?.summary || `${ch.title || `第${ch.chapterNumber}章`}，共 ${ch.paragraphs.length} 段`,
      key_events: ai?.key_events || [],
      characters_appeared: ai?.characters_appeared || [],
      locations: ai?.locations || [],
      paragraph_count: ch.paragraphs.length,
      adaptation_potential: (ai?.adaptation_potential as ChapterSummary['adaptation_potential']) || 'medium',
    };
  });

  // 汇总所有精选原文片段
  const curatedPassages: CuratedPassage[] = validChapters.flatMap((r) =>
    (r.valuable_passages || []).map((vp) => ({
      text: vp.text,
      passage_type: vp.passage_type as CuratedPassage['passage_type'],
      characters_involved: vp.characters_involved,
      source_chapter: r.chapter_number,
      source_paragraph: vp.source_paragraph,
      why_valuable: vp.why_valuable,
    }))
  );

  return {
    schema_version: SCHEMA_VERSIONS['novel-analysis'],
    source_info: {
      title: novel.title,
      author: novel.author || '未知',
      source_type: 'novel',
      total_chapters: novel.chapters.length,
      analyzed_chapters: {
        start_chapter: 1,
        end_chapter: novel.chapters.length,
      },
      language: 'zh-CN',
      word_count: novel.rawText?.length || novel.chapters.reduce(
        (sum, ch) => sum + ch.paragraphs.reduce((s, p) => s + p.text.length, 0), 0
      ),
    },
    theme_analysis: tier2Result.theme_analysis,
    world_building: tier2Result.world_building,
    plot_analysis: buildPlotAnalysis(tier2Result.plot_analysis),
    character_analysis: buildCharacterAnalysis(tier2Result.character_analysis),
    chapter_summaries: chapterSummaries,
    curated_passages: curatedPassages,
    ai_config: aiConfig,
    generated_at: new Date().toISOString(),
  };
}

// ============================== 辅助函数 ==============================

function buildPlotAnalysis(raw: Tier2GlobalResult['plot_analysis']): PlotAnalysis {
  return {
    main_plot: raw.main_plot,
    sub_plots: raw.sub_plots,
    core_conflict: raw.core_conflict,
    key_events: (raw.key_events || []).map((ke) => ({
      event: ke.event,
      chapter: ke.chapter,
      description: ke.description,
      dramatic_function: (ke.dramatic_function as KeyEvent['dramatic_function']) || 'other',
    })),
    narrative_structure: raw.narrative_structure as PlotAnalysis['narrative_structure'],
  };
}

function buildCharacterAnalysis(
  rawCharacters: Tier2GlobalResult['character_analysis']
): CharacterAnalysis[] {
  const usedIds = new Set<string>();

  return rawCharacters.map((rc) => {
    const charId = makeUniqueId(generateCharacterId(rc.name), usedIds);
    usedIds.add(charId);

    return {
      character_id: charId,
      name: rc.name,
      aliases: rc.aliases,
      role: rc.role as CharacterAnalysis['role'] || 'supporting',
      importance: rc.importance as CharacterAnalysis['importance'] || 'major',
      identity: rc.identity,
      motivation: rc.motivation,
      character_arc: rc.character_arc,
      relationships: (rc.relationships || []).map((r) => ({
        target_character_id: r.target,
        type: (r.type as CharacterRelation['type']) || 'other',
        description: r.description,
        dynamics: r.dynamics,
      })),
      distinctive_traits: rc.distinctive_traits,
      adaptability_notes: rc.adaptability_notes,
    };
  });
}

/** 确保 ID 在给定集合中唯一 */
function makeUniqueId(baseId: string, used: Set<string>): string {
  if (!used.has(baseId)) return baseId;
  let i = 2;
  while (used.has(`${baseId}_${i}`)) i++;
  return `${baseId}_${i}`;
}
