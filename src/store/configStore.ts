// ============================================================================
// 转换配置 Store — F46 F47 F52 F53 F54 F56
// 管理 AI 引擎配置（全局） + 转换参数（项目级） + 转换配置模板
// v0.6.0: ConversionConfig 从全局改为项目级存储，支持模板跨项目复用
// ============================================================================

import { create } from 'zustand';
import type { AiConfig, ConversionConfig } from '../schema/types';
import { DEFAULT_AI_CONFIG, DEFAULT_CONVERSION_CONFIG, DEFAULT_BEAT_EXPANSION_CONCURRENCY } from '../shared/constants';
import { loadAiConfig, saveAiConfig } from '../shared/ai-config';

/** 转换配置模板（只存 ConversionConfig，不含 AiConfig） */
export interface ConversionTemplate {
  id: string;
  name: string;
  config: ConversionConfig;
  createdAt: string;
}

interface ConfigStore {
  // AI 引擎配置（全局 — API Key 不按项目存储）
  aiConfig: AiConfig;
  setAiConfig: (patch: Partial<AiConfig>) => void;

  // 转换参数配置（项目级存储）
  projectConfigs: Record<string, ConversionConfig>;
  /** 获取某项目的转换配置，不存在则返回默认值 */
  getProjectConfig: (projectId: string) => ConversionConfig;
  /** 更新某项目的转换配置 */
  setProjectConfig: (projectId: string, patch: Partial<ConversionConfig>) => void;

  // Beat 展开并发数
  concurrency: number;
  setConcurrency: (n: number) => void;

  // 转换配置模板（跨项目复用）
  conversionTemplates: ConversionTemplate[];
  /** 将当前项目的转换配置保存为模板 */
  saveConversionTemplate: (projectId: string, name: string) => void;
  /** 将模板加载到指定项目 */
  loadConversionTemplate: (projectId: string, templateId: string) => void;
  /** 删除模板 */
  deleteConversionTemplate: (id: string) => void;
}

/** localStorage key 前缀 */
const CONFIG_KEY_PREFIX = 'aiscript_conversion_config_';
const TEMPLATES_KEY = 'aiscript_conversion_templates';

function loadProjectConfigs(): Record<string, ConversionConfig> {
  const configs: Record<string, ConversionConfig> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CONFIG_KEY_PREFIX)) {
        const projectId = key.slice(CONFIG_KEY_PREFIX.length);
        const raw = localStorage.getItem(key);
        if (raw) {
          configs[projectId] = JSON.parse(raw);
        }
      }
    }
  } catch { /* ignore */ }
  return configs;
}

function saveProjectConfig(projectId: string, config: ConversionConfig): void {
  try {
    localStorage.setItem(CONFIG_KEY_PREFIX + projectId, JSON.stringify(config));
  } catch { /* ignore */ }
}

function loadTemplates(): ConversionTemplate[] {
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTemplates(templates: ConversionTemplate[]): void {
  try {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
  } catch { /* ignore */ }
}

export const useConfigStore = create<ConfigStore>((set, get) => {
  const savedAiConfig = loadAiConfig();
  const initialConfigs = loadProjectConfigs();
  const initialTemplates = loadTemplates();

  return {
    aiConfig: savedAiConfig,
    setAiConfig: (patch) => {
      set((s) => {
        const next = { ...s.aiConfig, ...patch };
        saveAiConfig(next);
        return { aiConfig: next };
      });
    },

    projectConfigs: initialConfigs,
    getProjectConfig: (projectId) => {
      const existing = get().projectConfigs[projectId];
      return existing ?? { ...DEFAULT_CONVERSION_CONFIG };
    },
    setProjectConfig: (projectId, patch) => {
      set((s) => {
        const current = s.projectConfigs[projectId] ?? { ...DEFAULT_CONVERSION_CONFIG };
        const next = { ...current, ...patch };
        const newConfigs = { ...s.projectConfigs, [projectId]: next };
        saveProjectConfig(projectId, next);
        return { projectConfigs: newConfigs };
      });
    },

    concurrency: DEFAULT_BEAT_EXPANSION_CONCURRENCY,
    setConcurrency: (n) => set({ concurrency: n }),

    conversionTemplates: initialTemplates,
    saveConversionTemplate: (projectId, name) => {
      const config = get().getProjectConfig(projectId);
      const { conversionTemplates } = get();
      const template: ConversionTemplate = {
        id: `ctpl_${Date.now()}`,
        name: name.trim(),
        config: { ...config },
        createdAt: new Date().toISOString(),
      };
      const next = [...conversionTemplates, template];
      set({ conversionTemplates: next });
      saveTemplates(next);
    },
    loadConversionTemplate: (projectId, templateId) => {
      const template = get().conversionTemplates.find((t) => t.id === templateId);
      if (template) {
        get().setProjectConfig(projectId, template.config);
      }
    },
    deleteConversionTemplate: (id) => {
      set((s) => {
        const next = s.conversionTemplates.filter((t) => t.id !== id);
        saveTemplates(next);
        return { conversionTemplates: next };
      });
    },
  };
});
