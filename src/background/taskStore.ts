// ============================================================================
// taskStore — 后台分析任务状态管理
// 管理跨项目的 AI 分析任务生命周期，独立于 React 组件
// ============================================================================

import { create } from 'zustand';

// ---- 任务类型 ----

export type BgTaskStage = 'stage1' | 'stage2' | 'stage3';
export type BgTaskStatus = 'running' | 'completed' | 'failed';

export interface BgTaskProgress {
  current: number;
  total: number;
  /** 当前正在处理的场景名称（仅 stage3） */
  currentScenes?: string[];
  /** 当前步骤标签 */
  label?: string;
}

export interface BgTask {
  projectId: string;
  stage: BgTaskStage;
  status: BgTaskStatus;
  message: string;
  progress?: BgTaskProgress;
  error?: string;
  /** 用户是否已查看过完成通知 */
  notificationShown: boolean;
  startedAt: string;
  completedAt?: string;
}

/** 生成任务的唯一 key */
export function taskKey(projectId: string, stage: BgTaskStage): string {
  return `${projectId}__${stage}`;
}

// ---- Store ----

interface TaskStore {
  tasks: Record<string, BgTask>;

  // ---- 由 taskManager 调用 ----
  /** 设置/更新任务状态 */
  _setTask: (task: BgTask) => void;
  /** 移除任务（回到 idle） */
  _removeTask: (projectId: string, stage: BgTaskStage) => void;

  // ---- 由 UI 调用 ----
  /** 获取某个项目+阶段的任务 */
  getTask: (projectId: string, stage: BgTaskStage) => BgTask | undefined;
  /** 该项目是否有未读完成通知 */
  hasNotification: (projectId: string) => boolean;
  /** 获取所有未读通知的阶段列表 */
  getProjectNotifications: (projectId: string) => BgTaskStage[];
  /** 清除通知（用户进入对应阶段页面时调用） */
  dismissNotification: (projectId: string, stage: BgTaskStage) => void;
  /** 获取当前活跃（running）的任务数量 */
  activeTaskCount: () => number;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: {},

  _setTask: (task) => {
    const key = taskKey(task.projectId, task.stage);
    set((s) => ({
      tasks: { ...s.tasks, [key]: task },
    }));
  },

  _removeTask: (projectId, stage) => {
    const key = taskKey(projectId, stage);
    set((s) => {
      const next = { ...s.tasks };
      delete next[key];
      return { tasks: next };
    });
  },

  getTask: (projectId, stage) => {
    const key = taskKey(projectId, stage);
    return get().tasks[key];
  },

  hasNotification: (projectId) => {
    return Object.values(get().tasks).some(
      (t) =>
        t.projectId === projectId &&
        t.status === 'completed' &&
        !t.notificationShown
    );
  },

  getProjectNotifications: (projectId) => {
    return Object.values(get().tasks)
      .filter(
        (t) =>
          t.projectId === projectId &&
          t.status === 'completed' &&
          !t.notificationShown
      )
      .map((t) => t.stage);
  },

  dismissNotification: (projectId, stage) => {
    const key = taskKey(projectId, stage);
    const task = get().tasks[key];
    if (task && task.status === 'completed' && !task.notificationShown) {
      set((s) => ({
        tasks: { ...s.tasks, [key]: { ...task, notificationShown: true } },
      }));
    }
  },

  activeTaskCount: () => {
    return Object.values(get().tasks).filter((t) => t.status === 'running').length;
  },
}));
