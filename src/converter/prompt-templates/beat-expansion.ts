// ============================================================================
// Beat 展开 Prompt 模板 — F32-F36
// 核心：将 source_context + beat_plan 一起注入 Prompt
// ============================================================================

import type { ScenePlan, SourceContext, BeatPlan } from '../../schema/types';

/**
 * 构建单场景 beat 展开 Prompt
 * 注入完整的 source_context 和 beat_plan
 */
export function buildBeatExpansionPrompt(
  scenePlan: ScenePlan,
  sourceContext?: SourceContext,
  beatPlan?: BeatPlan
): string {
  const parts: string[] = [];

  // 场景基本信息
  parts.push(`你是一个专业的剧本写手。请将以下场景大纲展开为完整的剧情节拍（beat）序列。

## 场景信息
- 场景号：${scenePlan.scene_global_number}
- 地点：${scenePlan.location.name}（${scenePlan.location.interior_exterior}）
- 时间：${scenePlan.time_of_day}
- 叙事功能：${scenePlan.dramatic_function}
- 梗概：${scenePlan.synopsis}
${scenePlan.characters_present ? `- 出场人物：${scenePlan.characters_present.join('、')}` : ''}
`);

  // 原文上下文（防漂移关键）
  if (sourceContext) {
    parts.push(`## 原著原文上下文

### 情节概述
${sourceContext.summary}
`);

    if (sourceContext.key_dialogues?.length) {
      parts.push('### 关键对白原文');
      for (const kd of sourceContext.key_dialogues) {
        parts.push(`- ${kd.speaker}："${kd.text}"${kd.context_note ? ` — ${kd.context_note}` : ''}`);
      }
    }

    if (sourceContext.key_actions?.length) {
      parts.push('### 关键动作描写');
      for (const ka of sourceContext.key_actions) {
        parts.push(`- ${ka.description}`);
      }
    }

    if (sourceContext.key_descriptions?.length) {
      parts.push('### 环境/气氛描写');
      for (const kd of sourceContext.key_descriptions) {
        parts.push(`- ${kd}`);
      }
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
- 关键节拍：\n${keyBeatsStr}
${beatPlan.notes ? `- 特殊说明：${beatPlan.notes}` : ''}
`);
  }

  // 输出格式
  parts.push(`## 输出格式
请以 JSON 格式输出：

{
  "tension_level": 4,
  "beats": [
    {
      "beat_type": "action",
      "action_text": "动作描写，现在时态，第三人称，只描述可见/可听内容",
      "is_ai_generated": false,
      "source_ref_chapter": 1,
      "source_ref_paragraph": 3,
      "source_ref_excerpt": "原文关键句片段",
      "estimated_duration_seconds": 20,
      "emotion": "紧张",
      "music_cue": "弦乐渐起（可选）"
    },
    {
      "beat_type": "dialogue",
      "character_id": "li_bi",
      "character_name_display": "李泌",
      "dialogue_text": "对白内容，不加引号",
      "is_ai_generated": false,
      "estimated_duration_seconds": 5,
      "emotion": "冷静而紧迫"
    },
    {
      "beat_type": "parenthetical",
      "character_id": "zhang_xiaojing",
      "character_name_display": "张小敬",
      "parenthetical_text": "（停顿，打量李泌）",
      "is_ai_generated": true,
      "estimated_duration_seconds": 3
    },
    {
      "beat_type": "transition",
      "transition_type": "CUT_TO",
      "estimated_duration_seconds": 1
    }
  ]
}

## 重要规则
1. 基于原文对白改编（不要凭空编造核心对白内容）
2. is_ai_generated: true — AI 新增的过渡/外化内容；false — 直接基于原文的内容
3. source_ref 仅对源于原文的 beat 填写，AI 过渡内容不填
4. beat_type 可选值：action/dialogue/parenthetical/transition/title_card/voice_over/off_screen/flashback_start/flashback_end/insert
5. transition_type 可选值：CUT_TO/FADE_IN/FADE_OUT/FADE_TO_BLACK/DISSOLVE_TO/SMASH_CUT/MATCH_CUT/WIPE_TO
6. tension_level: 1-5 整数
7. 对白不加引号，剧本格式
8. 请输出纯 JSON，不要包含 markdown 代码块标记`);

  return parts.join('\n\n');
}
