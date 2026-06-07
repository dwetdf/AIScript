// ============================================================================
// AdaptationPlan Store — 阶段 2 产物状态
// 支持 scene_plan 和 act 的增删改 + 场景大纲重新生成
// ============================================================================

import { create } from 'zustand';
import type { AdaptationPlan, ScenePlan, ActPlan } from '../schema/types';
import { regenerateScenePlans } from '../planner';
import { useAnalysisStore } from './analysisStore';
import { useConfigStore } from './configStore';
import { useProjectStore } from './projectStore';

interface PlanStore {
  plan: AdaptationPlan | null;
  setPlan: (plan: AdaptationPlan) => void;
  clearPlan: () => void;

  // Scene plan 操作
  updateScenePlan: (sceneGlobalNumber: number, patch: Partial<ScenePlan>) => void;
  insertScenePlan: (index: number, scene: ScenePlan) => void;
  deleteScenePlan: (sceneGlobalNumber: number) => void;
  reorderScenePlan: (fromIndex: number, toIndex: number) => void;

  // Act plan 操作
  updateAct: (actNumber: number, patch: Partial<ActPlan>) => void;
  insertAct: (index: number, act: ActPlan) => void;
  deleteAct: (actNumber: number) => void;

  // 重新生成场景大纲 (保留修改后的 act 结构，只重新生成 scene_plan)
  regenerateScenesFromActs: () => Promise<void>;
  renumberScenePlans: () => void;
}

export const usePlanStore = create<PlanStore>((set, get) => ({
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

  // ---------- Act 操作 ----------

  updateAct: (actNumber, patch) => {
    set((s) => {
      if (!s.plan) return s;
      const newActs = s.plan.episode_plan.acts.map(a =>
        a.act_number === actNumber ? { ...a, ...patch } : a
      );
      // Also update scene_plan act_number references if needed
      const newScenePlan = s.plan.scene_plan.map(sp =>
        sp.act_number === actNumber && patch.act_number && patch.act_number !== actNumber
          ? { ...sp, act_number: patch.act_number }
          : sp
      );
      return {
        plan: {
          ...s.plan,
          episode_plan: { ...s.plan.episode_plan, acts: newActs },
          scene_plan: newScenePlan,
        }
      };
    });
  },

  insertAct: (index, act) => {
    set((s) => {
      if (!s.plan) return s;
      const newActs = [...s.plan.episode_plan.acts];
      newActs.splice(index, 0, act);
      // Reindex act numbers
      for (let i = 0; i < newActs.length; i++) {
        newActs[i] = { ...newActs[i], act_number: i + 1 };
      }
      return {
        plan: {
          ...s.plan,
          episode_plan: {
            ...s.plan.episode_plan,
            total_acts: newActs.length,
            acts: newActs,
          }
        }
      };
    });
  },

  deleteAct: (actNumber) => {
    set((s) => {
      if (!s.plan) return s;
      const newActs = s.plan.episode_plan.acts
        .filter(a => a.act_number !== actNumber)
        .map((a, i) => ({ ...a, act_number: i + 1 })); // reindex
      // Remove scenes belonging to this act
      const newScenePlan = s.plan.scene_plan
        .filter(sp => sp.act_number !== actNumber)
        .map((sp, i) => ({ ...sp, act_number: sp.act_number > actNumber ? sp.act_number - 1 : sp.act_number }));
      // Reindex scene global numbers
      for (let i = 0; i < newScenePlan.length; i++) {
        newScenePlan[i] = { ...newScenePlan[i], scene_global_number: i + 1 };
      }
      return {
        plan: {
          ...s.plan,
          episode_plan: {
            ...s.plan.episode_plan,
            total_acts: newActs.length,
            acts: newActs,
          },
          scene_plan: newScenePlan,
        }
      };
    });
  },

  renumberScenePlans: () => {
    set((s) => {
      if (!s.plan) return s;
      let global = 1;
      const newScenePlan = s.plan.episode_plan.acts.flatMap((act, actIdx) => {
        const actScenes = s.plan!.scene_plan
          .filter(sp => sp.act_number === act.act_number);
        return actScenes.map((sp, sceneIdx) => ({
          ...sp,
          act_number: actIdx + 1,
          scene_number: sceneIdx + 1,
          scene_global_number: global++,
        }));
      });
      return { plan: { ...s.plan, scene_plan: newScenePlan } };
    });
  },

  regenerateScenesFromActs: async () => {
    const plan = get().plan;
    if (!plan) throw new Error('无改编规划数据');

    const analysis = useAnalysisStore.getState().analysis;
    if (!analysis) throw new Error('无小说分析数据');

    const aiConfig = useConfigStore.getState().aiConfig;
    if (!aiConfig) throw new Error('未配置 AI 引擎');

    // Get active project ID from projectStore
    const activeProjectId: string = useProjectStore.getState().activeProjectId || 'default';
    const projectConfig = useConfigStore.getState().getProjectConfig(activeProjectId);

    const newScenes = await regenerateScenePlans(
      analysis,
      plan.adaptation_strategy,
      plan.episode_plan.acts,
      projectConfig,
      aiConfig
    );

    // Also rebuild characters/locations drafts based on new scenes
    set((s) => {
      if (!s.plan) return s;
      // Rebuild locations from new scene_plan
      const seen = new Set<string>();
      const locationsDraft = newScenes.reduce<NonNullable<AdaptationPlan['locations_draft']>>((acc, sp) => {
        if (!seen.has(sp.location.name)) {
          seen.add(sp.location.name);
          acc.push({
            location_id: sp.location.name.toLowerCase().replace(/\s+/g, '_'),
            name: sp.location.name,
            location_type: sp.location.interior_exterior === 'INT' ? 'interior' : 'exterior',
          });
        }
        return acc;
      }, []);
      return { plan: { ...s.plan, scene_plan: newScenes, locations_draft: locationsDraft } };
    });
  },
}));
