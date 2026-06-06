// ============================================================================
// 小说分析流程编排 — 阶段 1：ParsedNovel → NovelAnalysis (F7-F18)
// v0.4.0: 支持分块分析（>3 章自动分块）+ 进度回调 + 可中断
// ============================================================================

import type { NovelAnalysis, AiConfig, KeyEvent, PlotAnalysis, CharacterAnalysis, ChapterSummary, RawPassage, CharacterRelation } from '../schema/types';
import { SCHEMA_VERSIONS, CHUNK_THRESHOLD } from '../shared/constants';
import { generateCharacterId } from '../shared/id-generator';
import { chatCompletionJson } from '../api/client';
import type { ParsedNovel, ChapterData } from '../parser';
import { buildFullAnalysisPrompt, buildNovelText } from './prompt-templates/full-analysis';
import { chunkedAnalyze, type ChunkedAnalyzerOptions } from './chunked-analyzer';

/**
 * 阶段 1 主入口：将小说文本分析为 NovelAnalysis
 *
 * @param novel 解析后的小说
 * @param aiConfig AI 配置
 * @param options 可选：分块大小 / 并发数 / 进度回调 / 中断信号
 * @returns 完整的 NovelAnalysis 对象
 */
export async function analyzeNovel(
  novel: ParsedNovel,
  aiConfig: AiConfig,
  options?: {
    chunkSize?: number;
    concurrency?: number;
    onProgress?: (chunk: number, totalChunks: number, label: string) => void;
    signal?: AbortSignal;
  }
): Promise<NovelAnalysis> {
  // 章节数 ≤ 阈值 → 不分块，直接一次调用（兼容小体量）
  if (novel.chapters.length <= CHUNK_THRESHOLD) {
    return analyzeSingleCall(novel, aiConfig, options?.signal);
  }

  // 章节数 > 阈值 → 分块分析（Map-Reduce）
  return chunkedAnalyze(novel, aiConfig, {
    chunkSize: options?.chunkSize,
    concurrency: options?.concurrency,
    onProgress: options?.onProgress,
    signal: options?.signal,
  });
}

/**
 * 单次调用分析（3 章以下，不分块）
 */
async function analyzeSingleCall(
  novel: ParsedNovel,
  aiConfig: AiConfig,
  signal?: AbortSignal
): Promise<NovelAnalysis> {
  const novelText = buildNovelText(novel);
  const prompt = buildFullAnalysisPrompt(novelText);

  const aiResult = await chatCompletionJson<{
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
    chapter_summaries: Array<{
      chapter_number: number;
      summary: string;
      key_events?: string[];
      characters_appeared?: string[];
      locations?: string[];
      adaptation_potential?: string;
    }>;
  }>(
    [
      { role: 'system', content: '你是一位专业的小说分析和剧本改编专家。请严格按照 JSON 格式输出分析结果。' },
      { role: 'user', content: prompt },
    ],
    aiConfig,
    { temperature: 0.5, maxTokens: 16384, signal }
  );

  return buildAnalysis(novel, aiResult, aiConfig);
}

/** 构建完整的 NovelAnalysis（复用逻辑） */
function buildAnalysis(
  novel: ParsedNovel,
  aiResult: {
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
    chapter_summaries: Array<{
      chapter_number: number;
      summary: string;
      key_events?: string[];
      characters_appeared?: string[];
      locations?: string[];
      adaptation_potential?: string;
    }>;
  },
  aiConfig: AiConfig
): NovelAnalysis {
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
      word_count: novel.rawText.length,
    },
    theme_analysis: aiResult.theme_analysis,
    world_building: aiResult.world_building,
    plot_analysis: buildPlotAnalysis(aiResult.plot_analysis),
    character_analysis: buildCharacterAnalysis(aiResult.character_analysis),
    chapter_summaries: buildChapterSummaries(aiResult.chapter_summaries, novel.chapters),
    ai_config: aiConfig,
    generated_at: new Date().toISOString(),
  };
}

/** 构建剧情分析 */
function buildPlotAnalysis(raw: {
  main_plot: { description: string; stakes: string };
  sub_plots?: Array<{ description: string; connection_to_main: string; key_characters?: string[] }>;
  core_conflict: PlotAnalysis['core_conflict'];
  key_events: Array<{ event: string; chapter: number; description: string; dramatic_function?: string }>;
}): PlotAnalysis {
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
  };
}

/** 构建人物分析 — 分配 character_id */
function buildCharacterAnalysis(rawCharacters: AnalysisRawCharacter[]): CharacterAnalysis[] {
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

/** 构建章节摘要 + raw_passages */
function buildChapterSummaries(
  aiSummaries: Array<{
    chapter_number: number;
    summary: string;
    key_events?: string[];
    characters_appeared?: string[];
    locations?: string[];
    adaptation_potential?: string;
  }> | undefined,
  chapters: ChapterData[]
): ChapterSummary[] {
  const aiMap = new Map<number, NonNullable<typeof aiSummaries>[number]>();
  if (aiSummaries) {
    for (const s of aiSummaries) aiMap.set(s.chapter_number, s);
  }

  return chapters.map((ch) => {
    const ai = aiMap.get(ch.chapterNumber);

    return {
      chapter_number: ch.chapterNumber,
      chapter_title: ch.title,
      summary: ai?.summary || `${ch.title || ''}，共 ${ch.paragraphs.length} 段`,
      key_events: ai?.key_events || [],
      characters_appeared: ai?.characters_appeared || [],
      locations: ai?.locations || [],
      paragraph_count: ch.paragraphs.length,
      adaptation_potential: (ai?.adaptation_potential as ChapterSummary['adaptation_potential']) || 'medium',
      raw_passages: ch.paragraphs.map((p) => ({
        paragraph: p.index,
        text: p.text,
        type: classifyParagraphType(p.text),
        significance: 'major' as const,
      })),
    };
  });
}

/** 分类段落类型 */
function classifyParagraphType(text: string): RawPassage['type'] {
  if (text.startsWith('"') || text.startsWith('「') || text.startsWith('"')) return 'dialogue';
  if (text.includes('想') || text.includes('觉得') || text.includes('心里')) return 'internal_monologue';
  if (text.includes('跑') || text.includes('走') || text.includes('打') || text.includes('拿')) return 'action';
  if (text.length > 100 && !text.includes('"')) return 'narrative';
  return 'narrative';
}

/** 确保 ID 在给定集合中唯一 */
function makeUniqueId(baseId: string, used: Set<string>): string {
  if (!used.has(baseId)) return baseId;
  let i = 2;
  while (used.has(`${baseId}_${i}`)) i++;
  return `${baseId}_${i}`;
}

interface AnalysisRawCharacter {
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
}
