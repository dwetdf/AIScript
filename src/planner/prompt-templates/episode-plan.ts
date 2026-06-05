// ============================================================================
// 幕结构 + 场景大纲 Prompt 模板 — F25-F28
// ============================================================================

import type { AdaptationStrategy, ConversionConfig } from '../../schema/types';

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
- 类型：${config.genre.join('、') || '未指定'}

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
