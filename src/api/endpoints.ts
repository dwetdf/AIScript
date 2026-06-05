// ============================================================================
// 文件存储与业务路由 — F104 F105
// 项目数据的保存、加载、备份、恢复
// ============================================================================

import type { NovelAnalysis, AdaptationPlan, Screenplay } from '../schema/types';

const STORAGE_PREFIX = 'aiscript_project_';

export interface ProjectMeta {
  id: string;
  title: string;
  author: string;
  targetMedium: string;
  createdAt: string;
  updatedAt: string;
  analysisRef?: string;
  planRef?: string;
  screenplayRef?: string;
}

/**
 * 保存项目元数据
 */
export function saveProjectMeta(meta: ProjectMeta): void {
  const key = `${STORAGE_PREFIX}meta_${meta.id}`;
  localStorage.setItem(key, JSON.stringify({ ...meta, updatedAt: new Date().toISOString() }));
}

/**
 * 加载所有项目列表 (F101)
 */
export function listProjects(): ProjectMeta[] {
  const projects: ProjectMeta[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(`${STORAGE_PREFIX}meta_`)) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) projects.push(JSON.parse(raw) as ProjectMeta);
      } catch { /* skip corrupt */ }
    }
  }
  return projects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

/**
 * 删除项目及其关联数据
 */
export function deleteProject(projectId: string): void {
  localStorage.removeItem(`${STORAGE_PREFIX}meta_${projectId}`);
  localStorage.removeItem(`${STORAGE_PREFIX}analysis_${projectId}`);
  localStorage.removeItem(`${STORAGE_PREFIX}plan_${projectId}`);
  localStorage.removeItem(`${STORAGE_PREFIX}screenplay_${projectId}`);
}

// ============================== 各阶段产物持久化 ==============================

/**
 * 保存 NovelAnalysis
 */
export function saveAnalysis(projectId: string, analysis: NovelAnalysis): void {
  localStorage.setItem(`${STORAGE_PREFIX}analysis_${projectId}`, JSON.stringify(analysis));
}

/**
 * 加载 NovelAnalysis
 */
export function loadAnalysis(projectId: string): NovelAnalysis | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}analysis_${projectId}`);
    return raw ? (JSON.parse(raw) as NovelAnalysis) : null;
  } catch {
    return null;
  }
}

/**
 * 保存 AdaptationPlan
 */
export function savePlan(projectId: string, plan: AdaptationPlan): void {
  localStorage.setItem(`${STORAGE_PREFIX}plan_${projectId}`, JSON.stringify(plan));
}

/**
 * 加载 AdaptationPlan
 */
export function loadPlan(projectId: string): AdaptationPlan | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}plan_${projectId}`);
    return raw ? (JSON.parse(raw) as AdaptationPlan) : null;
  } catch {
    return null;
  }
}

/**
 * 保存 Screenplay
 */
export function saveScreenplay(projectId: string, screenplay: Screenplay): void {
  localStorage.setItem(`${STORAGE_PREFIX}screenplay_${projectId}`, JSON.stringify(screenplay));
}

/**
 * 加载 Screenplay
 */
export function loadScreenplay(projectId: string): Screenplay | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}screenplay_${projectId}`);
    return raw ? (JSON.parse(raw) as Screenplay) : null;
  } catch {
    return null;
  }
}

/**
 * 导出项目完整数据为 JSON（备份 F104）
 */
export function exportProjectBundle(projectId: string): string {
  const bundle = {
    projectId,
    exportedAt: new Date().toISOString(),
    meta: JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}meta_${projectId}`) || 'null'),
    analysis: loadAnalysis(projectId),
    plan: loadPlan(projectId),
    screenplay: loadScreenplay(projectId),
  };
  return JSON.stringify(bundle, null, 2);
}

/**
 * 从备份 JSON 恢复项目
 * @param json - 项目 bundle JSON 字符串
 * @param targetProjectId - 可选，强制写入指定项目 ID（忽略 bundle 中的 projectId）
 */
export function importProjectBundle(json: string, targetProjectId?: string): ProjectMeta | null {
  try {
    const bundle = JSON.parse(json);
    const projectId = targetProjectId || bundle.projectId;
    if (!projectId) return null;

    if (bundle.meta) localStorage.setItem(`${STORAGE_PREFIX}meta_${projectId}`, JSON.stringify({ ...bundle.meta, id: projectId }));
    if (bundle.analysis) saveAnalysis(projectId, bundle.analysis);
    if (bundle.plan) savePlan(projectId, bundle.plan);
    if (bundle.screenplay) saveScreenplay(projectId, bundle.screenplay);

    return { ...bundle.meta, id: projectId } as ProjectMeta;
  } catch {
    return null;
  }
}
