// ============================================================================
// 改编规划流程编排 — 阶段 2：NovelAnalysis → AdaptationPlan (F19-F31)
// ============================================================================

import type { AdaptationPlan, AiConfig, AdaptationStrategy, ScenePlan, SourceContext, ActPlan } from '../schema/types';
import { SCHEMA_VERSIONS } from '../shared/constants';
import type { NovelAnalysis, ConversionConfig, ChapterSummary, CharacterAnalysis } from '../schema/types';
import { chatCompletionJson } from '../api/client';
import { buildAdaptationStrategyPrompt } from './prompt-templates/adaptation-strategy';
import { buildEpisodePlanPrompt, buildScenePlanOnlyPrompt } from './prompt-templates/episode-plan';

/**
 * 阶段 2 主入口：基于小说分析结果生成改编规划
 *
 * @param analysis 小说分析产物
 * @param config 转换配置
 * @param aiConfig AI 配置
 * @param options 可选：进度回调 + 中断信号
 */
export async function planAdaptation(
  analysis: NovelAnalysis,
  config: ConversionConfig,
  aiConfig: AiConfig,
  options?: {
    onProgress?: (step: 'strategy' | 'episode', done: boolean) => void;
    signal?: AbortSignal;
  }
): Promise<AdaptationPlan> {
  // Step 1: 改编策略生成 (F19-F24)
  options?.onProgress?.('strategy', false);
  const strategy = await generateAdaptationStrategy(analysis, config, aiConfig, options?.signal);
  options?.onProgress?.('strategy', true);

  // Step 2: 幕结构 + 场景大纲生成 (F25-F28)
  options?.onProgress?.('episode', false);
  const { episodePlan, scenePlan } = await generateEpisodeAndScenePlan(
    analysis, strategy, config, aiConfig, options?.signal
  );
  options?.onProgress?.('episode', true);

  // Step 3: 人物表初稿 (F29) — 从 NovelAnalysis 直接映射
  const charactersDraft = buildCharactersDraft(analysis.character_analysis);

  // Step 4: 地点表初稿 (F30) — 从 NovelAnalysis + scene_plan 提取
  const locationsDraft = buildLocationsDraft(analysis, scenePlan);

  const plan: AdaptationPlan = {
    schema_version: SCHEMA_VERSIONS['adaptation-plan'],
    source_analysis_ref: {
      analysis_generated_at: analysis.generated_at,
      chapters_covered: analysis.source_info.analyzed_chapters,
    },
    adaptation_strategy: strategy,
    episode_plan: episodePlan,
    scene_plan: scenePlan,
    characters_draft: charactersDraft,
    locations_draft: locationsDraft,
    ai_config: aiConfig,
    generated_at: new Date().toISOString(),
  };

  return plan;
}

/** 生成改编策略 */
async function generateAdaptationStrategy(
  analysis: NovelAnalysis,
  config: ConversionConfig,
  aiConfig: AiConfig,
  signal?: AbortSignal
): Promise<AdaptationStrategy> {
  const analysisSummary = prepareAnalysisSummary(analysis);
  const prompt = buildAdaptationStrategyPrompt(analysisSummary, config);

  const result = await chatCompletionJson<{
    tone_adaptation: { source_tone: string; target_tone: string; notes: string };
    structural_decisions: Array<{ decision: string; rationale: string; impact: 'high' | 'medium' | 'low'; affected_characters?: string[]; affected_chapters?: number[] }>;
    character_adaptations: Array<{ character_id: string; action: 'keep' | 'merge' | 'reduce' | 'expand' | 'cut'; merge_with?: string; notes?: string }>;
    pacing_strategy: { overall_pacing: string; high_tension_ratio: number; breathing_room: string };
    externalization_strategy: string;
    compression_rules: Array<{ rule: string; applies_to: 'environment' | 'action' | 'dialogue' | 'all'; priority?: 'must' | 'should' | 'may' }>;
  }>(
    [
      { role: 'system', content: '你是一个专业的影视改编策划。请以 JSON 格式输出改编策略。' },
      { role: 'user', content: prompt },
    ],
    aiConfig,
    { temperature: 0.5, maxTokens: 8192, signal }
  );

  return {
    target_medium: config.target_medium,
    tone_adaptation: result.tone_adaptation,
    structural_decisions: result.structural_decisions || [],
    character_adaptations: result.character_adaptations || [],
    pacing_strategy: result.pacing_strategy ? {
      overall_pacing: (result.pacing_strategy.overall_pacing as 'fast' | 'moderate' | 'slow' | 'varied') || 'varied',
      high_tension_ratio: result.pacing_strategy.high_tension_ratio,
      breathing_room: result.pacing_strategy.breathing_room,
    } : undefined,
    externalization_strategy: result.externalization_strategy,
    compression_rules: result.compression_rules || [],
  };
}

/** 生成幕结构和场景大纲 */
async function generateEpisodeAndScenePlan(
  analysis: NovelAnalysis,
  strategy: AdaptationStrategy,
  config: ConversionConfig,
  aiConfig: AiConfig,
  signal?: AbortSignal
): Promise<{
  episodePlan: AdaptationPlan['episode_plan'];
  scenePlan: ScenePlan[];
}> {
  const plotSummary = preparePlotSummary(analysis);
  const prompt = buildEpisodePlanPrompt(plotSummary, strategy, config);

  const result = await chatCompletionJson<{
    total_acts: number;
    acts: Array<{
      act_number: number;
      act_title?: string;
      act_type: string;
      synopsis: string;
      estimated_scene_count?: number;
      estimated_duration_minutes?: number;
      key_moments?: Array<{ moment: string; from_chapter: number; dramatic_function?: string }>;
      source_chapters?: number[];
    }>;
    scene_plan: Array<{
      scene_global_number: number;
      act_number: number;
      scene_number: number;
      location: { name: string; interior_exterior: 'INT' | 'EXT' | 'INT_EXT'; set_description?: string };
      time_of_day: string;
      synopsis: string;
      dramatic_function: string;
      tension_level?: number;
      characters_present?: string[];
      source_chapter_ref?: string;
      beat_plan?: {
        estimated_beat_count?: number;
        key_beats?: Array<{ order: number; beat_type?: string; description: string; character_id?: string; from_source?: boolean }>;
        notes?: string;
      };
    }>;
  }>(
    [
      { role: 'system', content: '你是一个专业的影视结构设计师。请以 JSON 格式输出幕规划和场景大纲。' },
      { role: 'user', content: prompt },
    ],
    aiConfig,
    { temperature: 0.5, maxTokens: 16384, signal }
  );

  // 为每个 scene_plan 填充 source_context
  const scenePlan: ScenePlan[] = result.scene_plan.map((sp) => ({
    scene_global_number: sp.scene_global_number,
    act_number: sp.act_number,
    scene_number: sp.scene_number,
    location: sp.location,
    time_of_day: sp.time_of_day,
    synopsis: sp.synopsis,
    dramatic_function: sp.dramatic_function as ScenePlan['dramatic_function'],
    tension_level: sp.tension_level,
    characters_present: sp.characters_present,
    source_chapter_ref: sp.source_chapter_ref,
    beat_plan: sp.beat_plan,
    source_context: extractSourceContext(analysis, sp),
    estimated_duration_seconds: sp.beat_plan?.estimated_beat_count
      ? sp.beat_plan.estimated_beat_count * 12
      : 120,
  }));

  return {
    episodePlan: {
      total_acts: result.total_acts,
      acts: result.acts.map((a) => ({
        act_number: a.act_number,
        act_title: a.act_title,
        act_type: a.act_type as 'setup' | 'confrontation' | 'resolution' | 'other',
        synopsis: a.synopsis,
        estimated_scene_count: a.estimated_scene_count,
        estimated_duration_minutes: a.estimated_duration_minutes,
        key_moments: a.key_moments,
        source_chapters: a.source_chapters,
      })),
    },
    scenePlan,
  };
}

/** 从 curated_passages 提取场景对应的原文上下文 (F27) */
function extractSourceContext(
  analysis: NovelAnalysis,
  scenePlan: { source_chapter_ref?: string; synopsis: string; characters_present?: string[] }
): SourceContext | undefined {
  // 找到对应的章节号
  const chapterRef = scenePlan.source_chapter_ref;
  const chapterNum = chapterRef ? parseInt(chapterRef.replace(/[^0-9]/g, ''), 10) || 1 : 1;

  const chapter = analysis.chapter_summaries.find(
    (cs) => cs.chapter_number === chapterNum
  );

  // 从 curated_passages 按章节 + 人物精确查找（AI 精选，无需关键词匹配）
  const curated = analysis.curated_passages || [];
  const relevant = curated.filter((cp) => {
    if (cp.source_chapter !== chapterNum) return false;
    // 有人物交集时过滤，无人物的场景（如场景过渡）保留全部
    if (scenePlan.characters_present?.length && cp.characters_involved?.length) {
      return cp.characters_involved.some((c) =>
        scenePlan.characters_present!.some(
          (sp) => sp.includes(c) || c.includes(sp)
        )
      );
    }
    return true;
  });

  const dialogues = relevant.filter((cp) => cp.passage_type === 'dialogue');
  const actions = relevant.filter(
    (cp) => cp.passage_type === 'action' || cp.passage_type === 'character_moment'
  );
  const descriptions = relevant.filter((cp) => cp.passage_type === 'description');

  return {
    summary: chapter?.summary || '',
    key_dialogues: dialogues.slice(0, 8).map((d) => ({
      speaker: d.characters_involved?.[0] || '未知',
      text: d.text,
    })),
    key_actions: actions.slice(0, 5).map((a) => ({
      description: a.text,
    })),
    key_descriptions: descriptions.slice(0, 5).map((d) => d.text),
    adaptation_notes: `基于第${chapterNum}章，${relevant.length}条AI精选原文参考`,
  };
}

/** 构建人物表初稿 */
function buildCharactersDraft(characters: CharacterAnalysis[]): AdaptationPlan['characters_draft'] {
  return characters.map((ca) => ({
    character_id: ca.character_id,
    name: ca.name,
    aliases: ca.aliases,
    role_type: ca.role as 'protagonist' | 'antagonist' | 'supporting' | 'minor' | 'narrator' | 'ensemble',
    description: ca.identity,
    arc: ca.character_arc,
    relationships: (ca.relationships || []).map((r) => ({
      target_character_id: r.target_character_id,
      relationship_type: r.type,
      relationship_description: r.description,
    })),
    voice_notes: ca.distinctive_traits?.speech_style,
  }));
}

/** 构建地点表初稿 */
function buildLocationsDraft(
  analysis: NovelAnalysis,
  scenePlan: ScenePlan[]
): AdaptationPlan['locations_draft'] {
  const seen = new Set<string>();
  const locations: NonNullable<AdaptationPlan['locations_draft']> = [];

  // 从 scene_plan 中提取地点
  for (const sp of scenePlan) {
    const locName = sp.location.name;
    if (!seen.has(locName)) {
      seen.add(locName);
      locations.push({
        location_id: locName.toLowerCase().replace(/\s+/g, '_'),
        name: locName,
        location_type: sp.location.interior_exterior === 'INT' ? 'interior' : 'exterior',
      });
    }
  }

  return locations;
}

/**
 * 单独重新生成场景大纲（保留用户修改后的 act 结构）
 *
 * @param analysis 小说分析产物
 * @param strategy 已有的改编策略
 * @param acts 用户修改后的幕结构
 * @param config 转换配置
 * @param aiConfig AI 配置
 * @param signal 中断信号
 */
export async function regenerateScenePlans(
  analysis: NovelAnalysis,
  strategy: AdaptationStrategy,
  acts: ActPlan[],
  config: ConversionConfig,
  aiConfig: AiConfig,
  signal?: AbortSignal
): Promise<ScenePlan[]> {
  const plotSummary = preparePlotSummary(analysis);
  const prompt = buildScenePlanOnlyPrompt(plotSummary, strategy, config, acts);

  const result = await chatCompletionJson<{
    scene_plan: Array<{
      scene_global_number: number; act_number: number; scene_number: number;
      location: { name: string; interior_exterior: 'INT' | 'EXT' | 'INT_EXT'; set_description?: string };
      time_of_day: string; synopsis: string; dramatic_function: string;
      tension_level?: number; characters_present?: string[];
      source_chapter_ref?: string;
      beat_plan?: { estimated_beat_count?: number; key_beats?: Array<{ order: number; beat_type?: string; description: string; character_id?: string; from_source?: boolean }>; notes?: string };
    }>;
  }>(
    [
      { role: 'system', content: '你是一个专业的影视结构设计师。请基于给定的幕结构，输出场景大纲 JSON。' },
      { role: 'user', content: prompt },
    ],
    aiConfig,
    { temperature: 0.5, maxTokens: 16384, signal }
  );

  return result.scene_plan.map((sp) => ({
    scene_global_number: sp.scene_global_number,
    act_number: sp.act_number,
    scene_number: sp.scene_number,
    location: sp.location,
    time_of_day: sp.time_of_day,
    synopsis: sp.synopsis,
    dramatic_function: sp.dramatic_function as ScenePlan['dramatic_function'],
    tension_level: sp.tension_level,
    characters_present: sp.characters_present,
    source_chapter_ref: sp.source_chapter_ref,
    beat_plan: sp.beat_plan,
    source_context: extractSourceContext(analysis, sp),
    estimated_duration_seconds: sp.beat_plan?.estimated_beat_count
      ? sp.beat_plan.estimated_beat_count * 12
      : 120,
  }));
}

/** 准备分析摘要 */
function prepareAnalysisSummary(analysis: NovelAnalysis): string {
  return JSON.stringify({
    theme: analysis.theme_analysis?.tonal_characteristics,
    world: analysis.world_building?.atmosphere,
    main_plot: analysis.plot_analysis.main_plot,
    core_conflict: analysis.plot_analysis.core_conflict,
    character_count: analysis.character_analysis.length,
    chapters: analysis.chapter_summaries.length,
  });
}

function preparePlotSummary(analysis: NovelAnalysis): string {
  return JSON.stringify({
    main_plot: analysis.plot_analysis.main_plot,
    key_events: analysis.plot_analysis.key_events,
    characters: analysis.character_analysis.map((c) => ({
      id: c.character_id,
      name: c.name,
      importance: c.importance,
    })),
    chapters: analysis.chapter_summaries.map((cs) => ({
      num: cs.chapter_number,
      summary: cs.summary,
      events: cs.key_events,
    })),
  });
}
