// ============================================================================
// 修订历史维护 — F77
// ============================================================================

import type { RevisionEntry } from '../schema/types';

/**
 * 创建初始修订记录（AI 初始生成）
 */
export function createInitialRevision(author = 'AI', changeSummary: string): RevisionEntry {
  return {
    revision_number: 1,
    timestamp: new Date().toISOString(),
    author,
    change_summary: changeSummary,
  };
}

/**
 * 追加一条修订记录到修订历史中
 * revision_number 自动递增
 */
export function appendRevision(
  history: RevisionEntry[] | undefined,
  author: string,
  changeSummary: string,
  changedBeats?: string[]
): RevisionEntry[] {
  const base = history ?? [];
  const lastNumber = base.length > 0 ? base[base.length - 1].revision_number : 0;

  return [
    ...base,
    {
      revision_number: lastNumber + 1,
      timestamp: new Date().toISOString(),
      author,
      change_summary: changeSummary,
      ...(changedBeats && changedBeats.length > 0 ? { changed_beats: changedBeats } : {}),
    },
  ];
}
