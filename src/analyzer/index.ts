// ============================================================================
// 小说分析流程编排 — 阶段 1：ParsedNovel → NovelAnalysis (F7-F18)
// v0.8.0: 双层并行分析 — Tier 1 逐章并行 + Tier 2 全文综合
// ============================================================================

import type { NovelAnalysis, AiConfig, ChapterSummary, CuratedPassage } from '../schema/types';
import type { ParsedNovel } from '../parser';
import { tieredAnalyze, regenerateSingleChapter, type TieredAnalyzerOptions } from './tiered-analyzer';

/**
 * 阶段 1 主入口：将小说文本分析为 NovelAnalysis
 *
 * Tier 1 (flash 模型逐章并行) + Tier 2 (主模型全文综合) 同时运行，最后合并。
 *
 * @param novel 解析后的小说
 * @param aiConfig AI 配置
 * @param options 可选：并发数 / 模型覆盖 / 进度回调 / 中断信号
 * @returns 完整的 NovelAnalysis 对象
 */
export async function analyzeNovel(
  novel: ParsedNovel,
  aiConfig: AiConfig,
  options?: {
    tier1Concurrency?: number;
    tier1Model?: string;
    onProgress?: (chunk: number, totalChunks: number, label: string) => void;
    signal?: AbortSignal;
  }
): Promise<NovelAnalysis> {
  return tieredAnalyze(novel, aiConfig, {
    tier1Concurrency: options?.tier1Concurrency,
    tier1Model: options?.tier1Model,
    onProgress: options?.onProgress,
    signal: options?.signal,
  });
}

/**
 * 单独重新生成某一章的分析
 * @param novel 原始解析后的小说
 * @param chapterIndex 章节索引（从 0 开始）
 * @param aiConfig AI 配置
 * @param tier1Model 可选，覆盖轻任务模型
 * @returns 更新后的章节摘要 + 精选原文片段
 */
export async function regenerateChapter(
  novel: ParsedNovel,
  chapterIndex: number,
  aiConfig: AiConfig,
  tier1Model?: string
): Promise<{ chapterSummary: ChapterSummary; curatedPassages: CuratedPassage[] }> {
  const result = await regenerateSingleChapter(novel, chapterIndex, aiConfig, tier1Model);

  const ch = novel.chapters[chapterIndex];
  const chapterSummary: ChapterSummary = {
    chapter_number: result.chapter_number,
    chapter_title: ch.title,
    summary: result.summary || `第${ch.chapterNumber}章`,
    key_events: result.key_events || [],
    characters_appeared: result.characters_appeared || [],
    locations: result.locations || [],
    paragraph_count: ch.paragraphs.length,
    adaptation_potential: (result.adaptation_potential as ChapterSummary['adaptation_potential']) || 'medium',
  };

  const curatedPassages: CuratedPassage[] = (result.valuable_passages || []).map((vp) => ({
    text: vp.text,
    passage_type: vp.passage_type as CuratedPassage['passage_type'],
    characters_involved: vp.characters_involved,
    source_chapter: result.chapter_number,
    source_paragraph: vp.source_paragraph,
    why_valuable: vp.why_valuable,
  }));

  return { chapterSummary, curatedPassages };
}

// 重新导出类型供外部使用
export type { TieredAnalyzerOptions } from './tiered-analyzer';
