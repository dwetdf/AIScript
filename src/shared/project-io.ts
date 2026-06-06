// ============================================================================
// 项目导入/导出辅助 — 预览与阶段详情提取
// ============================================================================

/**
 * 项目 bundle 预览信息
 */
export interface BundlePreview {
  valid: boolean;
  error?: string;
  projectId: string;
  title: string;
  exportedAt: string;
  stages: {
    meta: boolean;
    analysis: boolean;
    plan: boolean;
    screenplay: boolean;
  };
  stageDetails: {
    analysisDetail?: string;
    planDetail?: string;
    screenplayDetail?: string;
  };
  completeness: 'full' | 'partial' | 'empty';
}

/**
 * 解析项目 bundle JSON，返回预览信息（只读，不写入 localStorage）
 */
export function previewProjectBundle(jsonStr: string): BundlePreview {
  const empty: BundlePreview = {
    valid: false,
    projectId: '',
    title: '',
    exportedAt: '',
    stages: { meta: false, analysis: false, plan: false, screenplay: false },
    stageDetails: {},
    completeness: 'empty',
  };

  let bundle: Record<string, unknown>;
  try {
    bundle = JSON.parse(jsonStr);
  } catch {
    return { ...empty, error: 'JSON 格式无效，无法解析文件内容。' };
  }

  if (!bundle.projectId || typeof bundle.projectId !== 'string') {
    return { ...empty, error: '文件缺少 projectId 字段，不是有效的项目导出文件。' };
  }

  const meta = bundle.meta as Record<string, unknown> | undefined;
  const title = (meta?.title as string) || bundle.projectId;
  const exportedAt = (bundle.exportedAt as string) || '未知';

  const stages = {
    meta: !!bundle.meta,
    analysis: !!bundle.analysis,
    plan: !!bundle.plan,
    screenplay: !!bundle.screenplay,
  };

  const presentCount = [stages.meta, stages.analysis, stages.plan, stages.screenplay].filter(Boolean).length;
  const completeness: BundlePreview['completeness'] =
    presentCount >= 4 ? 'full' : presentCount > 0 ? 'partial' : 'empty';

  return {
    valid: true,
    projectId: bundle.projectId,
    title,
    exportedAt,
    stages,
    stageDetails: extractStageDetails(bundle),
    completeness,
  };
}

/**
 * 从 bundle 中提取各阶段的统计信息用于预览
 */
export function extractStageDetails(bundle: Record<string, unknown>): {
  analysisDetail?: string;
  planDetail?: string;
  screenplayDetail?: string;
} {
  const details: {
    analysisDetail?: string;
    planDetail?: string;
    screenplayDetail?: string;
  } = {};

  try {
    const analysis = bundle.analysis as Record<string, unknown> | undefined;
    if (analysis) {
      const chars = (analysis.character_analysis as unknown[]) || [];
      const chapters = (analysis.chapter_summaries as unknown[]) || [];
      details.analysisDetail = `${chars.length} 人物, ${chapters.length} 章`;
    }
  } catch { /* ignore */ }

  try {
    const plan = bundle.plan as Record<string, unknown> | undefined;
    if (plan) {
      const episodePlan = plan.episode_plan as Record<string, unknown> | undefined;
      const scenePlan = (plan.scene_plan as unknown[]) || [];
      const acts = episodePlan?.total_acts ?? '?';
      details.planDetail = `${acts} 幕, ${scenePlan.length} 场景`;
    }
  } catch { /* ignore */ }

  try {
    const screenplay = bundle.screenplay as Record<string, unknown> | undefined;
    if (screenplay) {
      const acts = (screenplay.acts as Array<{ scenes?: unknown[] }>) || [];
      const totalScenes = acts.reduce((sum, a) => sum + (a.scenes?.length || 0), 0);
      const totalBeats = acts.reduce(
        (sum, a) => sum + (a.scenes || []).reduce((s: number, sc: unknown) => s + ((sc as { beats?: unknown[] })?.beats?.length || 0), 0),
        0,
      );
      const chars = (screenplay.characters as unknown[]) || [];
      details.screenplayDetail = `${totalScenes} 场, ${totalBeats} beats, ${chars.length} 人物`;
    }
  } catch { /* ignore */ }

  return details;
}
