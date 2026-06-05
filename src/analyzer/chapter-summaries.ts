// ============================================================================
// 章节摘要与原文标注 — F18 章节摘要 + raw_passages 构建
// ============================================================================

import type { ChapterSummary, RawPassage } from '../schema/types';

/** 从 parser 内部复制的类型（避免跨模块依赖） */
interface ChapterData {
  chapterNumber: number;
  title?: string;
  paragraphs: Array<{ index: number; text: string }>;
}

/**
 * 构建章节摘要数组
 * 将 AI 生成的摘要信息与原文段落合并
 */
export function buildChapterSummaries(
  aiSummaries: Array<{
    chapter_number: number;
    summary: string;
    key_events?: string[];
    characters_appeared?: string[];
    locations?: string[];
    adaptation_potential?: string;
  }>,
  chapters: ChapterData[]
): ChapterSummary[] {
  const aiMap = new Map<number, (typeof aiSummaries)[0]>();
  for (const s of aiSummaries) {
    aiMap.set(s.chapter_number, s);
  }

  return chapters.map((ch) => {
    const ai = aiMap.get(ch.chapterNumber);
    return {
      chapter_number: ch.chapterNumber,
      chapter_title: ch.title,
      summary: ai?.summary || `${ch.title || `第${ch.chapterNumber}章`}，共 ${ch.paragraphs.length} 段`,
      key_events: ai?.key_events || [],
      characters_appeared: ai?.characters_appeared || [],
      locations: ai?.locations || [],
      paragraph_count: ch.paragraphs.length,
      adaptation_potential: (ai?.adaptation_potential as ChapterSummary['adaptation_potential']) || 'medium',
      raw_passages: ch.paragraphs.map((p): RawPassage => ({
        paragraph: p.index,
        text: p.text,
        type: classifyPassageType(p.text),
        significance: 'major',
        adaptation_hint: generateAdaptationHint(p.text),
      })),
    };
  });
}

/** 分类原文段落类型 */
function classifyPassageType(text: string): RawPassage['type'] {
  const hasDialogue = /[「"''""]/.test(text);
  const hasAction = /[打跑拿走斩杀刺击挥退进跃跳飞跑推拉抓抱].*[了着过]/.test(text);
  const hasInternal = /想|觉得|觉得|心[^情]|感到|感到|暗道/.test(text);

  if (hasDialogue && hasAction) return 'mixed';
  if (hasDialogue) return 'dialogue';
  if (hasInternal) return 'internal_monologue';
  if (hasAction) return 'action';
  if (text.length > 120) return 'narrative';
  return 'description';
}

/** 基于文本内容生成改编提示 */
function generateAdaptationHint(text: string): string | undefined {
  if (classifyPassageType(text) === 'internal_monologue') {
    return '此段为内心独白，需外化为对白或动作';
  }
  return undefined;
}
