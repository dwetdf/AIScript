// ============================================================================
// Tier 2 全文综合 Prompt 模板
// 输入全文 → 输出全局分析（主题/世界观/剧情/人物），不含逐章摘要
// ============================================================================

/**
 * 构建全文文本（复用 full-analysis 的同名函数逻辑）
 */
export function buildNovelText(novel: {
  title: string;
  chapters: Array<{ chapterNumber: number; title?: string; paragraphs: Array<{ index: number; text: string }> }>;
}): string {
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
 * 构建 Tier 2 全局综合 Prompt
 *
 * 注意：Tier 2 专注于跨章节的全局模式识别，不输出逐章摘要（由 Tier 1 负责）。
 * Tier 2 与 Tier 1 并行运行，互不依赖。
 *
 * @param novelText 完整小说文本
 * @param totalChapters 总章节数
 */
export function buildGlobalSynthesisPrompt(
  novelText: string,
  totalChapters: number
): string {
  return `你是一位资深的小说分析和剧本改编专家。请仔细阅读以下完整小说文本（共 ${totalChapters} 章），从**全局视角**输出以下维度的综合分析。

注意：你不需要生成逐章摘要——逐章分析由其他模块并行处理。你的任务是识别跨章节的全局模式和结构。

${novelText}

---

请以 JSON 格式输出（严格遵守 JSON 格式，不要 markdown 代码块）：

{
  "theme_analysis": {
    "core_themes": [
      {"theme": "主题名", "description": "该主题在整本小说中的具体体现", "embodied_by": ["关键人物或事件"]}
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
      "description": "全书主线概述",
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
      "character_arc": "跨越全书的人物弧线（描述从开始到结束的变化轨迹）",
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
  ]
}

## 重要指引
1. **全局视角**：不要逐章罗列，而是提炼跨越全书的模式。例如"王一生"的人物弧线应该是从第1章到最后一章的完整变化轨迹。

2. **key_events**：识别跨章节的重要事件（即使某个事件跨越2-4章，也只作为一个事件列出，chapter 字段填写关键转折所在章节）
   - dramatic_function 可选值：inciting_incident / plot_point_1 / midpoint / plot_point_2 / climax / resolution / other

3. **character_analysis**：
   - role 可选值：protagonist / antagonist / supporting / minor / narrator / ensemble
   - importance 可选值：essential / major / supporting / minor / cameo
   - character_arc：必须是从全书中完整的人物变化轨迹，不要写"本段中"这样的限定词
   - relationships 中的 target 使用人物原名

4. **core_conflict.type**：person_vs_person / person_vs_society / person_vs_nature / person_vs_self / person_vs_technology / person_vs_fate / mixed

5. **setting_scale**：single_location / city / region / nation / multi_nation / world / universe

6. 所有字段必须填写，不要省略必填项

7. 请输出纯 JSON，不要包含 markdown 代码块标记`;
}
