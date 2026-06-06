// ============================================================================
// taskManager — 后台任务运行器
// 管理 AI 分析任务的生命周期，独立于 React 组件
//
// 核心原则：
// - 任务的 Promise 存储在模块级变量中，不随组件卸载而取消
// - 任务状态通过 taskStore 暴露，组件订阅获取实时进度
// - AbortController 引用存储在模块级，支持取消
// - 结果在任务完成时直接写入 localStorage
// ============================================================================

import type { ParsedNovel } from '../parser';
import type { NovelAnalysis, AdaptationPlan, Screenplay, AiConfig, ConversionConfig } from '../schema/types';
import { analyzeNovel } from '../analyzer';
import { planAdaptation } from '../planner';
import { expandBeats } from '../converter';
import { validate } from '../schema/validator';
import {
  saveAnalysis, savePlan, saveScreenplay,
  saveProjectMeta,
} from '../api/endpoints';
import { useProjectStore } from '../store/projectStore';
import { useTaskStore, type BgTaskStage } from './taskStore';

// ---- 模块级状态（不随组件卸载丢失） ----

/** 运行中任务的 AbortController */
const abortControllers = new Map<string, AbortController>();

// ---- 内部工具 ----

function getStore() {
  return useTaskStore.getState();
}

function getProjectStore() {
  return useProjectStore.getState();
}

function taskRunning(projectId: string, stage: BgTaskStage): boolean {
  const t = getStore().getTask(projectId, stage);
  return t?.status === 'running';
}

// ---- 公开 API ----

/**
 * 启动阶段 1 后台分析（小说分析）
 * 文件解析在 UI 层完成（同步），这里只跑 AI 分析
 */
export async function startStage1Analysis(
  projectId: string,
  novel: ParsedNovel,
  title: string,
  author: string,
  aiConfig: AiConfig
): Promise<void> {
  const stage: BgTaskStage = 'stage1';
  if (taskRunning(projectId, stage)) return;

  const controller = new AbortController();
  abortControllers.set(taskKey(projectId, stage), controller);

  getStore()._setTask({
    projectId,
    stage,
    status: 'running',
    message: 'AI 正在逐章分析 + 提炼全局主题...',
    notificationShown: false,
    startedAt: new Date().toISOString(),
  });

  try {
    const analysis = await analyzeNovel(novel, aiConfig, {
      onProgress: (chunk, totalChunks, label) => {
        const isGlobalPhase = label.includes('提炼全局') || label.includes('全局');
        getStore()._setTask({
          projectId, stage, status: 'running',
          message: isGlobalPhase
            ? `正在提炼全局主题与人物关系...`
            : `正在逐章分析 (${chunk}/${totalChunks})`,
          progress: { current: chunk, total: totalChunks, label },
          notificationShown: false,
          startedAt: getStore().getTask(projectId, stage)?.startedAt || new Date().toISOString(),
        });
      },
      signal: controller.signal,
    });

    const vr = validate(analysis, 'novel-analysis');
    if (!vr.valid) console.warn('NovelAnalysis 校验警告:', vr.errors);

    // 持久化
    saveAnalysis(projectId, analysis);
    saveProjectMeta({
      id: projectId,
      title,
      author: author || '未知',
      targetMedium: aiConfig.ai_provider,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    getProjectStore().updateProjectPhase(projectId, 'analyzed');

    getStore()._setTask({
      projectId, stage, status: 'completed',
      message: '小说分析完成',
      notificationShown: false,
      startedAt: getStore().getTask(projectId, stage)?.startedAt || new Date().toISOString(),
      completedAt: new Date().toISOString(),
      progress: { current: analysis.source_info.analyzed_chapters?.end_chapter ?? 0, total: analysis.source_info.analyzed_chapters?.end_chapter ?? 0, label: '完成' },
    });
  } catch (e) {
    if ((e as Error).name === 'AbortError') {
      getStore()._removeTask(projectId, stage);
    } else {
      getStore()._setTask({
        projectId, stage, status: 'failed',
        message: '小说分析失败',
        error: (e as Error).message,
        notificationShown: false,
        startedAt: getStore().getTask(projectId, stage)?.startedAt || new Date().toISOString(),
        completedAt: new Date().toISOString(),
      });
    }
  } finally {
    abortControllers.delete(taskKey(projectId, stage));
  }
}

/**
 * 启动阶段 2 后台分析（改编规划）
 */
export async function startStage2Analysis(
  projectId: string,
  analysis: NovelAnalysis,
  config: ConversionConfig,
  aiConfig: AiConfig
): Promise<void> {
  const stage: BgTaskStage = 'stage2';
  if (taskRunning(projectId, stage)) return;

  const controller = new AbortController();
  abortControllers.set(taskKey(projectId, stage), controller);

  getStore()._setTask({
    projectId, stage, status: 'running',
    message: 'AI 正在设计改编方案...',
    notificationShown: false,
    startedAt: new Date().toISOString(),
  });

  try {
    const plan = await planAdaptation(analysis, config, aiConfig, {
      onProgress: (step, done) => {
        const msg = step === 'strategy'
          ? (done ? '正在规划幕结构与场景...' : '正在生成改编策略...')
          : (done ? '完成' : '正在规划幕结构与场景...');
        getStore()._setTask({
          projectId, stage, status: 'running',
          message: msg,
          progress: { current: step === 'strategy' ? 1 : 2, total: 2, label: step },
          notificationShown: false,
          startedAt: getStore().getTask(projectId, stage)?.startedAt || new Date().toISOString(),
        });
      },
      signal: controller.signal,
    });

    const vr = validate(plan, 'adaptation-plan');
    if (!vr.valid) console.warn('AdaptationPlan 校验警告:', vr.errors);

    // 持久化
    savePlan(projectId, plan);
    getProjectStore().updateProjectPhase(projectId, 'planned');

    getStore()._setTask({
      projectId, stage, status: 'completed',
      message: '改编规划完成',
      notificationShown: false,
      startedAt: getStore().getTask(projectId, stage)?.startedAt || new Date().toISOString(),
      completedAt: new Date().toISOString(),
      progress: { current: 2, total: 2, label: '完成' },
    });
  } catch (e) {
    if ((e as Error).name === 'AbortError') {
      getStore()._removeTask(projectId, stage);
    } else {
      getStore()._setTask({
        projectId, stage, status: 'failed',
        message: '改编规划失败',
        error: (e as Error).message,
        notificationShown: false,
        startedAt: getStore().getTask(projectId, stage)?.startedAt || new Date().toISOString(),
        completedAt: new Date().toISOString(),
      });
    }
  } finally {
    abortControllers.delete(taskKey(projectId, stage));
  }
}

/**
 * 启动阶段 3 后台分析（Beat 展开）
 */
export async function startStage3Analysis(
  projectId: string,
  plan: AdaptationPlan,
  config: ConversionConfig,
  aiConfig: AiConfig,
  concurrency?: number
): Promise<void> {
  const stage: BgTaskStage = 'stage3';
  if (taskRunning(projectId, stage)) return;

  const controller = new AbortController();
  abortControllers.set(taskKey(projectId, stage), controller);

  const totalScenes = plan.scene_plan.length;

  getStore()._setTask({
    projectId, stage, status: 'running',
    message: 'AI 正在展开场景 beat...',
    progress: { current: 0, total: totalScenes, currentScenes: [] },
    notificationShown: false,
    startedAt: new Date().toISOString(),
  });

  try {
    const stage3Instructions = config.stage3_custom_instructions || config.custom_instructions;
    const screenplay = await expandBeats(plan, aiConfig, {
      concurrency: concurrency ?? 3,
      customInstructions: stage3Instructions,
      writingStyle: {
        dialogue_density: config.dialogue_density,
        action_detail_level: config.action_detail_level,
        stage_direction_style: config.stage_direction_style,
      },
      onProgress: (completed, total, currentScenes) => {
        getStore()._setTask({
          projectId, stage, status: 'running',
          message: `正在展开场景 ${completed}/${total}...`,
          progress: { current: completed, total, currentScenes },
          notificationShown: false,
          startedAt: getStore().getTask(projectId, stage)?.startedAt || new Date().toISOString(),
        });
      },
      signal: controller.signal,
    });

    const vr = validate(screenplay, 'screenplay');
    if (!vr.valid) console.warn('Screenplay 校验警告:', vr.errors);

    // 持久化
    saveScreenplay(projectId, screenplay);
    getProjectStore().updateProjectPhase(projectId, 'scripted');

    getStore()._setTask({
      projectId, stage, status: 'completed',
      message: 'Beat 展开完成',
      notificationShown: false,
      startedAt: getStore().getTask(projectId, stage)?.startedAt || new Date().toISOString(),
      completedAt: new Date().toISOString(),
      progress: { current: totalScenes, total: totalScenes, label: '完成' },
    });
  } catch (e) {
    if ((e as Error).name === 'AbortError') {
      getStore()._removeTask(projectId, stage);
    } else {
      getStore()._setTask({
        projectId, stage, status: 'failed',
        message: 'Beat 展开失败',
        error: (e as Error).message,
        notificationShown: false,
        startedAt: getStore().getTask(projectId, stage)?.startedAt || new Date().toISOString(),
        completedAt: new Date().toISOString(),
      });
    }
  } finally {
    abortControllers.delete(taskKey(projectId, stage));
  }
}

/**
 * 取消指定项目的某个阶段的后台任务
 */
export function cancelTask(projectId: string, stage: BgTaskStage): void {
  const key = taskKey(projectId, stage);
  const controller = abortControllers.get(key);
  if (controller) {
    controller.abort();
    abortControllers.delete(key);
  }
  useTaskStore.getState()._removeTask(projectId, stage);
}

/**
 * 取消指定项目的所有后台任务
 */
export function cancelAllProjectTasks(projectId: string): void {
  for (const stage of ['stage1', 'stage2', 'stage3'] as BgTaskStage[]) {
    cancelTask(projectId, stage);
  }
}

// ---- 内部 ----

function taskKey(projectId: string, stage: BgTaskStage): string {
  return `${projectId}__${stage}`;
}
