// ============================================================================
// 编辑器 UI 状态 Store — F67-F78 相关的 UI 状态
// ============================================================================

import { create } from 'zustand';

interface EditorStore {
  // 当前选中
  selectedBeatId: string | null;
  setSelectedBeatId: (id: string | null) => void;

  // 当前展开的幕
  expandedActs: Set<number>;
  toggleAct: (actNumber: number) => void;
  expandAllActs: (count: number) => void;
  collapseAllActs: () => void;

  // 当前展开的场景
  expandedScenes: Set<number>;
  toggleScene: (sceneGlobalNumber: number) => void;

  // 编辑模式
  editingBeatId: string | null;
  setEditingBeatId: (id: string | null) => void;

  // 视图模式
  viewMode: 'edit' | 'source_compare' | 'analysis';
  setViewMode: (mode: 'edit' | 'source_compare' | 'analysis') => void;

  // AI 处理状态
  isProcessing: boolean;
  processingStep: string;
  setProcessing: (isProcessing: boolean, step?: string) => void;

  // 正在重新生成的场景编号
  regeneratingSceneNumbers: Set<number>;
  toggleRegenerating: (sceneNumber: number) => void;

  // AI 标记显示开关
  showAiMarkers: boolean;
  setShowAiMarkers: (show: boolean) => void;
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  selectedBeatId: null,
  setSelectedBeatId: (id) => set({ selectedBeatId: id }),

  expandedActs: new Set([1]), // 默认展开第一幕
  toggleAct: (actNumber) => {
    set((s) => {
      const next = new Set(s.expandedActs);
      if (next.has(actNumber)) next.delete(actNumber);
      else next.add(actNumber);
      return { expandedActs: next };
    });
  },
  expandAllActs: (count) => {
    const all = new Set<number>();
    for (let i = 1; i <= count; i++) all.add(i);
    set({ expandedActs: all });
  },
  collapseAllActs: () => set({ expandedActs: new Set() }),

  expandedScenes: new Set(),
  toggleScene: (sceneGlobalNumber) => {
    set((s) => {
      const next = new Set(s.expandedScenes);
      if (next.has(sceneGlobalNumber)) next.delete(sceneGlobalNumber);
      else next.add(sceneGlobalNumber);
      return { expandedScenes: next };
    });
  },

  editingBeatId: null,
  setEditingBeatId: (id) => set({ editingBeatId: id }),

  viewMode: 'edit',
  setViewMode: (mode) => set({ viewMode: mode }),

  isProcessing: false,
  processingStep: '',
  setProcessing: (isProcessing, step = '') => set({ isProcessing, processingStep: step }),

  regeneratingSceneNumbers: new Set(),
  toggleRegenerating: (sceneNumber) => {
    set((s) => {
      const next = new Set(s.regeneratingSceneNumbers);
      if (next.has(sceneNumber)) next.delete(sceneNumber);
      else next.add(sceneNumber);
      return { regeneratingSceneNumbers: next };
    });
  },

  showAiMarkers: true,
  setShowAiMarkers: (show) => set({ showAiMarkers: show }),
}));
