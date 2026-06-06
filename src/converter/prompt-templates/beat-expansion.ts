// ============================================================================
// Beat 展开 Prompt 模板 — F32-F36
// 核心：将 source_context + beat_plan 一起注入 Prompt
// v0.3.0: 格式说明移入系统消息，user 消息只含场景数据（节省 300-500 tokens/场景）
// ============================================================================

import type { ScenePlan, SourceContext, BeatPlan } from '../../schema/types';

/** Prompt 拆分结果 */
export interface BeatExpansionPrompt {
  /** 系统消息（格式说明 + 规则，所有场景共用） */
  system: string;
  /** 用户消息（场景特定数据） */
  user: string;
}

/** 写作风格参数 */
export interface WritingStyle {
  dialogue_density: 'sparse' | 'balanced' | 'dense';
  action_detail_level: 'minimal' | 'standard' | 'detailed';
  stage_direction_style: 'concise' | 'descriptive';
}

/**
 * 构建单场景 beat 展开 Prompt
 * 返回拆分的 system + user，格式说明只出现在 system 中（所有并发场景共用/相似）
 */
export function buildBeatExpansionPrompt(
  scenePlan: ScenePlan,
  sourceContext?: SourceContext,
  beatPlan?: BeatPlan,
  customInstructions?: string,
  writingStyle?: WritingStyle
): BeatExpansionPrompt {
  const system = buildSystemPrompt(customInstructions, writingStyle);
  const user = buildUserPrompt(scenePlan, sourceContext, beatPlan);
  return { system, user };
}

/** 系统消息：角色定义 + 输出格式 + 规则（所有场景共用，不随场景变化） */
function buildSystemPrompt(customInstructions?: string, writingStyle?: WritingStyle): string {
  const parts: string[] = [];

  parts.push('你是一个专业的剧本写手。将场景大纲展开为完整的剧情节拍（beat）序列，输出纯 JSON。');

  // 写作风格指引
  if (writingStyle) {
    const densityLabel: Record<string, string> = { sparse: '稀疏——以动作和描写为主，对白精简', balanced: '均衡——对白与动作比例适中', dense: '密集——以对白为主，用对话推动剧情' };
    const actionLabel: Record<string, string> = { minimal: '简洁——只写关键动作，省略细节', standard: '标准——保留必要动作描写', detailed: '详细——充分描写动作和环境细节' };
    const stageLabel: Record<string, string> = { concise: '简洁——舞台指示简短精炼', descriptive: '描述性——舞台指示包含更多氛围和情绪描写' };

    parts.push(`## 写作风格
- 对白密度：${densityLabel[writingStyle.dialogue_density] || writingStyle.dialogue_density}
- 动作详细度：${actionLabel[writingStyle.action_detail_level] || writingStyle.action_detail_level}
- 舞台指示风格：${stageLabel[writingStyle.stage_direction_style] || writingStyle.stage_direction_style}

请严格遵循以上写作风格来展开节拍。`);
  }

  // 用户补充指令
  if (customInstructions) {
    parts.push(`## 用户补充指令\n${customInstructions}\n\n请严格遵守以上用户补充指令来指导节拍展开的风格和重点。`);
  }

  parts.push(`## 输出 JSON 结构
{ "tension_level": <number 1-5>, "beats": [ <beat objects> ] }

## Beat 类型与字段速查
- action: { beat_type: "action", action_text: "现在时第三人称，仅可见/可听内容", estimated_duration_seconds, emotion?, music_cue?, is_ai_generated?, source_ref_chapter?, source_ref_paragraph?, source_ref_excerpt? }
- dialogue: { beat_type: "dialogue", character_id, character_name_display?, dialogue_text: "不加引号", estimated_duration_seconds, emotion?, is_ai_generated?, source_ref_chapter?, source_ref_paragraph?, source_ref_excerpt? }
- parenthetical: { beat_type: "parenthetical", character_id, character_name_display?, parenthetical_text, estimated_duration_seconds }
- transition: { beat_type: "transition", transition_type: "CUT_TO|FADE_IN|FADE_OUT|FADE_TO_BLACK|DISSOLVE_TO|SMASH_CUT|MATCH_CUT|WIPE_TO", estimated_duration_seconds: 1 }
- voice_over / off_screen: 同 dialogue 字段
- flashback_start: { beat_type: "flashback_start", flashback_label }
- flashback_end: { beat_type: "flashback_end", action_text }
- title_card: { beat_type: "title_card", title_card_text }
- insert: { beat_type: "insert", insert_description }
- montage_start / montage_end: 同 action 字段

## 重要规则
1. 基于原文对白改编，不凭空编造核心对白内容
2. is_ai_generated: true — AI 新增过渡/外化内容；false — 直接基于原文
3. source_ref 仅对源于原文的 beat 填写（chapter/paragraph/excerpt），AI 过渡内容不填
4. 对白不加引号，剧本格式
5. 请输出纯 JSON，不要包含 markdown 代码块标记`);

  return parts.join('\n\n');
}

/** 用户消息：场景特定数据（每个场景不同） */
function buildUserPrompt(
  scenePlan: ScenePlan,
  sourceContext?: SourceContext,
  beatPlan?: BeatPlan
): string {
  const parts: string[] = [];

  // 场景基本信息
  parts.push(`## 场景信息
- 场景号：${scenePlan.scene_global_number}
- 地点：${scenePlan.location.name}（${scenePlan.location.interior_exterior}）
- 时间：${scenePlan.time_of_day}
- 叙事功能：${scenePlan.dramatic_function}
- 梗概：${scenePlan.synopsis}
${scenePlan.characters_present ? `- 出场人物：${scenePlan.characters_present.join('、')}` : ''}`);

  // 原文上下文（防漂移关键）
  if (sourceContext) {
    parts.push(`## 原著原文上下文

### 情节概述
${sourceContext.summary}`);

    if (sourceContext.key_dialogues?.length) {
      const dialogues = sourceContext.key_dialogues
        .slice(0, 8) // 限制数量避免 prompt 过长
        .map((kd) => `- ${kd.speaker}："${kd.text}"${kd.context_note ? ` — ${kd.context_note}` : ''}`)
        .join('\n');
      parts.push(`### 关键对白原文\n${dialogues}`);
    }

    if (sourceContext.key_actions?.length) {
      const actions = sourceContext.key_actions
        .slice(0, 5)
        .map((ka) => `- ${ka.description}`)
        .join('\n');
      parts.push(`### 关键动作描写\n${actions}`);
    }

    if (sourceContext.key_descriptions?.length) {
      const descs = sourceContext.key_descriptions
        .slice(0, 5)
        .map((kd) => `- ${kd}`)
        .join('\n');
      parts.push(`### 环境/气氛描写\n${descs}`);
    }

    if (sourceContext.adaptation_notes) {
      parts.push(`### 改编注意事项\n${sourceContext.adaptation_notes}`);
    }
  }

  // beat_plan 指导
  if (beatPlan) {
    const keyBeatsStr = (beatPlan.key_beats || []).map((kb) =>
      `  ${kb.order}. [${kb.beat_type || 'auto'}] ${kb.description}${kb.character_id ? ` (${kb.character_id})` : ''}${kb.from_source ? ' ← 源于原著' : ''}`
    ).join('\n');

    parts.push(`## Beat 展开指导
- 预估节拍数：${beatPlan.estimated_beat_count || '8-20'}
- 关键节拍：
${keyBeatsStr}
${beatPlan.notes ? `- 特殊说明：${beatPlan.notes}` : ''}`);
  }

  return parts.join('\n\n');
}
