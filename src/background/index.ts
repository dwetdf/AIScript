// ============================================================================
// 后台任务模块 — 统一导出
// ============================================================================

export { useTaskStore, type BgTask, type BgTaskStage, type BgTaskStatus, type BgTaskProgress } from './taskStore';
export {
  startStage1Analysis,
  startStage2Analysis,
  startStage3Analysis,
  cancelTask,
  cancelAllProjectTasks,
} from './taskManager';
