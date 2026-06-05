// ============================================================================
// 主题分析 — F7 主题分析
// 从 AI 分析结果中提取和验证主题
// ============================================================================

import type { ThemeAnalysis } from '../schema/types';

/**
 * 从 AI 原始输出中构建主题分析
 */
export function buildThemeAnalysis(raw: Record<string, unknown>): ThemeAnalysis {
  return {
    core_themes: (raw.core_themes as ThemeAnalysis['core_themes']) || [],
    secondary_themes: raw.secondary_themes as ThemeAnalysis['secondary_themes'],
    tonal_characteristics: raw.tonal_characteristics as string[],
  };
}
