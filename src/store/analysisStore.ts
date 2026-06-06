// ============================================================================
// NovelAnalysis Store — 阶段 1 产物状态
// ============================================================================

import { create } from 'zustand';
import type { NovelAnalysis, ChapterSummary, CuratedPassage } from '../schema/types';

interface AnalysisStore {
  analysis: NovelAnalysis | null;
  setAnalysis: (analysis: NovelAnalysis) => void;
  clearAnalysis: () => void;
  hasAnalysis: () => boolean;
  /** 局部更新某一章的摘要和精选原文片段 */
  updateChapter: (chapterNumber: number, chapterSummary: ChapterSummary, curatedPassages: CuratedPassage[]) => void;
}

export const useAnalysisStore = create<AnalysisStore>((set, get) => ({
  analysis: null,
  setAnalysis: (analysis) => set({ analysis }),
  clearAnalysis: () => set({ analysis: null }),
  hasAnalysis: () => get().analysis !== null,
  updateChapter: (chapterNumber, chapterSummary, curatedPassages) => {
    const current = get().analysis;
    if (!current) return;

    // 替换对应章节摘要
    const chapterSummaries = current.chapter_summaries.map((cs) =>
      cs.chapter_number === chapterNumber ? chapterSummary : cs
    );

    // 移除该章的旧 curated_passages，合并新生成的
    const otherPassages = (current.curated_passages || []).filter(
      (cp) => cp.source_chapter !== chapterNumber
    );
    const mergedPassages = [...otherPassages, ...curatedPassages];

    set({
      analysis: {
        ...current,
        chapter_summaries: chapterSummaries,
        curated_passages: mergedPassages,
      },
    });
  },
}));
