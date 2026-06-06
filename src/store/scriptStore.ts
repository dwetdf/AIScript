// ============================================================================
// Screenplay Store — 阶段 3 产物状态 (F67, F68, F69, F70, F71)
// 核心编辑 Store — 管理完整剧本的增删改操作
// ============================================================================

import { create } from 'zustand';
import type { Screenplay, Beat, Scene, Character } from '../schema/types';
import { generateBeatId } from '../shared/id-generator';
import { expandSingleScene } from '../converter/index';
import { usePlanStore } from './planStore';
import { useConfigStore } from './configStore';
import { useEditorStore } from './editorStore';

interface ScriptStore {
  screenplay: Screenplay | null;
  setScreenplay: (s: Screenplay) => void;
  clearScreenplay: () => void;

  // Screenplay 元数据编辑
  updateScreenplay: (patch: Partial<Screenplay>) => void;

  // Beat 级编辑 (F67, F68)
  updateBeat: (beatId: string, patch: Partial<Beat>) => void;
  insertBeat: (sceneGlobalNumber: number, index: number, beat: Beat) => void;
  deleteBeat: (beatId: string) => void;

  // Scene 级编辑 (F69)
  updateScene: (sceneGlobalNumber: number, patch: Partial<Scene>) => void;
  insertScene: (actNumber: number, index: number, scene: Scene) => void;
  deleteScene: (sceneGlobalNumber: number) => void;
  moveScene: (sceneGlobalNumber: number, newActNumber: number, newIndex: number) => void;

  // AI 重新生成场景
  regenerateScene: (sceneGlobalNumber: number, mode: 'rewrite' | 'improve') => Promise<void>;

  // Character 编辑 (F70, F71)
  updateCharacter: (characterId: string, patch: Partial<Character>) => void;
  renameCharacter: (characterId: string, newName: string) => void; // F71 全局同步

  // Dirty 状态
  isDirty: boolean;
  markClean: () => void;
}

export const useScriptStore = create<ScriptStore>((set, get) => ({
  screenplay: null,
  setScreenplay: (screenplay) => set({ screenplay, isDirty: false }),
  clearScreenplay: () => set({ screenplay: null, isDirty: false }),

  updateScreenplay: (patch) => {
    set((s) => {
      if (!s.screenplay) return s;
      return { screenplay: { ...s.screenplay, ...patch }, isDirty: true };
    });
  },

  // ---------- Beat 操作 ----------

  updateBeat: (beatId, patch) => {
    set((s) => {
      if (!s.screenplay) return s;
      const screenplay = structuredClone(s.screenplay);
      for (const act of screenplay.acts) {
        for (const scene of act.scenes) {
          const beatIdx = scene.beats.findIndex((b) => b.beat_id === beatId);
          if (beatIdx !== -1) {
            scene.beats[beatIdx] = { ...scene.beats[beatIdx], ...patch } as Beat;
            return { screenplay, isDirty: true };
          }
        }
      }
      return s;
    });
  },

  insertBeat: (sceneGlobalNumber, index, beat) => {
    set((s) => {
      if (!s.screenplay) return s;
      const screenplay = structuredClone(s.screenplay);
      for (const act of screenplay.acts) {
        for (const scene of act.scenes) {
          if (scene.scene_global_number === sceneGlobalNumber) {
            scene.beats.splice(index, 0, beat);
            // 重新编号该场景及之后的 beats
            renumberBeats(screenplay);
            return { screenplay, isDirty: true };
          }
        }
      }
      return s;
    });
  },

  deleteBeat: (beatId) => {
    set((s) => {
      if (!s.screenplay) return s;
      const screenplay = structuredClone(s.screenplay);
      for (const act of screenplay.acts) {
        for (const scene of act.scenes) {
          const idx = scene.beats.findIndex((b) => b.beat_id === beatId);
          if (idx !== -1) {
            scene.beats.splice(idx, 1);
            renumberBeats(screenplay);
            return { screenplay, isDirty: true };
          }
        }
      }
      return s;
    });
  },

  // ---------- Scene 操作 ----------

  updateScene: (sceneGlobalNumber, patch) => {
    set((s) => {
      if (!s.screenplay) return s;
      const screenplay = structuredClone(s.screenplay);
      for (const act of screenplay.acts) {
        const idx = act.scenes.findIndex((sc) => sc.scene_global_number === sceneGlobalNumber);
        if (idx !== -1) {
          act.scenes[idx] = { ...act.scenes[idx], ...patch };
          return { screenplay, isDirty: true };
        }
      }
      return s;
    });
  },

  insertScene: (actNumber, index, scene) => {
    set((s) => {
      if (!s.screenplay) return s;
      const screenplay = structuredClone(s.screenplay);
      const act = screenplay.acts.find((a) => a.act_number === actNumber);
      if (act) {
        act.scenes.splice(index, 0, scene);
        renumberScenes(screenplay);
        return { screenplay, isDirty: true };
      }
      return s;
    });
  },

  deleteScene: (sceneGlobalNumber) => {
    set((s) => {
      if (!s.screenplay) return s;
      const screenplay = structuredClone(s.screenplay);
      for (const act of screenplay.acts) {
        const idx = act.scenes.findIndex((sc) => sc.scene_global_number === sceneGlobalNumber);
        if (idx !== -1) {
          act.scenes.splice(idx, 1);
          renumberScenes(screenplay);
          return { screenplay, isDirty: true };
        }
      }
      return s;
    });
  },

  moveScene: (sceneGlobalNumber, newActNumber, newIndex) => {
    set((s) => {
      if (!s.screenplay) return s;
      const screenplay = structuredClone(s.screenplay);

      // Find and remove scene
      let movedScene: Scene | null = null;
      for (const act of screenplay.acts) {
        const idx = act.scenes.findIndex((sc) => sc.scene_global_number === sceneGlobalNumber);
        if (idx !== -1) {
          [movedScene] = act.scenes.splice(idx, 1);
          break;
        }
      }
      if (!movedScene) return s;

      // Insert into target act
      const targetAct = screenplay.acts.find((a) => a.act_number === newActNumber);
      if (targetAct) {
        movedScene = { ...movedScene, scene_number: newIndex + 1 };
        targetAct.scenes.splice(newIndex, 0, movedScene);
        renumberScenes(screenplay);
      }
      return { screenplay, isDirty: true };
    });
  },

  // ---------- Character 操作 ----------

  updateCharacter: (characterId, patch) => {
    set((s) => {
      if (!s.screenplay) return s;
      const screenplay = structuredClone(s.screenplay);
      const idx = screenplay.characters.findIndex((c) => c.character_id === characterId);
      if (idx !== -1) {
        screenplay.characters[idx] = { ...screenplay.characters[idx], ...patch };
        return { screenplay, isDirty: true };
      }
      return s;
    });
  },

  renameCharacter: (characterId, newName) => {
    set((s) => {
      if (!s.screenplay) return s;
      const screenplay = structuredClone(s.screenplay);

      // Update in characters table
      const char = screenplay.characters.find((c) => c.character_id === characterId);
      if (!char) return s;
      char.name = newName;

      // Update all beats referencing this character (F71 全局同步)
      for (const act of screenplay.acts) {
        for (const scene of act.scenes) {
          for (const beat of scene.beats) {
            if ('character_id' in beat && beat.character_id === characterId && 'character_name_display' in beat) {
              (beat as { character_name_display?: string }).character_name_display = newName;
            }
          }
        }
      }

      return { screenplay, isDirty: true };
    });
  },

  isDirty: false,
  markClean: () => set({ isDirty: false }),

  // ---------- AI 重新生成场景 ----------

  regenerateScene: async (sceneGlobalNumber, mode) => {
    const plan = usePlanStore.getState().plan;
    if (!plan) throw new Error('无改编规划数据');

    const scenePlan = plan.scene_plan.find(sp => sp.scene_global_number === sceneGlobalNumber);
    if (!scenePlan) throw new Error(`未找到场景 ${sceneGlobalNumber} 的规划数据`);

    const aiConfig = useConfigStore.getState().aiConfig;
    if (!aiConfig) throw new Error('未配置 AI 引擎');

    // Mark as regenerating
    useEditorStore.getState().toggleRegenerating(sceneGlobalNumber);

    try {
      const currentScreenplay = get().screenplay;
      let previousBeats: Beat[] | undefined;
      if (currentScreenplay && mode === 'improve') {
        for (const act of currentScreenplay.acts) {
          const scene = act.scenes.find(s => s.scene_global_number === sceneGlobalNumber);
          if (scene) { previousBeats = scene.beats; break; }
        }
      }

      const characters = currentScreenplay?.characters;
      const locations = currentScreenplay?.locations;

      const result = await expandSingleScene(scenePlan, aiConfig, {
        mode,
        previousBeats,
        characters,
        locations,
      });

      // Replace beats in the screenplay
      set((s) => {
        if (!s.screenplay) return s;
        const screenplay = structuredClone(s.screenplay);
        for (const act of screenplay.acts) {
          const scene = act.scenes.find(sc => sc.scene_global_number === sceneGlobalNumber);
          if (scene) {
            scene.beats = result.beats;
            scene.tension_level = result.tension_level;
            scene.estimated_duration_seconds = result.beats.reduce((sum, b) => sum + (b.estimated_duration_seconds || 0), 0);
            break;
          }
        }
        renumberBeats(screenplay);
        return { screenplay, isDirty: true };
      });
    } finally {
      useEditorStore.getState().toggleRegenerating(sceneGlobalNumber);
    }
  },
}));

// ============================== Helpers ==============================

function renumberBeats(screenplay: Screenplay): void {
  const episode = screenplay.metadata.episode_info?.episode_number ?? 1;
  for (const act of screenplay.acts) {
    for (const scene of act.scenes) {
      for (let i = 0; i < scene.beats.length; i++) {
        scene.beats[i].beat_id = generateBeatId(episode, act.act_number, scene.scene_global_number, i + 1);
      }
    }
  }
}

function renumberScenes(screenplay: Screenplay): void {
  let globalNumber = 1;
  for (const act of screenplay.acts) {
    for (let i = 0; i < act.scenes.length; i++) {
      act.scenes[i].scene_number = i + 1;
      act.scenes[i].scene_global_number = globalNumber++;
    }
  }
  // Also renumber beats
  renumberBeats(screenplay);
}
