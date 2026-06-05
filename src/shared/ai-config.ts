// ============================================================================
// AI 引擎配置 — F46 F47 F66 跨阶段统一 AI 配置
// ============================================================================

import type { AiConfig } from '../schema/types';
import { DEFAULT_AI_CONFIG } from './constants';

const STORAGE_KEY = 'aiscript_ai_config';

/**
 * 加载 AI 配置（优先级：localStorage → 默认值）
 */
export function loadAiConfig(): AiConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_AI_CONFIG, ...parsed };
    }
  } catch {
    // ignore parse errors
  }
  return { ...DEFAULT_AI_CONFIG };
}

/**
 * 保存 AI 配置到 localStorage
 * 确保三个阶段共用同一配置（F66）
 */
export function saveAiConfig(config: AiConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

/**
 * 获取 API Key（从 localStorage 读取，不硬编码在配置中）
 */
export function getApiKey(provider: string): string | null {
  try {
    return localStorage.getItem(`aiscript_api_key_${provider}`);
  } catch {
    return null;
  }
}

/**
 * 保存 API Key
 */
export function setApiKey(provider: string, key: string): void {
  localStorage.setItem(`aiscript_api_key_${provider}`, key);
}

/**
 * 获取完整的 API 端点 URL
 */
export function getApiEndpoint(config: AiConfig): string {
  if (config.ai_provider === 'custom' && config.ai_api_base_url) {
    return config.ai_api_base_url;
  }
  const endpoints: Record<string, string> = {
    deepseek: 'https://api.deepseek.com/v1/chat/completions',
    openai: 'https://api.openai.com/v1/chat/completions',
    anthropic: 'https://api.anthropic.com/v1/messages',
    zhipu: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    moonshot: 'https://api.moonshot.cn/v1/chat/completions',
    custom: '',
  };
  return endpoints[config.ai_provider] || '';
}
