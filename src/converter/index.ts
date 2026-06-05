// ============================================================================
// Beat 展开流程编排 — 阶段 3：AdaptationPlan → Screenplay (F32-F45)
// ============================================================================

import type { Screenplay, AiConfig, AdaptationPlan, Act, Scene, Beat, ScreenplayMetadata, Character, Location } from '../schema/types';
import { generateBeatId } from '../shared/id-generator';
import { SCHEMA_VERSIONS } from '../shared/constants';
import { chatCompletionJson } from '../api/client';
import { buildBeatExpansionPrompt } from './prompt-templates/beat-expansion';
import type { SourceContext, BeatPlan } from '../schema/types';

/**
 * 阶段 3 主入口：将改编规划展开为完整的 Screenplay
 * 每个场景单独调 AI，注入 source_context + beat_plan
 */
export async function expandBeats(
  plan: AdaptationPlan,
  aiConfig: AiConfig
): Promise<Screenplay> {
  const episode = 1; // MVP 单集

  // 构建 characters 和 locations
  const characters = buildCharacters(plan);
  const locations = buildLocations(plan);

  // 构建 acts → scenes（逐个场景展开 beats）
  const acts: Act[] = [];

  for (const actPlan of plan.episode_plan.acts) {
    const scenes: Scene[] = [];

    for (const sp of plan.scene_plan.filter((sp) => sp.act_number === actPlan.act_number)) {
      try {
        const expandedScene = await expandSceneBeats(sp, episode, aiConfig);
        scenes.push(expandedScene);
      } catch (e) {
        console.error(`场景 ${sp.scene_global_number} 展开失败：`, e);
        // 失败时创建空 beats 场景
        scenes.push(createEmptyScene(sp));
      }
    }

    acts.push({
      act_number: actPlan.act_number,
      act_title: actPlan.act_title,
      act_type: actPlan.act_type || 'other',
      synopsis: actPlan.synopsis,
      scenes,
    });
  }

  // 计算总时长
  const totalRuntimeMinutes = Math.ceil(
    acts.reduce(
      (sum, act) =>
        sum +
        act.scenes.reduce(
          (sSum, scene) =>
            sSum + (scene.estimated_duration_seconds || scene.beats.reduce((bSum, b) => bSum + (b.estimated_duration_seconds || 0), 0)),
          0
        ),
      0
    ) / 60
  );

  const metadata: ScreenplayMetadata = {
    title: plan.source_analysis_ref?.analysis_file || '未命名剧本',
    target_medium: plan.adaptation_strategy.target_medium,
    language: 'zh-CN',
    generated_at: new Date().toISOString(),
    estimated_runtime_minutes: totalRuntimeMinutes,
    tone: plan.adaptation_strategy.tone_adaptation.target_tone as ScreenplayMetadata['tone'],
    conversion_config: {
      ai_provider: aiConfig.ai_provider,
      ai_model: aiConfig.ai_model,
      ai_api_base_url: aiConfig.ai_api_base_url,
      dialogue_density: 'balanced',
      action_detail_level: 'standard',
      stage_direction_style: 'descriptive',
    },
  };

  const screenplay: Screenplay = {
    schema_version: SCHEMA_VERSIONS.screenplay,
    revision_history: [
      {
        revision_number: 1,
        timestamp: new Date().toISOString(),
        author: 'AI',
        change_summary: 'AI 初始生成',
      },
    ],
    metadata,
    characters,
    locations,
    acts,
    production_notes: {
      adaptation_decisions: plan.adaptation_strategy.structural_decisions.map((d) => ({
        decision: d.decision,
        rationale: d.rationale,
      })),
    },
  };

  return screenplay;
}

/** 展开单个场景的 beats */
async function expandSceneBeats(
  sp: import('../schema/types').ScenePlan,
  episode: number,
  aiConfig: AiConfig
): Promise<Scene> {
  const sourceContext = sp.source_context;
  const beatPlan = sp.beat_plan;

  // 构建 Prompt
  const prompt = buildBeatExpansionPrompt(sp, sourceContext, beatPlan);

  // 调用 AI
  const result = await chatCompletionJson<{
    beats: Array<{
      beat_type?: string;
      action_text?: string;
      character_id?: string;
      character_name_display?: string;
      dialogue_text?: string;
      parenthetical_text?: string;
      transition_type?: string;
      title_card_text?: string;
      flashback_label?: string;
      insert_description?: string;
      emotion?: string;
      camera_suggestion?: string;
      is_ai_generated?: boolean;
      source_ref_chapter?: number;
      source_ref_paragraph?: number;
      source_ref_excerpt?: string;
      estimated_duration_seconds?: number;
      music_cue?: string;
    }>;
    tension_level?: number;
  }>(
    [
      { role: 'system', content: '你是一个专业的剧本写手。请将给定的场景大纲展开为完整的剧情节拍序列。以 JSON 格式输出。' },
      { role: 'user', content: prompt },
    ],
    aiConfig,
    { temperature: 0.7, maxTokens: 8192 }
  );

  // 将 raw beats 转为类型化 Beat 数组
  const beats: Beat[] = (result.beats || []).map((rb, idx) => {
    const beatId = generateBeatId(episode, sp.act_number, sp.scene_global_number, idx + 1);
    const bt = (rb.beat_type || 'action') as Beat['beat_type'];

    return {
      beat_id: beatId,
      beat_type: bt,
      emotion: rb.emotion,
      camera_suggestion: rb.camera_suggestion,
      is_ai_generated: rb.is_ai_generated ?? true,
      estimated_duration_seconds: rb.estimated_duration_seconds || estimateDuration(bt),
      music_cue: rb.music_cue,
      source_ref: rb.source_ref_chapter && rb.source_ref_paragraph
        ? {
            chapter: rb.source_ref_chapter,
            paragraph: rb.source_ref_paragraph,
            excerpt: rb.source_ref_excerpt,
          }
        : undefined,
      ...(bt === 'action' || bt === 'montage_start' || bt === 'montage_end' || bt === 'flashback_end'
        ? { action_text: rb.action_text || rb.dialogue_text || '' }
        : {}),
      ...(bt === 'dialogue' || bt === 'voice_over' || bt === 'off_screen'
        ? { character_id: rb.character_id || '', character_name_display: rb.character_name_display, dialogue_text: rb.dialogue_text || '' }
        : {}),
      ...(bt === 'parenthetical'
        ? { character_id: rb.character_id || '', character_name_display: rb.character_name_display, parenthetical_text: rb.parenthetical_text || '' }
        : {}),
      ...(bt === 'transition'
        ? { transition_type: (rb.transition_type || 'CUT_TO') as Extract<Beat, { beat_type: 'transition' }>['transition_type'] }
        : {}),
      ...(bt === 'title_card' ? { title_card_text: rb.title_card_text || '' } : {}),
      ...(bt === 'insert' ? { insert_description: rb.insert_description || '' } : {}),
      ...(bt === 'flashback_start' ? { flashback_label: rb.flashback_label || '' } : {}),
    } as Beat;
  });

  return {
    scene_number: sp.scene_number,
    scene_global_number: sp.scene_global_number,
    location: sp.location,
    time_of_day: sp.time_of_day,
    scene_heading: buildSceneHeading(sp.location.name, sp.location.interior_exterior, sp.time_of_day),
    scene_heading_override: false,
    source_chapter_ref: sp.source_chapter_ref,
    synopsis: sp.synopsis,
    dramatic_function: sp.dramatic_function,
    tension_level: result.tension_level || sp.tension_level || 3,
    characters_present: sp.characters_present || [],
    estimated_duration_seconds: beats.reduce((sum, b) => sum + (b.estimated_duration_seconds || 0), 0),
    beats,
  };
}

/** 构建场景头 */
function buildSceneHeading(
  location: string,
  interiorExterior: string,
  timeOfDay: string
): string {
  return `${interiorExterior}. ${location} — ${timeOfDay}`;
}

/** 估算 beat 时长 */
function estimateDuration(beatType: string): number {
  const map: Record<string, number> = {
    action: 15,
    dialogue: 5,
    parenthetical: 2,
    transition: 1,
    title_card: 5,
    voice_over: 6,
    off_screen: 5,
    montage_start: 2,
    montage_end: 2,
    flashback_start: 3,
    flashback_end: 3,
    insert: 4,
  };
  return map[beatType] || 10;
}

/** 创建空场景（展开失败时的 fallback） */
function createEmptyScene(sp: import('../schema/types').ScenePlan): Scene {
  return {
    scene_number: sp.scene_number,
    scene_global_number: sp.scene_global_number,
    location: sp.location,
    time_of_day: sp.time_of_day,
    scene_heading: buildSceneHeading(sp.location.name, sp.location.interior_exterior, sp.time_of_day),
    scene_heading_override: false,
    synopsis: sp.synopsis,
    dramatic_function: sp.dramatic_function,
    tension_level: sp.tension_level,
    characters_present: sp.characters_present || [],
    estimated_duration_seconds: 0,
    beats: [],
  };
}

/** 构建完整人物表 F40 F41 */
function buildCharacters(plan: AdaptationPlan): Character[] {
  return (plan.characters_draft || []).map((cd) => ({
    character_id: cd.character_id,
    name: cd.name,
    aliases: cd.aliases,
    role_type: cd.role_type || 'supporting',
    description: cd.description,
    arc: cd.arc,
    voice_notes: cd.voice_notes,
    relationships: (cd.relationships || []).map((r) => ({
      target_character_id: r.target_character_id,
      relationship_type: r.relationship_type,
      relationship_description: r.relationship_description,
    })),
  }));
}

/** 构建完整地点表 */
function buildLocations(plan: AdaptationPlan): Location[] {
  return (plan.locations_draft || []).map((ld) => ({
    location_id: ld.location_id,
    name: ld.name,
    location_type: ld.location_type,
    description: ld.description,
    parent_location_id: ld.parent_location_id,
  }));
}
