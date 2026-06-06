// ============================================================================
// projectStore — 项目管理状态
// 管理多项目列表 + 活跃项目切换
// ============================================================================

import { create } from 'zustand';

export interface ProjectMeta {
  id: string;
  title: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  phase: 'imported' | 'analyzed' | 'planned' | 'scripted';
}

const STORAGE_KEY = 'aiscript_project_list';

function loadProjects(): ProjectMeta[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveProjects(list: ProjectMeta[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

interface ProjectStore {
  projects: ProjectMeta[];
  activeProjectId: string | null;
  setProjects: (list: ProjectMeta[]) => void;
  setActiveProject: (id: string) => void;
  addProject: (meta: ProjectMeta) => void;
  updateProjectPhase: (id: string, phase: ProjectMeta['phase']) => void;
  removeProject: (id: string) => void;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: loadProjects(),
  activeProjectId: null,

  setProjects: (list) => {
    saveProjects(list);
    set({ projects: list });
  },

  setActiveProject: (id) => {
    set({ activeProjectId: id });
  },

  addProject: (meta) => {
    const next = [...get().projects, meta];
    saveProjects(next);
    set({ projects: next });
  },

  updateProjectPhase: (id, phase) => {
    const next = get().projects.map((p) =>
      p.id === id ? { ...p, phase, updatedAt: new Date().toISOString() } : p
    );
    saveProjects(next);
    set({ projects: next });
  },

  removeProject: (id) => {
    const next = get().projects.filter((p) => p.id !== id);
    saveProjects(next);
    // 清除该项目的持久化数据
    localStorage.removeItem(`aiscript_analysis_${id}`);
    localStorage.removeItem(`aiscript_plan_${id}`);
    localStorage.removeItem(`aiscript_screenplay_${id}`);
    localStorage.removeItem(`aiscript_project_meta_${id}`);
    set({ projects: next, activeProjectId: get().activeProjectId === id ? null : get().activeProjectId });
  },
}));