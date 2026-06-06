// ============================================================================
// 小说分析流程编排 — 阶段 1：ParsedNovel → NovelAnalysis (F7-F18)
// v0.8.0: 双层并行分析 — Tier 1 逐章并行 + Tier 2 全文综合
// ============================================================================

import type { NovelAnalysis, AiConfig } from '../schema/types';
import type { ParsedNovel } from '../parser';
import { tieredAnalyze, type TieredAnalyzerOptions } from './tiered-analyzer';

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

// 重新导出类型供外部使用
export type { TieredAnalyzerOptions } from './tiered-analyzer';
