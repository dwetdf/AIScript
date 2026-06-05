// ============================================================================
// 阶段 1 Prompt 模板 — 完整分析 Prompt
// 一次性让 AI 输出主题、世界观、剧情、人物、章节的完整结构化分析
// ============================================================================

/**
 * 构建 AI 分析用的完整小说文本
 */
export function buildNovelText(novel: { title: string; chapters: Array<{ chapterNumber: number; title?: string; paragraphs: Array<{ index: number; text: string }> }> }): string {
  let text = `小说标题：${novel.title}\n\n`;

  for (const ch of novel.chapters) {
    text += `\n=== 第${ch.chapterNumber}章${ch.title ? ` ${ch.title}` : ''} ===\n`;
    for (const p of ch.paragraphs) {
      text += p.text + '\n';
    }
  }

  return text;
}

/**
 * 构建完整分析 Prompt
 * AI 一次性输出所有维度的结构化分析
 */
export function buildFullAnalysisPrompt(novelText: string): string {
  return `你是一位专业的小说分析专家和剧本改编顾问。请仔细分析以下小说文本，输出完整的结构化分析。

${novelText}

---

请以 JSON 格式输出以下结构（严格遵守 JSON 格式，不要 markdown 代码块）：

{
  "theme_analysis": {
    "core_themes": [
      {"theme": "主题名", "description": "该主题在小说中的具体体现", "embodied_by": ["关键人物或事件"]}
    ],
    "secondary_themes": [
      {"theme": "次要主题", "description": "简述"}
    ],
    "tonal_characteristics": ["基调特征词1", "基调特征词2"]
  },
  "world_building": {
    "era": "时代背景",
    "setting_scale": "city",
    "key_locations": [
      {"name": "地点名", "significance": "地点在故事中的功能", "associated_characters": ["人物名"]}
    ],
    "power_system": "权力/力量体系描述",
    "rules_and_constraints": ["世界规则限制"],
    "atmosphere": "整体氛围描述"
  },
  "plot_analysis": {
    "main_plot": {
      "description": "主线概述（一两句话）",
      "stakes": "核心赌注/失败后果"
    },
    "sub_plots": [
      {"description": "支线描述", "connection_to_main": "与主线的关联", "key_characters": ["人物名"]}
    ],
    "core_conflict": {
      "type": "person_vs_society",
      "description": "冲突描述",
      "conflict_layers": [
        {"layer": "层面名", "description": "该层面的冲突"}
      ]
    },
    "key_events": [
      {
        "event": "关键事件名",
        "chapter": 1,
        "description": "事件简述",
        "dramatic_function": "inciting_incident"
      }
    ],
    "narrative_structure": {
      "timeline_type": "linear",
      "pov_type": "multiple",
      "narrative_devices": ["叙事技巧"],
      "pacing_summary": "节奏特点总结"
    }
  },
  "character_analysis": [
    {
      "name": "人物名",
      "aliases": ["别名"],
      "role": "protagonist",
      "importance": "essential",
      "identity": "身份背景",
      "motivation": {"external": "外部动机", "internal": "内心动机"},
      "character_arc": "人物弧线描述",
      "relationships": [
        {"target": "对方名字", "type": "ally", "description": "关系描述", "dynamics": "关系变化"}
      ],
      "distinctive_traits": {
        "speech_style": "对白风格",
        "catchphrases": ["口头禅"],
        "habits": ["习惯动作"],
        "appearance": "外貌特征"
      },
      "adaptability_notes": "改编注意事项"
    }
  ],
  "chapter_summaries": [
    {
      "chapter_number": 1,
      "summary": "本章核心内容（200字内）",
      "key_events": ["本章关键事件"],
      "characters_appeared": ["出场人物"],
      "locations": ["本章涉及地点"],
      "adaptation_potential": "high"
    }
  ]
}

重要指引：
1. dramatic_function 可选值：inciting_incident / plot_point_1 / midpoint / plot_point_2 / climax / resolution / other
2. role 可选值：protagonist / antagonist / supporting / minor / narrator / ensemble
3. importance 可选值：essential / major / supporting / minor
4. 冲突类型：person_vs_person / person_vs_society / person_vs_nature / person_vs_self / person_vs_technology / person_vs_fate / mixed
5. adaptation_potential 可选值：high / medium / low / skip
6. 所有字段必须填写，不要省略必填项
7. 请输出纯 JSON，不要包含 markdown 代码块标记`;
}
