// ============================================================================
// 转换配置 Store — F46 F47 F52 F53 F54 F56
// 管理 AI 引擎配置 + 转换参数 + 配置模板
// ============================================================================

import { create } from 'zustand';
import type { AiConfig, ConversionConfig } from '../schema/types';
import { DEFAULT_AI_CONFIG, DEFAULT_CONVERSION_CONFIG, DEFAULT_BEAT_EXPANSION_CONCURRENCY } from '../shared/constants';
import { loadAiConfig, saveAiConfig } from '../shared/ai-config';

interface ConfigTemplate {
  id: string;
  name: string;
  aiConfig: AiConfig;
  conversionConfig: ConversionConfig;
  createdAt: string;
}

interface ConfigStore {
  // AI 引擎配置
  aiConfig: AiConfig;
  setAiConfig: (config: Partial<AiConfig>) => void;

  // 转换参数配置
  conversionConfig: ConversionConfig;
  setConversionConfig: (config: Partial<ConversionConfig>) => void;

  // Beat 展开并发数
  concurrency: number;
  setConcurrency: (n: number) => void;

  // 配置模板 (F56)
  templates: ConfigTemplate[];
  saveTemplate: (name: string) => void;
  loadTemplate: (id: string) => void;
  deleteTemplate: (id: string) => void;
}

export const useConfigStore = create<ConfigStore>((set, get) => {
  // 初始化：从 localStorage 加载
  const savedAiConfig = loadAiConfig();

  return {
    aiConfig: savedAiConfig,
    setAiConfig: (patch) => {
      set((s) => {
        const next = { ...s.aiConfig, ...patch };
        saveAiConfig(next);
        return { aiConfig: next };
      });
    },

    conversionConfig: { ...DEFAULT_CONVERSION_CONFIG },
    setConversionConfig: (patch) => {
      set((s) => ({ conversionConfig: { ...s.conversionConfig, ...patch } }));
    },

    concurrency: DEFAULT_BEAT_EXPANSION_CONCURRENCY,
    setConcurrency: (n) => set({ concurrency: n }),

    templates: [],
    saveTemplate: (name) => {
      const { aiConfig, conversionConfig, templates } = get();
      const template: ConfigTemplate = {
        id: `tpl_${Date.now()}`,
        name,
        aiConfig: { ...aiConfig },
        conversionConfig: { ...conversionConfig },
        createdAt: new Date().toISOString(),
      };
      set({ templates: [...templates, template] });
      // 持久化模板
      try {
        localStorage.setItem('aiscript_config_templates', JSON.stringify([...templates, template]));
      } catch { /* ignore */ }
    },
    loadTemplate: (id) => {
      const template = get().templates.find((t) => t.id === id);
      if (template) {
        set({ aiConfig: { ...template.aiConfig }, conversionConfig: { ...template.conversionConfig } });
        saveAiConfig(template.aiConfig);
      }
    },
    deleteTemplate: (id) => {
      set((s) => {
        const next = s.templates.filter((t) => t.id !== id);
        try { localStorage.setItem('aiscript_config_templates', JSON.stringify(next)); } catch { /* ignore */ }
        return { templates: next };
      });
    },
  };
});

// 恢复模板
try {
  const raw = localStorage.getItem('aiscript_config_templates');
  if (raw) {
    const templates = JSON.parse(raw);
    useConfigStore.setState({ templates });
  }
} catch { /* ignore */ }
