// ============================================================================
// 改编策略 Prompt 模板 — F19-F24
// ============================================================================

import type { ConversionConfig } from '../../schema/types';

export function buildAdaptationStrategyPrompt(
  analysisSummary: string,
  config: ConversionConfig
): string {
  return `你是一位资深的影视改编策划。请基于以下小说分析结果和目标配置，制定完整的改编策略。

## 小说分析摘要
${analysisSummary}

## 目标配置
- 媒介：${config.target_medium}
- 类型：${config.genre.join('、') || '未指定'}
- 基调：${config.tone}
- 对白密度：${config.dialogue_density}
- 动作详细度：${config.action_detail_level}

## 请输出 JSON 格式（严格遵守，不要 markdown 代码块）：

{
  "tone_adaptation": {
    "source_tone": "原著基调描述",
    "target_tone": "剧本目标基调",
    "notes": "基调转换说明"
  },
  "structural_decisions": [
    {
      "decision": "改编结构决策",
      "rationale": "理由",
      "impact": "high",
      "affected_characters": ["character_id"],
      "affected_chapters": [1, 2, 3]
    }
  ],
  "character_adaptations": [
    {
      "character_id": "原人物ID",
      "action": "keep",
      "notes": "改编说明"
    }
  ],
  "pacing_strategy": {
    "overall_pacing": "varied",
    "high_tension_ratio": 0.4,
    "breathing_room": "节奏缓冲策略描述"
  },
  "externalization_strategy": "内心活动外化策略（如何将心理描写转化为可拍摄内容）",
  "compression_rules": [
    {
      "rule": "压缩规则描述",
      "applies_to": "environment",
      "priority": "must"
    }
  ]
}

## 指引
- tone_adaptation.target_tone: serious/comedic/dark/lighthearted/epic/intimate/mixed
- character_adaptations.action: keep/merge/reduce/expand/cut
- structural_decisions.impact: high/medium/low
- compression_rules.applies_to: environment/action/dialogue/all
- compression_rules.priority: must/should/may
- 请输出纯 JSON，不要包含 markdown 代码块`;
}
