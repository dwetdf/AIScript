// ============================================================================
// AdaptationPlan Store — 阶段 2 产物状态
// 支持 scene_plan 的增删改操作
// ============================================================================

import { create } from 'zustand';
import type { AdaptationPlan, ScenePlan } from '../schema/types';

interface PlanStore {
  plan: AdaptationPlan | null;
  setPlan: (plan: AdaptationPlan) => void;
  clearPlan: () => void;

  // Scene plan 操作
  updateScenePlan: (sceneGlobalNumber: number, patch: Partial<ScenePlan>) => void;
  insertScenePlan: (index: number, scene: ScenePlan) => void;
  deleteScenePlan: (sceneGlobalNumber: number) => void;
  reorderScenePlan: (fromIndex: number, toIndex: number) => void;
}

export const usePlanStore = create<PlanStore>((set) => ({
  plan: null,
  setPlan: (plan) => set({ plan }),
  clearPlan: () => set({ plan: null }),

  updateScenePlan: (sceneGlobalNumber, patch) => {
    set((s) => {
      if (!s.plan) return s;
      const idx = s.plan.scene_plan.findIndex((sp) => sp.scene_global_number === sceneGlobalNumber);
      if (idx === -1) return s;
      const newScenePlan = [...s.plan.scene_plan];
      newScenePlan[idx] = { ...newScenePlan[idx], ...patch };
      return { plan: { ...s.plan, scene_plan: newScenePlan } };
    });
  },

  insertScenePlan: (index, scene) => {
    set((s) => {
      if (!s.plan) return s;
      const newScenePlan = [...s.plan.scene_plan];
      newScenePlan.splice(index, 0, scene);
      // 重新编号后继场景
      for (let i = index + 1; i < newScenePlan.length; i++) {
        newScenePlan[i] = { ...newScenePlan[i], scene_global_number: newScenePlan[i].scene_global_number + 1 };
      }
      return { plan: { ...s.plan, scene_plan: newScenePlan } };
    });
  },

  deleteScenePlan: (sceneGlobalNumber) => {
    set((s) => {
      if (!s.plan) return s;
      const idx = s.plan.scene_plan.findIndex((sp) => sp.scene_global_number === sceneGlobalNumber);
      if (idx === -1) return s;
      const newScenePlan = s.plan.scene_plan.filter((_, i) => i !== idx);
      // 重新编号
      for (let i = idx; i < newScenePlan.length; i++) {
        newScenePlan[i] = { ...newScenePlan[i], scene_global_number: newScenePlan[i].scene_global_number - 1 };
      }
      return { plan: { ...s.plan, scene_plan: newScenePlan } };
    });
  },

  reorderScenePlan: (fromIndex, toIndex) => {
    set((s) => {
      if (!s.plan) return s;
      const newScenePlan = [...s.plan.scene_plan];
      const [removed] = newScenePlan.splice(fromIndex, 1);
      newScenePlan.splice(toIndex, 0, removed);
      // 重新编号全局场景号
      for (let i = 0; i < newScenePlan.length; i++) {
        newScenePlan[i] = { ...newScenePlan[i], scene_global_number: i + 1 };
      }
      return { plan: { ...s.plan, scene_plan: newScenePlan } };
    });
  },
}));
