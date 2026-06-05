// ============================================================================
// NovelAnalysis Store — 阶段 1 产物状态
// ============================================================================

import { create } from 'zustand';
import type { NovelAnalysis } from '../schema/types';

interface AnalysisStore {
  analysis: NovelAnalysis | null;
  setAnalysis: (analysis: NovelAnalysis) => void;
  clearAnalysis: () => void;
  hasAnalysis: () => boolean;
}

export const useAnalysisStore = create<AnalysisStore>((set, get) => ({
  analysis: null,
  setAnalysis: (analysis) => set({ analysis }),
  clearAnalysis: () => set({ analysis: null }),
  hasAnalysis: () => get().analysis !== null,
}));
