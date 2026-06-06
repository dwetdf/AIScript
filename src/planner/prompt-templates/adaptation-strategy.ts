// ============================================================================
// 改编策略 Prompt 模板 — F19-F24
// ============================================================================

import type { ConversionConfig } from '../../schema/types';

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

export function buildAdaptationStrategyPrompt(
  analysisSummary: string,
  config: ConversionConfig
): string {
  return `你是一位资深的影视改编策划。请基于以下小说分析结果和目标配置，制定完整的改编策略。

## 小说分析摘要
${analysisSummary}

## 目标配置
- 媒介：${config.target_medium}
- 目标时长：${durationDescription(config)}
- 基调：${config.tone}
- 改编忠实度：${fidelityDescription(config.adaptation_fidelity)}
${config.custom_instructions ? `\n## 用户补充指令\n${config.custom_instructions}` : ''}

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
