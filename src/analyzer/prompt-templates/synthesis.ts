// ============================================================================
// 阶段 1 合成 Prompt — 将多个 chunk 的分析结果合并为一份完整的 NovelAnalysis
// ============================================================================

/**
 * 构建合成 Prompt
 * 输入：mergeChunks 产出的草稿摘要（结构化 JSON）
 * 输出：去重统一后的完整分析
 */
export function buildSynthesisPrompt(
  mergedDraft: string,
  totalChapters: number
): string {
  return `你是一位资深的小说分析和剧本改编专家。以下是从同一本小说（共 ${totalChapters} 章）的**不同片段**分别分析后自动合并的草稿。

在此草稿中，你可能发现以下问题：
- 同一人物在不同片段中被多次分析（如"王一生"可能出现多次），需要合并为一个人物条目
- 同一主题可能有多个相似但名称略有不同的表述，需要统一命名
- 跨多个片段的人物弧线需要整合为一条完整的弧线描述（而非分别列举各段弧线）
- 关键事件时间线可能存在重复或矛盾，需要筛选和排序
- 章节摘要可能重复或有缺口

请基于以下合并草稿，生成一份**完整、无重复、全局一致**的小说分析：

${mergedDraft}

---

请以 JSON 格式输出完整分析（严格遵守 JSON 格式，不要 markdown 代码块）：

{
  "theme_analysis": {
    "core_themes": [
      {"theme": "主题名", "description": "该主题在整本小说中的体现", "embodied_by": ["关键人物或事件"]}
    ],
    "secondary_themes": [
      {"theme": "次要主题", "description": "简述"}
    ],
    "tonal_characteristics": ["统一后的基调特征词"]
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
      "description": "整合后的主线概述",
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
      "character_arc": "跨越全书的完整人物弧线",
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

整合指引：
1. 人物去重：同一个人物在草稿中出现多次 → 合并为一个条目，选最完整的 traits/arc，取最早出现的 role 和 importance
2. 主题统一：相似主题（如"精神追求"和"精神超越"）→ 合并为一个，用最准确的命名
3. 事件排序：key_events 按章节号升序排列，删除疑似重复的事件
4. 章节摘要：确保共 ${totalChapters} 章，每章一条摘要，章节号连续
5. dramatic_function: inciting_incident / plot_point_1 / midpoint / plot_point_2 / climax / resolution / other
6. role: protagonist / antagonist / supporting / minor / narrator / ensemble
7. importance: essential / major / supporting / minor
8. 冲突类型: person_vs_person / person_vs_society / person_vs_nature / person_vs_self / person_vs_technology / person_vs_fate / mixed
9. adaptation_potential: high / medium / low / skip
10. 不要遗漏任何草稿中的重要信息
11. 输出纯 JSON`;
}
