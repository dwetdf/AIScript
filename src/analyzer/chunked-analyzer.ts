// ============================================================================
// 分块分析编排器 — 阶段 1 性能优化核心
// Map-Reduce 模式：并行分块分析 → 纯代码合并 → AI 合成 → 最终 NovelAnalysis
// ============================================================================

import type { NovelAnalysis, AiConfig, PlotAnalysis, CharacterAnalysis, ChapterSummary, KeyEvent, CharacterRelation } from '../schema/types';
import { SCHEMA_VERSIONS, DEFAULT_CHUNK_SIZE, DEFAULT_STAGE1_CONCURRENCY } from '../shared/constants';
import { generateCharacterId } from '../shared/id-generator';
import { batchChatCompletionJson, chatCompletionJson } from '../api/client';
import type { ParsedNovel, ChapterData } from '../parser';
import { buildChunkAnalysisPrompt, buildChunkText } from './prompt-templates/chunk-analysis';
import { buildSynthesisPrompt } from './prompt-templates/synthesis';

// ============================== 类型 ==============================

/** 单个 chunk 的 AI 返回结构（与 full-analysis 相同的输出 schema） */
interface ChunkAiResult {
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
}

/** 合并后的草稿（送给 synthesis 的结构） */
interface MergedDraft {
  all_themes: NovelAnalysis['theme_analysis'][];
  all_world_buildings: NovelAnalysis['world_building'][];
  all_plots: Array<ChunkAiResult['plot_analysis']>;
  merged_characters: ChunkAiResult['character_analysis'];
  all_chapter_summaries: ChunkAiResult['chapter_summaries'];
}

export interface ChunkedAnalyzerOptions {
  chunkSize?: number;
  concurrency?: number;
  onProgress?: (chunk: number, totalChunks: number, label: string) => void;
  signal?: AbortSignal;
}

// ============================== 主入口 ==============================

/**
 * 分块分析：将小说切分为多块并行分析，最后 AI 合成
 */
export async function chunkedAnalyze(
  novel: ParsedNovel,
  aiConfig: AiConfig,
  options?: ChunkedAnalyzerOptions
): Promise<NovelAnalysis> {
  const chunkSize = options?.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const concurrency = options?.concurrency ?? DEFAULT_STAGE1_CONCURRENCY;
  const totalChunks = Math.ceil(novel.chapters.length / chunkSize);

  // ====== Step 1: 分块并行分析 (Map) ======
  const chunkTasks: Array<{
    messages: Array<{ role: 'system' | 'user'; content: string }>;
    config: AiConfig;
    options: { temperature: number; maxTokens: number };
  }> = [];

  for (let i = 0; i < totalChunks; i++) {
    const startCh = i * chunkSize + 1;
    const endCh = Math.min((i + 1) * chunkSize, novel.chapters.length);
    const chunkChapters = novel.chapters.slice(i * chunkSize, (i + 1) * chunkSize);
    const chunkText = buildChunkText(novel.title, chunkChapters, i + 1, totalChunks);
    const prompt = buildChunkAnalysisPrompt(chunkText, i + 1, totalChunks, novel.title);

    chunkTasks.push({
      messages: [
        {
          role: 'system',
          content: `你是一位专业的小说分析专家。你正在分析一本小说的第 ${i + 1}/${totalChunks} 段（第 ${startCh}-${endCh} 章）。请只输出 JSON。`,
        },
        { role: 'user', content: prompt },
      ],
      config: aiConfig,
      options: { temperature: 0.5, maxTokens: 16384 },
    });
  }

  // 进度回调：每完成一个 chunk 通知外层
  const chunkResults = await batchChatCompletionJson<ChunkAiResult>(
    chunkTasks,
    concurrency,
    (index, result, error) => {
      const startCh = index * chunkSize + 1;
      const endCh = Math.min((index + 1) * chunkSize, novel.chapters.length);
      const label = `第 ${startCh}-${endCh} 章`;
      options?.onProgress?.(index + 1, totalChunks, label);
    },
    options?.signal // 传递中断信号
  );

  // 过滤失败的 chunk（取有效结果）
  const validResults = chunkResults.filter((r): r is ChunkAiResult => r !== null);

  // 如果所有 chunk 都失败了，抛出错误
  if (validResults.length === 0) {
    throw new Error('所有分块分析均失败，请检查 AI API 配置');
  }

  // 检查是否被中断（结果不完整）
  if (options?.signal?.aborted) {
    // 即使中断，也尝试用已有结果构建 partial analysis（降级处理）
    if (validResults.length === 0) {
      throw new Error('分析已被取消，且无可用结果');
    }
  }

  // ====== Step 2: 纯代码合并 (Merge) ======
  const merged = mergeChunks(validResults, novel.chapters);

  // ====== Step 3: AI 合成 (Reduce) ======
  // 检查中断信号
  if (options?.signal?.aborted) {
    // 中断时跳过 synthesis，直接用 merge 结果构建分析
    return buildAnalysisFromMerged(novel, merged, aiConfig);
  }

  const mergedJson = JSON.stringify(merged, null, 2);
  const synthesisPrompt = buildSynthesisPrompt(mergedJson, novel.chapters.length);

  let synthesisResult: ChunkAiResult;
  try {
    synthesisResult = await chatCompletionJson<ChunkAiResult>(
      [
        { role: 'system', content: '你是一位资深的小说分析专家，负责整合多个片段的分析结果为一份完整、无重复的分析。请只输出 JSON。' },
        { role: 'user', content: synthesisPrompt },
      ],
      aiConfig,
      { temperature: 0.4, maxTokens: 8192, signal: options?.signal }
    );
  } catch (e) {
    if (options?.signal?.aborted) {
      // 中断导致 synthesis 失败，降级为 merge 结果
      return buildAnalysisFromMerged(novel, merged, aiConfig);
    }
    throw e;
  }

  // ====== Step 4: 构建最终 NovelAnalysis ======
  return buildFinalAnalysis(novel, synthesisResult, aiConfig);
}

// ============================== 合并逻辑 ==============================

/**
 * 纯代码合并多个 chunk 的分析结果
 */
function mergeChunks(
  results: ChunkAiResult[],
  chapters: ChapterData[]
): MergedDraft {
  // 收集所有原始数据
  const allThemes: NovelAnalysis['theme_analysis'][] = [];
  const allWorldBuildings: NovelAnalysis['world_building'][] = [];
  const allPlots: ChunkAiResult['plot_analysis'][] = [];
  const allChapterSummaries: ChunkAiResult['chapter_summaries'] = [];

  for (const r of results) {
    allThemes.push(r.theme_analysis);
    allWorldBuildings.push(r.world_building);
    allPlots.push(r.plot_analysis);
    allChapterSummaries.push(...(r.chapter_summaries || []));
  }

  // 合并人物：按 name 去重
  const mergedCharacters = mergeCharacters(results);

  // 按章节号排序章节摘要
  allChapterSummaries.sort((a, b) => (a.chapter_number || 0) - (b.chapter_number || 0));

  return {
    all_themes: allThemes,
    all_world_buildings: allWorldBuildings,
    all_plots: allPlots,
    merged_characters: mergedCharacters,
    all_chapter_summaries: allChapterSummaries,
  };
}

/**
 * 按 name 精确匹配合并人物
 * 同一人物出现在多个 chunk → 保留最完整的 traits/arc/relationships
 */
function mergeCharacters(
  results: ChunkAiResult[]
): ChunkAiResult['character_analysis'] {
  const charMap = new Map<string, ChunkAiResult['character_analysis'][number]>();

  for (const r of results) {
    for (const c of r.character_analysis || []) {
      if (!c.name) continue;

      const existing = charMap.get(c.name);
      if (!existing) {
        charMap.set(c.name, { ...c });
        continue;
      }

      // 合并：保留更完整的字段
      if (c.identity && !existing.identity) existing.identity = c.identity;
      if (c.motivation && !existing.motivation) existing.motivation = c.motivation;

      // character_arc: 拼接弧线（取最长的）
      if (c.character_arc && (!existing.character_arc || c.character_arc.length > existing.character_arc.length)) {
        existing.character_arc = c.character_arc;
      }

      // aliases: 合并去重
      if (c.aliases?.length) {
        const existingAliases = existing.aliases || [];
        for (const alias of c.aliases) {
          if (!existingAliases.includes(alias)) existingAliases.push(alias);
        }
        existing.aliases = existingAliases;
      }

      // relationships: 合并去重（按 target name）
      if (c.relationships?.length) {
        const existingRels = existing.relationships || [];
        for (const rel of c.relationships) {
          if (!existingRels.some((er) => er.target === rel.target && er.type === rel.type)) {
            existingRels.push(rel);
          }
        }
        existing.relationships = existingRels;
      }

      // distinctive_traits: 合并
      if (c.distinctive_traits) {
        existing.distinctive_traits = existing.distinctive_traits || {};
        const dt = existing.distinctive_traits;
        if (c.distinctive_traits.speech_style && !dt.speech_style) dt.speech_style = c.distinctive_traits.speech_style;
        if (c.distinctive_traits.appearance && !dt.appearance) dt.appearance = c.distinctive_traits.appearance;
        if (c.distinctive_traits.catchphrases?.length) {
          const existingPhrases = dt.catchphrases || [];
          for (const phrase of c.distinctive_traits.catchphrases) {
            if (!existingPhrases.includes(phrase)) existingPhrases.push(phrase);
          }
          dt.catchphrases = existingPhrases;
        }
        if (c.distinctive_traits.habits?.length) {
          const existingHabits = dt.habits || [];
          for (const habit of c.distinctive_traits.habits) {
            if (!existingHabits.includes(habit)) existingHabits.push(habit);
          }
          dt.habits = existingHabits;
        }
      }

      // role/importance: 保留优先级更高（更"主演"）的
      const rolePriority: Record<string, number> = { protagonist: 4, antagonist: 3, narrator: 2, supporting: 1, minor: 0, ensemble: 0 };
      const importancePriority: Record<string, number> = { essential: 4, major: 3, supporting: 2, minor: 1 };
      if ((rolePriority[c.role] || 0) > (rolePriority[existing.role] || 0)) {
        existing.role = c.role;
      }
      if ((importancePriority[c.importance] || 0) > (importancePriority[existing.importance] || 0)) {
        existing.importance = c.importance;
      }
    }
  }

  return Array.from(charMap.values());
}

// ============================== 构建分析 ==============================

/**
 * 从 synthesis 结果构建最终 NovelAnalysis
 */
function buildFinalAnalysis(
  novel: ParsedNovel,
  synthResult: ChunkAiResult,
  aiConfig: AiConfig
): NovelAnalysis {
  const analysis: NovelAnalysis = {
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
    theme_analysis: synthResult.theme_analysis,
    world_building: synthResult.world_building,
    plot_analysis: buildPlotAnalysis(synthResult.plot_analysis),
    character_analysis: buildCharacterAnalysis(synthResult.character_analysis),
    chapter_summaries: buildChapterSummaries(synthResult.chapter_summaries, novel.chapters),
    ai_config: aiConfig,
    generated_at: new Date().toISOString(),
  };

  return analysis;
}

/**
 * 降级路径：从 merge 结果直接构建 NovelAnalysis（跳过 synthesis）
 * 在中断或 synthesis 失败时使用
 */
function buildAnalysisFromMerged(
  novel: ParsedNovel,
  merged: MergedDraft,
  aiConfig: AiConfig
): NovelAnalysis {
  // 取第一个有效 world_building
  const worldBuilding = merged.all_world_buildings.find(
    (wb) => wb?.era || wb?.atmosphere
  ) || {};

  // 取第一个有效 plot
  const firstPlot = merged.all_plots[0] || { main_plot: { description: '', stakes: '' }, core_conflict: { type: 'person_vs_society' as const, description: '' }, key_events: [] };

  // 合并所有 key_events
  const allKeyEvents = merged.all_plots.flatMap((p) => p.key_events || []);
  allKeyEvents.sort((a, b) => (a.chapter || 0) - (b.chapter || 0));

  const mergedPlot: ChunkAiResult['plot_analysis'] = {
    main_plot: firstPlot.main_plot,
    sub_plots: merged.all_plots.flatMap((p) => p.sub_plots || []),
    core_conflict: firstPlot.core_conflict,
    key_events: allKeyEvents,
    narrative_structure: firstPlot.narrative_structure,
  };

  // 合并主题：取所有 core_themes + secondary_themes
  const allCoreThemes = merged.all_themes.flatMap((t) => t?.core_themes || []);
  const allSecondaryThemes = merged.all_themes.flatMap((t) => t?.secondary_themes || []);
  const allTonal = merged.all_themes.flatMap((t) => t?.tonal_characteristics || []);

  const mergedTheme: NovelAnalysis['theme_analysis'] = {
    core_themes: allCoreThemes,
    secondary_themes: allSecondaryThemes,
    tonal_characteristics: [...new Set(allTonal)],
  };

  // 简单去重核心主题（按 name 包含关系）
  const dedupeThemes = <T extends { theme: string; description: string }>(themes: T[]) => {
    const seen = new Set<string>();
    const result: T[] = [];
    for (const t of themes) {
      const isDup = [...seen].some((s) => s.includes(t.theme) || t.theme.includes(s));
      if (!isDup && !seen.has(t.theme)) {
        seen.add(t.theme);
        result.push(t);
      }
    }
    return result;
  };
  mergedTheme.core_themes = dedupeThemes(mergedTheme.core_themes);
  if (mergedTheme.secondary_themes) {
    mergedTheme.secondary_themes = dedupeThemes(mergedTheme.secondary_themes);
  }

  // 构建合成结果
  const synthResult: ChunkAiResult = {
    theme_analysis: mergedTheme,
    world_building: worldBuilding,
    plot_analysis: mergedPlot,
    character_analysis: merged.merged_characters,
    chapter_summaries: merged.all_chapter_summaries,
  };

  return buildFinalAnalysis(novel, synthResult, aiConfig);
}

/** unique ID 辅助 */
function makeUniqueId(baseId: string, used: Set<string>): string {
  if (!used.has(baseId)) return baseId;
  let i = 2;
  while (used.has(`${baseId}_${i}`)) i++;
  return `${baseId}_${i}`;
}

// ============================== Plot / Character / Chapter 构建（复用 from index.ts） ==============================

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

function buildCharacterAnalysis(rawCharacters: Array<{
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
}>): CharacterAnalysis[] {
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
    for (const s of aiSummaries) {
      if (!aiMap.has(s.chapter_number)) {
        aiMap.set(s.chapter_number, s);
      }
    }
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

function classifyParagraphType(text: string): 'dialogue' | 'internal_monologue' | 'action' | 'description' | 'narrative' | 'mixed' {
  if (text.startsWith('"') || text.startsWith('「') || text.startsWith('"')) return 'dialogue';
  if (text.includes('想') || text.includes('觉得') || text.includes('心里')) return 'internal_monologue';
  if (text.includes('跑') || text.includes('走') || text.includes('打') || text.includes('拿')) return 'action';
  if (text.length > 100 && !text.includes('"')) return 'narrative';
  return 'narrative';
}
