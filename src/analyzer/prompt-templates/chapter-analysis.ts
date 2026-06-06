// ============================================================================
// Tier 1 逐章分析 Prompt 模板
// 每章独立分析 → 输出结构化数据 + 精选原文片段 + 跨章线索
// ============================================================================

/**
 * 构建单章原文文本
 */
export function buildChapterText(chapter: {
  chapterNumber: number;
  title?: string;
  paragraphs: Array<{ index: number; text: string }>;
}): string {
  let text = `=== 第${chapter.chapterNumber}章${chapter.title ? ` ${chapter.title}` : ''} ===\n`;
  for (const p of chapter.paragraphs) {
    text += p.text + '\n';
  }
  return text;
}

/**
 * 构建逐章分析 Prompt
 *
 * @param chapterText 单章原文
 * @param chapterNum 当前章节号（从 1 开始）
 * @param totalChapters 总章节数
 * @param novelTitle 小说标题
 */
export function buildChapterAnalysisPrompt(
  chapterText: string,
  chapterNum: number,
  totalChapters: number,
  novelTitle: string
): string {
  return `你是一位专业的小说分析专家。你正在分析《${novelTitle}》的**第 ${chapterNum}/${totalChapters} 章**。

请仔细阅读本章内容，输出以下结构化分析。注意：你只需要分析本章内容，不需要跨章综合。

${chapterText}

---

请以 JSON 格式输出（严格遵守 JSON 格式，不要 markdown 代码块）：

{
  "chapter_number": ${chapterNum},
  "summary": "本章核心内容（200字以内）",
  "key_events": ["本章发生的关键事件"],
  "characters_appeared": ["本章出场人物名"],
  "locations": ["本章涉及的地点"],
  "adaptation_potential": "high",

  "valuable_passages": [
    {
      "text": "原文逐字摘录（不超过200字）",
      "passage_type": "dialogue",
      "characters_involved": ["人物名"],
      "source_paragraph": 1,
      "why_valuable": "为什么值得保留：展示人物细节/关键对白/环境氛围/动作描写"
    }
  ],

  "event_threads": [
    {
      "thread_label": "事件线名称（如：宗门大比、感情线、暗箱操作线）",
      "phase_this_chapter": "本章处于该事件的哪个阶段（如：铺垫/开端/发展/转折/高潮/余波）",
      "what_happens": "本章中该事件的具体进展",
      "connected_to_previous": true,
      "connected_to_next": true,
      "is_key_moment": false,
      "key_moment_description": "如果是关键节点，简述为什么重要"
    }
  ],

  "theme_hints": [
    {
      "motif": "主题线索关键词（如：公平vs特权、成长的代价）",
      "embodied_by": "本章中哪些人物/情节体现了这个主题"
    }
  ],

  "relationship_changes": [
    {
      "character_a": "人物A",
      "character_b": "人物B",
      "change": "本章中两人的关系发生了什么变化",
      "key_interaction": "关键互动原文描述"
    }
  ]
}

## 重要指引
1. **valuable_passages**：精选本章中**最具改编价值**的原文片段（5-15条）。
   - 优先选择：展示人物习惯动作/口头禅的描写、关键对白（不加引号的原文）、氛围渲染的段落、人物互动的生动细节
   - 这些片段将直接注入阶段 3 的剧本写作 Prompt，AI 会基于它们写出符合原著的 beat
   - passage_type: dialogue（对白）/ action（动作）/ description（环境描写）/ character_moment（人物细节时刻）
   - 每条 text 不超过 200 字，摘取最有画面感的片段

2. **event_threads**：识别本章涉及的事件线（1-3条）。
   - thread_label 使用简洁、一致的事件名（如"宗门大比"而非"第3章的宗门大比"）
   - connected_to_previous / connected_to_next：标记该事件在本章之前/之后是否还有内容（基于本章线索判断）
   - is_key_moment：本章是否有该事件的关键转折点（高潮、揭示、反转等）

3. **theme_hints**：只提供线索，不需要做全书范围的判断

4. **adaptation_potential**：high（强改编价值）/ medium（一般）/ low（过渡章）/ skip（建议跳过）

5. 请输出纯 JSON，不要包含 markdown 代码块标记`;
}
