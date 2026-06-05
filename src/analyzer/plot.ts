// ============================================================================
// 剧情分析 — F11 核心冲突分析 / F12 关键事件时间线 / F13 叙事结构
// ============================================================================

import type { PlotAnalysis, KeyEvent, CoreConflict, NarrativeStructure } from '../schema/types';

/**
 * 从 AI 原始输出中构建剧情分析
 */
export function buildPlotAnalysis(raw: Record<string, unknown>): PlotAnalysis {
  return {
    main_plot: raw.main_plot as PlotAnalysis['main_plot'],
    sub_plots: raw.sub_plots as PlotAnalysis['sub_plots'],
    core_conflict: raw.core_conflict as CoreConflict,
    key_events: (raw.key_events as KeyEvent[]) || [],
    narrative_structure: raw.narrative_structure as NarrativeStructure,
  };
}
