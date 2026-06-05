// ============================================================================
// Config 配置面板 — F46 F47 F52 F53 F54
// ============================================================================

import React from 'react';
import { useConfigStore } from '../store';
import { AI_PROVIDERS, AI_PROVIDER_LABELS, AI_MODELS, MEDIUM_LABELS, GENRE_OPTIONS, GENRE_LABELS, TONE_OPTIONS, TONE_LABELS } from '../shared/constants';
import { getApiKey, setApiKey } from '../shared/ai-config';
import type { AiConfig, ConversionConfig } from '../schema/types';
import type { AiProvider } from './types';

export { AI_PROVIDERS, AI_MODELS };

export type { AiProvider };

export const ConfigPanel: React.FC = () => {
  const { aiConfig, setAiConfig, conversionConfig, setConversionConfig } = useConfigStore();
  const [apiKeys, setApiKeys] = React.useState<Record<string, string>>(() => {
    const keys: Record<string, string> = {};
    for (const p of AI_PROVIDERS) {
      keys[p] = getApiKey(p) || '';
    }
    return keys;
  });

  const handleProviderChange = (provider: string) => {
    const newConfig = {
      ...aiConfig,
      ai_provider: provider as AiConfig['ai_provider'],
      ai_model: AI_MODELS[provider]?.[0] || '',
    };
    setAiConfig(newConfig);
  };

  const handleModelChange = (model: string) => setAiConfig({ ...aiConfig, ai_model: model });
  const handleApiKeyChange = (provider: string, key: string) => {
    setApiKeys((prev) => ({ ...prev, [provider]: key }));
    setApiKey(provider, key);
  };

  const handleCustomEndpoint = (url: string) => setAiConfig({ ...aiConfig, ai_api_base_url: url });

  const handleMediumChange = (m: string) => setConversionConfig({ ...conversionConfig, target_medium: m as ConversionConfig['target_medium'] });
  const handleGenreToggle = (g: string) => {
    const genres = conversionConfig.genre.includes(g)
      ? conversionConfig.genre.filter((x) => x !== g)
      : [...conversionConfig.genre, g];
    setConversionConfig({ ...conversionConfig, genre: genres });
  };
  const handleToneChange = (t: string) => setConversionConfig({ ...conversionConfig, tone: t as ConversionConfig['tone'] });

  return (
    <div style={{ padding: 16, overflowY: 'auto', height: '100%' }}>
      <h3 style={{ marginTop: 0 }}>AI 引擎配置</h3>

      {/* Provider */}
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>AI 提供商</label>
        <select
          value={aiConfig.ai_provider}
          onChange={(e) => handleProviderChange(e.target.value)}
          style={selectStyle}
        >
          {AI_PROVIDERS.map((p) => (
            <option key={p} value={p}>{AI_PROVIDER_LABELS[p] || p}</option>
          ))}
        </select>
      </div>

      {/* Model */}
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>模型</label>
        <select
          value={aiConfig.ai_model}
          onChange={(e) => handleModelChange(e.target.value)}
          style={selectStyle}
        >
          {(AI_MODELS[aiConfig.ai_provider] || []).map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
          {aiConfig.ai_provider === 'custom' && aiConfig.ai_model && (
            <option value={aiConfig.ai_model}>{aiConfig.ai_model}</option>
          )}
        </select>
        {aiConfig.ai_provider === 'custom' && (
          <input
            style={{ ...inputStyle, marginTop: 4 }}
            placeholder="输入自定义模型名"
            value={aiConfig.ai_model}
            onChange={(e) => handleModelChange(e.target.value)}
          />
        )}
      </div>

      {/* API Key — only show current provider */}
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>{AI_PROVIDER_LABELS[aiConfig.ai_provider]} API Key</label>
        <input
          type="password"
          style={inputStyle}
          placeholder={`输入您的 ${AI_PROVIDER_LABELS[aiConfig.ai_provider]} API Key`}
          value={apiKeys[aiConfig.ai_provider] || ''}
          onChange={(e) => handleApiKeyChange(aiConfig.ai_provider, e.target.value)}
        />
      </div>

      {/* Custom endpoint */}
      {aiConfig.ai_provider === 'custom' && (
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>自定义 API 端点</label>
          <input
            style={inputStyle}
            placeholder="https://your-api.com/v1/chat/completions"
            value={aiConfig.ai_api_base_url || ''}
            onChange={(e) => handleCustomEndpoint(e.target.value)}
          />
        </div>
      )}

      <hr />

      <h3>转换参数</h3>

      {/* Target Medium */}
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>目标媒介</label>
        <select
          value={conversionConfig.target_medium}
          onChange={(e) => handleMediumChange(e.target.value)}
          style={selectStyle}
        >
          {Object.entries(MEDIUM_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Tone */}
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>基调</label>
        <select
          value={conversionConfig.tone}
          onChange={(e) => handleToneChange(e.target.value)}
          style={selectStyle}
        >
          {TONE_OPTIONS.map((t) => (
            <option key={t} value={t}>{TONE_LABELS[t] || t}</option>
          ))}
        </select>
      </div>

      {/* Genre */}
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>类型标签</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {GENRE_OPTIONS.map((g) => (
            <button
              key={g}
              onClick={() => handleGenreToggle(g)}
              style={{
                ...tagStyle,
                backgroundColor: conversionConfig.genre.includes(g) ? '#1976d2' : '#e0e0e0',
                color: conversionConfig.genre.includes(g) ? '#fff' : '#333',
              }}
            >
              {GENRE_LABELS[g] || g}
            </button>
          ))}
        </div>
      </div>

      {/* Save Template */}
      <button
        onClick={() => {
          const name = prompt('模板名称：');
          if (name) useConfigStore.getState().saveTemplate(name);
        }}
        style={{ ...btnStyle, marginTop: 8 }}
      >
        💾 保存当前配置为模板
      </button>
    </div>
  );
};

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#555' };
const selectStyle: React.CSSProperties = { width: '100%', padding: 6, borderRadius: 4, border: '1px solid #ccc', fontSize: 14 };
const inputStyle: React.CSSProperties = { width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid #ccc', fontSize: 14, boxSizing: 'border-box' };
const tagStyle: React.CSSProperties = { border: 'none', borderRadius: 12, padding: '3px 10px', fontSize: 12, cursor: 'pointer' };
const btnStyle: React.CSSProperties = { width: '100%', padding: 8, borderRadius: 4, border: '1px solid #1976d2', background: '#fff', color: '#1976d2', cursor: 'pointer', fontSize: 13 };
