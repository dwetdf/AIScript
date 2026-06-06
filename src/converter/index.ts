// ============================================================================
// Beat 展开流程编排 — 阶段 3：AdaptationPlan → Screenplay (F32-F45)
// v0.3.0: 支持并行场景处理（batchChatCompletionJson），3-5x 加速
// ============================================================================

import type { Screenplay, AiConfig, AdaptationPlan, Act, Scene, Beat, ScreenplayMetadata, Character, Location, ScenePlan } from '../schema/types';
import { generateBeatId } from '../shared/id-generator';
import { SCHEMA_VERSIONS } from '../shared/constants';
import { chatCompletionJson, batchChatCompletionJson, type ChatMessage } from '../api/client';
import { buildBeatExpansionPrompt } from './prompt-templates/beat-expansion';

/** expandBeats 的可选参数 */
export interface ExpandBeatsOptions {
  /** 并行场景处理的并发数，默认 3 */
  concurrency?: number;
  /** 进度回调：已完成数、总数、当前正在运行的场景摘要 */
  onProgress?: (completed: number, total: number, currentScenes: string[]) => void;
  /** 单个场景完成通知 */
  onSceneComplete?: (sceneGlobalNumber: number, status: 'done' | 'failed') => void;
  /** 中断信号：设置后终止后续场景调用，已完成的保留 */
  signal?: AbortSignal;
}

/** 展平后的场景任务 */
interface SceneTask {
  index: number;
  scenePlan: ScenePlan;
  actNumber: number;
}

/**
 * 阶段 3 主入口：将改编规划展开为完整的 Screenplay
 *
 * @param plan 改编规划
 * @param aiConfig AI 配置
 * @param options 可选：并发数 + 进度回调
 */
export async function expandBeats(
  plan: AdaptationPlan,
  aiConfig: AiConfig,
  options?: ExpandBeatsOptions
): Promise<Screenplay> {
  const episode = 1;
  const concurrency = options?.concurrency ?? 3;

  // 构建 characters 和 locations（非瓶颈，先构建）
  const characters = buildCharacters(plan);
  const locations = buildLocations(plan);

  // 展平所有场景为任务列表（保持原始顺序）
  const tasks = flattenSceneTasks(plan);

  // 构建 AI 任务
  const aiTasks = tasks.map((t) => {
    const { system, user } = buildBeatExpansionPrompt(
      t.scenePlan,
      t.scenePlan.source_context,
      t.scenePlan.beat_plan
    );
    return {
      messages: [
        { role: 'system' as const, content: system },
        { role: 'user' as const, content: user },
      ] as ChatMessage[],
      config: aiConfig,
      options: { temperature: 0.7, maxTokens: 8192 },
    };
  });

  // 跟踪并行运行中的场景名称
  const runningScenes = new Map<number, string>();

  // 并行执行（带进度回调 + 中断信号）
  const rawResults = await batchChatCompletionJson<{
    beats: Array<Record<string, unknown>>;
    tension_level?: number;
  }>(
    aiTasks,
    concurrency,
    (index, result, error) => {
      const task = tasks[index];
      if (!task) return;

      runningScenes.delete(index);
      if (result !== null) {
        const sceneNum = task.scenePlan.scene_global_number;
        options?.onSceneComplete?.(sceneNum, 'done');
      } else {
        options?.onSceneComplete?.(task.scenePlan.scene_global_number, 'failed');
      }
    },
    options?.signal // 传递中断信号
  );

  // 每个任务开始时更新 runningScenes（我们在 batch fn 外部追踪）
  // 重组结果：按 index 放回 Act → Scene 结构
  const actMap = new Map<number, Scene[]>();
  for (const actPlan of plan.episode_plan.acts) {
    actMap.set(actPlan.act_number, []);
  }

  let completedCount = 0;
  for (const task of tasks) {
    const raw = rawResults[task.index];
    const scene = raw
      ? buildScene(task.scenePlan, episode, task.actNumber, raw)
      : createEmptyScene(task.scenePlan);

    actMap.get(task.actNumber)!.push(scene);
    completedCount++;
  }

  // 构建 Act 数组
  const acts: Act[] = plan.episode_plan.acts.map((actPlan) => ({
    act_number: actPlan.act_number,
    act_title: actPlan.act_title,
    act_type: actPlan.act_type || 'other',
    synopsis: actPlan.synopsis,
    scenes: actMap.get(actPlan.act_number) || [],
  }));

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

/**
 * 将 AdaptationPlan 中的所有场景展平为统一任务列表
 * 保持原始顺序（按 act_number + scene_global_number）
 */
function flattenSceneTasks(plan: AdaptationPlan): SceneTask[] {
  const tasks: SceneTask[] = [];
  let index = 0;

  for (const actPlan of plan.episode_plan.acts) {
    const actScenes = plan.scene_plan.filter(
      (sp) => sp.act_number === actPlan.act_number
    );
    for (const sp of actScenes) {
      tasks.push({ index, scenePlan: sp, actNumber: actPlan.act_number });
      index++;
    }
  }

  return tasks;
}

/**
 * 将 AI 返回的 raw beats 转换为类型化 Scene
 */
function buildScene(
  sp: ScenePlan,
  episode: number,
  actNumber: number,
  result: { beats: Array<Record<string, unknown>>; tension_level?: number }
): Scene {
  const beats: Beat[] = (result.beats || []).map((rb, idx) => {
    const beatId = generateBeatId(episode, actNumber, sp.scene_global_number, idx + 1);
    const bt = (rb.beat_type as Beat['beat_type']) || 'action';

    return {
      beat_id: beatId,
      beat_type: bt,
      emotion: rb.emotion as string | undefined,
      camera_suggestion: rb.camera_suggestion as string | undefined,
      is_ai_generated: (rb.is_ai_generated as boolean) ?? true,
      estimated_duration_seconds: (rb.estimated_duration_seconds as number) || estimateDuration(bt),
      music_cue: rb.music_cue as string | undefined,
      source_ref: rb.source_ref_chapter && rb.source_ref_paragraph
        ? {
            chapter: rb.source_ref_chapter as number,
            paragraph: rb.source_ref_paragraph as number,
            excerpt: rb.source_ref_excerpt as string,
          }
        : undefined,
      ...(['action', 'montage_start', 'montage_end', 'flashback_end'].includes(bt)
        ? { action_text: (rb.action_text as string) || (rb.dialogue_text as string) || '' }
        : {}),
      ...(['dialogue', 'voice_over', 'off_screen'].includes(bt)
        ? { character_id: (rb.character_id as string) || '', character_name_display: rb.character_name_display as string | undefined, dialogue_text: (rb.dialogue_text as string) || '' }
        : {}),
      ...(bt === 'parenthetical'
        ? { character_id: (rb.character_id as string) || '', character_name_display: rb.character_name_display as string | undefined, parenthetical_text: (rb.parenthetical_text as string) || '' }
        : {}),
      ...(bt === 'transition'
        ? { transition_type: ((rb.transition_type as string) || 'CUT_TO') as Extract<Beat, { beat_type: 'transition' }>['transition_type'] }
        : {}),
      ...(bt === 'title_card' ? { title_card_text: (rb.title_card_text as string) || '' } : {}),
      ...(bt === 'insert' ? { insert_description: (rb.insert_description as string) || '' } : {}),
      ...(bt === 'flashback_start' ? { flashback_label: (rb.flashback_label as string) || '' } : {}),
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
export function createEmptyScene(sp: ScenePlan): Scene {
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
