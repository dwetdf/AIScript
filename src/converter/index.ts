// ============================================================================
// Beat 展开流程编排 — 阶段 3：AdaptationPlan → Screenplay (F32-F45)
// v0.3.0: 支持并行场景处理（batchChatCompletionJson），3-5x 加速
// ============================================================================

import type { Screenplay, AiConfig, AdaptationPlan, Act, Scene, Beat, ScreenplayMetadata, Character, Location, ScenePlan } from '../schema/types';
import { generateBeatId } from '../shared/id-generator';
import { SCHEMA_VERSIONS, DEFAULT_PER_ACT_CONCURRENCY } from '../shared/constants';
import { chatCompletionJson, batchChatCompletionJson, type ChatMessage } from '../api/client';
import { buildBeatExpansionPrompt, type WritingStyle } from './prompt-templates/beat-expansion';

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
  /** 用户自定义补充指令，注入到每个场景的 system prompt 中 */
  customInstructions?: string;
  /** 写作风格参数（对白密度 / 动作详细度 / 舞台指示风格） */
  writingStyle?: WritingStyle;
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
  const customInstructions = options?.customInstructions;
  const writingStyle = options?.writingStyle;
  const aiTasks = tasks.map((t) => {
    const { system, user } = buildBeatExpansionPrompt(
      t.scenePlan,
      t.scenePlan.source_context,
      t.scenePlan.beat_plan,
      customInstructions,
      writingStyle
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
 * Act分组并行展开：每个Act独立并发处理，所有Act并行
 *
 * 多Act时比 expandBeats 快 50%+：不同Act的场景互不阻塞
 * 单Act时退化为 expandBeats
 */
export async function actGroupedExpandBeats(
  plan: AdaptationPlan,
  aiConfig: AiConfig,
  options?: ExpandBeatsOptions & { perActConcurrency?: number }
): Promise<Screenplay> {
  const episode = 1;
  const perActConcurrency = options?.perActConcurrency ?? DEFAULT_PER_ACT_CONCURRENCY;
  const customInstructions = options?.customInstructions;
  const writingStyle = options?.writingStyle;

  // 构建 characters 和 locations（非瓶颈，先构建）
  const characters = buildCharacters(plan);
  const locations = buildLocations(plan);

  // 按 Act 分组任务
  const actTaskGroups = plan.episode_plan.acts.map((actPlan) => {
    const actScenes = plan.scene_plan.filter(sp => sp.act_number === actPlan.act_number);
    const tasks: SceneTask[] = [];
    let idx = 0;
    for (const sp of actScenes) {
      tasks.push({ index: idx, scenePlan: sp, actNumber: actPlan.act_number });
      idx++;
    }
    return { actNumber: actPlan.act_number, tasks };
  });

  // 所有 Act 并行启动
  const actResults = await Promise.all(
    actTaskGroups.map(async ({ actNumber, tasks }) => {
      const aiTasks = tasks.map((t) => {
        const { system, user } = buildBeatExpansionPrompt(
          t.scenePlan, t.scenePlan.source_context, t.scenePlan.beat_plan,
          customInstructions, writingStyle
        );
        return {
          messages: [{ role: 'system' as const, content: system }, { role: 'user' as const, content: user }] as ChatMessage[],
          config: aiConfig,
          options: { temperature: 0.7, maxTokens: 8192 },
        };
      });

      const rawResults = await batchChatCompletionJson<{
        beats: Array<Record<string, unknown>>;
        tension_level?: number;
      }>(
        aiTasks,
        perActConcurrency,
        (index, result, error) => {
          const t = tasks[index];
          if (!t) return;
          if (result !== null) {
            options?.onSceneComplete?.(t.scenePlan.scene_global_number, 'done');
          } else {
            options?.onSceneComplete?.(t.scenePlan.scene_global_number, 'failed');
          }
        },
        options?.signal
      );

      // Build scenes for this act
      const scenes: Scene[] = [];
      for (let i = 0; i < tasks.length; i++) {
        const raw = rawResults[i];
        scenes.push(
          raw
            ? buildScene(tasks[i].scenePlan, episode, actNumber, raw)
            : createEmptyScene(tasks[i].scenePlan)
        );
      }
      return { actNumber, scenes };
    })
  );

  // Reassemble into act order
  const acts: Act[] = plan.episode_plan.acts.map((actPlan) => {
    const group = actResults.find(g => g.actNumber === actPlan.act_number);
    return {
      act_number: actPlan.act_number,
      act_title: actPlan.act_title,
      act_type: actPlan.act_type || 'other',
      synopsis: actPlan.synopsis,
      scenes: group?.scenes || [],
    };
  });

  const totalRuntimeMinutes = Math.ceil(
    acts.reduce((sum, act) =>
      sum + act.scenes.reduce((sSum, scene) =>
        sSum + (scene.estimated_duration_seconds || scene.beats.reduce((bSum, b) => bSum + (b.estimated_duration_seconds || 0), 0)), 0), 0
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

  return {
    schema_version: SCHEMA_VERSIONS.screenplay,
    revision_history: [{
      revision_number: 1,
      timestamp: new Date().toISOString(),
      author: 'AI',
      change_summary: 'AI 初始生成 (Act分组并行)',
    }],
    metadata, characters, locations, acts,
    production_notes: {
      adaptation_decisions: plan.adaptation_strategy.structural_decisions.map((d) => ({
        decision: d.decision, rationale: d.rationale,
      })),
    },
  };
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
  const beats = parseBeatsFromResult(result, sp.scene_global_number, actNumber, episode);

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

/** 单场景重新生成结果 */
export interface ExpandSingleSceneResult {
  beats: Beat[];
  tension_level: number;
}

/**
 * 单独重新生成一个场景的 beats（不经过 batch）
 *
 * @param scenePlan 该场景的 scene_plan
 * @param aiConfig AI 配置
 * @param options 可选：mode（rewrite 完全重写 / improve 基于现有优化）、previousBeats（现有 beats）、signal（中断）、characters（人物表）、locations（地点表）
 */
export async function expandSingleScene(
  scenePlan: ScenePlan,
  aiConfig: AiConfig,
  options?: {
    mode?: 'rewrite' | 'improve';
    previousBeats?: Beat[];
    characters?: Character[];
    locations?: Location[];
    signal?: AbortSignal;
  }
): Promise<ExpandSingleSceneResult> {
  const { system, user } = buildBeatExpansionPrompt(
    scenePlan,
    scenePlan.source_context,
    scenePlan.beat_plan
  );

  let userContent = user;

  // Append character info if relevant to this scene
  if (options?.characters?.length && scenePlan.characters_present?.length) {
    const presentIds = new Set(scenePlan.characters_present);
    const relevant = options.characters.filter(c => presentIds.has(c.character_id) || presentIds.has(c.name));
    if (relevant.length > 0) {
      userContent += '\n\n## 出场人物详情\n' + relevant.map(c => {
        const parts = [`- ${c.character_id}: ${c.name}`];
        if (c.role_type) parts.push(`(${c.role_type})`);
        if (c.description) parts.push(`— ${c.description}`);
        if (c.voice_notes) parts.push(`[语气: ${c.voice_notes}]`);
        if (c.arc) parts.push(`[弧光: ${c.arc}]`);
        if (c.relationships?.length) {
          const rels = c.relationships.map(r => {
            const targetChar = options.characters!.find(cc => cc.character_id === r.target_character_id);
            return `${targetChar?.name || r.target_character_id}(${r.relationship_type})`;
          }).join('、');
          if (rels) parts.push(`[关系: ${rels}]`);
        }
        return parts.join(' ');
      }).join('\n');
    }
  }

  // Append location details
  if (options?.locations?.length && scenePlan.location?.location_id) {
    const loc = options.locations.find(l => l.location_id === scenePlan.location.location_id);
    if (loc?.description) {
      userContent += `\n\n## 地点描述\n${scenePlan.location.name}: ${loc.description}`;
    }
  }

  const messages: ChatMessage[] = [{ role: 'system' as const, content: system }];

  // For improve mode, append current beats as full reference (preserve all fields)
  if (options?.mode === 'improve' && options.previousBeats?.length) {
    const prevFull = options.previousBeats.map((b) => {
      const entry: Record<string, unknown> = {
        beat_type: b.beat_type,
        is_ai_generated: b.is_ai_generated,
        estimated_duration_seconds: b.estimated_duration_seconds,
      };
      if (b.emotion) entry.emotion = b.emotion;
      if (b.camera_suggestion) entry.camera_suggestion = b.camera_suggestion;
      if (b.music_cue) entry.music_cue = b.music_cue;
      if ('action_text' in b) entry.action_text = b.action_text;
      if ('character_id' in b) {
        entry.character_id = b.character_id;
        if ('character_name_display' in b) entry.character_name_display = b.character_name_display;
      }
      if ('dialogue_text' in b) entry.dialogue_text = b.dialogue_text;
      if ('parenthetical_text' in b) entry.parenthetical_text = b.parenthetical_text;
      if ('transition_type' in b) entry.transition_type = b.transition_type;
      if ('title_card_text' in b) entry.title_card_text = b.title_card_text;
      if ('flashback_label' in b) entry.flashback_label = b.flashback_label;
      if ('insert_description' in b) entry.insert_description = b.insert_description;
      if (b.source_ref) entry.source_ref = b.source_ref;
      return entry;
    });
    messages.push({
      role: 'user' as const,
      content: userContent + '\n\n## 当前版本（请在此基础上优化改进，保持结构和核心内容，优化对白和动作描写）\n```json\n' + JSON.stringify(prevFull, null, 2) + '\n```',
    });
  } else {
    messages.push({ role: 'user' as const, content: userContent });
  }

  const result = await chatCompletionJson<{
    beats: Array<Record<string, unknown>>;
    tension_level?: number;
  }>(messages, aiConfig, { temperature: 0.7, maxTokens: 8192, signal: options?.signal });

  const beats = parseBeatsFromResult(result, scenePlan.scene_global_number, scenePlan.act_number);
  return { beats, tension_level: result.tension_level || scenePlan.tension_level || 3 };
}

/**
 * 将 AI 返回的 raw beats 转换为类型化 Beat[]（复用于 expandBeats 和 expandSingleScene）
 */
function parseBeatsFromResult(
  result: { beats: Array<Record<string, unknown>>; tension_level?: number },
  sceneGlobalNumber: number,
  actNumber: number,
  episode: number = 1
): Beat[] {
  return (result.beats || []).map((rb, idx) => {
    const beatId = generateBeatId(episode, actNumber, sceneGlobalNumber, idx + 1);
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
