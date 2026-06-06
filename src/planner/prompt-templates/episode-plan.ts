// ============================================================================
// 幕结构 + 场景大纲 Prompt 模板 — F25-F28
// ============================================================================

import type { AdaptationStrategy, ConversionConfig } from '../../schema/types';

/** 根据媒介 + 篇幅生成时长描述 */
function durationDescription(config: ConversionConfig): string {
  const dur = config.target_duration;
  if (!dur) return '未指定';
  const labels: Record<string, string> = {
    short: '短篇（约20-30分钟）',
    mid: '中篇（约45-60分钟）',
    standard: '标准（约90分钟）',
    feature: '长片（约120分钟）',
    extended: '超长（约150分钟以上）',
  };
  const base = labels[dur] ?? dur;
  switch (config.target_medium) {
    case 'film':
    case 'stage_play':
      return `全片篇幅：${base}`;
    case 'tv_series':
    case 'web_series':
    case 'audio_drama':
      return `每集篇幅：${base}${config.total_episodes ? `，共 ${config.total_episodes} 集` : ''}`;
    default:
      return base;
  }
}

/** 根据忠实度枚举值生成描述 */
function fidelityDescription(f: string): string {
  const map: Record<string, string> = {
    faithful: '忠实改编 — 尽可能保留原著结构和人物，仅做影视化必要调整',
    balanced: '适度重构 — 保留核心情节和人物，合并支线、调整节奏',
    bold: '大幅重构 — 以原著为核心素材重新组织叙事结构',
    inspired: '只取创意 — 仅保留世界观/核心设定，剧情和人物大幅原创',
  };
  return map[f] ?? f;
}

export function buildEpisodePlanPrompt(
  plotSummary: string,
  strategy: AdaptationStrategy,
  config: ConversionConfig
): string {
  return `你是一位专业的影视结构设计师。请基于以下剧情分析，设计完整的幕结构和场景大纲。

## 剧情分析
${plotSummary}

## 改编策略
${JSON.stringify({
  tone: strategy.tone_adaptation,
  pacing: strategy.pacing_strategy,
  structural: strategy.structural_decisions,
  externalization: strategy.externalization_strategy,
  compression: strategy.compression_rules,
})}

## 目标配置
- 媒介：${config.target_medium}
- 目标时长：${durationDescription(config)}
- 改编忠实度：${fidelityDescription(config.adaptation_fidelity)}
${config.custom_instructions ? `\n## 用户补充指令\n${config.custom_instructions}` : ''}

## 请输出 JSON 格式：

{
  "total_acts": 1,
  "acts": [
    {
      "act_number": 1,
      "act_title": "第一幕 标题",
      "act_type": "setup",
      "synopsis": "本幕故事梗概",
      "estimated_scene_count": 8,
      "estimated_duration_minutes": 45,
      "key_moments": [
        {"moment": "关键时刻", "from_chapter": 1, "dramatic_function": "inciting_incident"}
      ],
      "source_chapters": [1, 2, 3]
    }
  ],
  "scene_plan": [
    {
      "scene_global_number": 1,
      "act_number": 1,
      "scene_number": 1,
      "location": {
        "name": "地点名",
        "interior_exterior": "INT",
        "set_description": "布景简述"
      },
      "time_of_day": "夜",
      "synopsis": "本场景故事梗概",
      "dramatic_function": "inciting_incident",
      "tension_level": 4,
      "characters_present": ["character_id"],
      "source_chapter_ref": "第一章",
      "beat_plan": {
        "estimated_beat_count": 16,
        "key_beats": [
          {
            "order": 1,
            "beat_type": "action",
            "description": "该节拍的叙事内容",
            "character_id": "说话角色ID（仅对白类节拍）",
            "from_source": true
          }
        ],
        "notes": "本场景展开特殊说明"
      }
    }
  ]
}

## 指引
- act_type: setup/confrontation/resolution/other
- dramatic_function: inciting_incident/plot_point/midpoint/climax/exposition/character_moment/action/transition/other
- interior_exterior: INT/EXT/INT_EXT
- tension_level: 1-5 整数
- from_source: 该节拍是否直接来自原著
- 请输出纯 JSON，不要包含 markdown 代码块`;
}

/**
 * 场景大纲专用 Prompt — 保留用户修改后的幕结构，
 * 只请求 AI 根据幕信息重新生成 scene_plan
 */
export function buildScenePlanOnlyPrompt(
  plotSummary: string,
  strategy: AdaptationStrategy,
  config: ConversionConfig,
  acts: Array<{ act_number: number; act_title?: string; act_type: string; synopsis: string }>
): string {
  return `你是一位专业的影视结构设计师。请基于给定的幕结构，为每一幕生成场景大纲。

## 剧情分析
${plotSummary}

## 改编策略
${JSON.stringify({
  tone: strategy.tone_adaptation,
  pacing: strategy.pacing_strategy,
  structural: strategy.structural_decisions,
  externalization: strategy.externalization_strategy,
  compression: strategy.compression_rules,
})}

## 目标配置
- 媒介：${config.target_medium}
- 目标时长：${durationDescription(config)}
- 改编忠实度：${fidelityDescription(config.adaptation_fidelity)}
${config.custom_instructions ? `\n## 用户补充指令\n${config.custom_instructions}` : ''}

## 已确定的幕结构（你必须按此结构生成场景）
${JSON.stringify(acts.map(a => ({
  act_number: a.act_number,
  act_title: a.act_title,
  act_type: a.act_type,
  synopsis: a.synopsis,
})), null, 2)}

## 请输出 JSON 格式：

{
  "scene_plan": [
    {
      "scene_global_number": 1,
      "act_number": 1,
      "scene_number": 1,
      "location": { "name": "地点名", "interior_exterior": "INT", "set_description": "布景简述" },
      "time_of_day": "夜",
      "synopsis": "本场景故事梗概",
      "dramatic_function": "inciting_incident",
      "tension_level": 4,
      "characters_present": ["character_id"],
      "source_chapter_ref": "第一章",
      "beat_plan": {
        "estimated_beat_count": 16,
        "key_beats": [
          { "order": 1, "beat_type": "action", "description": "该节拍的叙事内容", "character_id": "说话角色ID", "from_source": true }
        ],
        "notes": "本场景展开特殊说明"
      }
    }
  ]
}

## 指引
- dramatic_function: inciting_incident/plot_point/midpoint/climax/exposition/character_moment/action/transition/other
- interior_exterior: INT/EXT/INT_EXT
- tension_level: 1-5 整数
- from_source: 该节拍是否直接来自原著
- 请输出纯 JSON，不要包含 markdown 代码块`;
}
