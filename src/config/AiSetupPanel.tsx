// ============================================================================
// AiSetupPanel — 导入页面的 AI 配置面板
// 独立组件，在导入阶段就能看到并修改 AI / 媒介 / 参数配置
// ============================================================================

import React, { useState } from 'react';
import { useConfigStore } from '../store';
import {
  AI_PROVIDERS, AI_PROVIDER_LABELS, AI_MODELS,
} from '../shared/constants';
import { getApiKey, setApiKey } from '../shared/ai-config';
import type { AiConfig } from '../schema/types';

/** 自适应布局的 AI 配置面板（独立于编辑器侧栏） */
export const AiSetupPanel: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { aiConfig, setAiConfig } = useConfigStore();
  const [expanded, setExpanded] = useState(!compact);
  const [apiKeys, setApiKeys] = useState<Record<string, string>>(() => {
    const keys: Record<string, string> = {};
    for (const p of AI_PROVIDERS) keys[p] = getApiKey(p) || '';
    return keys;
  });

  if (compact && !expanded) {
    return (
      <div style={{ padding: 12 }}>
        <button onClick={() => setExpanded(true)} style={toggleBtnStyle}>
          ⚙️ 配置 AI 引擎 · {AI_PROVIDER_LABELS[aiConfig.ai_provider]} / {aiConfig.ai_model}
        </button>
      </div>
    );
  }

  const handleProvider = (p: string) =>
    setAiConfig({ ...aiConfig, ai_provider: p as AiConfig['ai_provider'], ai_model: AI_MODELS[p]?.[0] ?? '' });

  const handleModel = (m: string) => setAiConfig({ ...aiConfig, ai_model: m });
  const handleCustomEndpoint = (u: string) => setAiConfig({ ...aiConfig, ai_api_base_url: u });
  const handleKey = (p: string, k: string) => { setApiKeys((s) => ({ ...s, [p]: k })); setApiKey(p, k); };

  return (
    <div style={{ padding: 16, background: '#fff', borderRadius: 8, border: '1px solid #e8e8e8', fontSize: 13 }}>
      {/* 标题栏 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 15 }}>⚙️ AI 引擎配置</h3>
        {compact && <button onClick={() => setExpanded(false)} style={collapseBtn}>收起</button>}
      </div>

      {/* ========= 提供商 ========= */}
      <Section title="AI 提供商">
        <Select value={aiConfig.ai_provider} onChange={handleProvider}
          options={AI_PROVIDERS.map((p) => [p, AI_PROVIDER_LABELS[p] ?? p])} />
      </Section>

      {/* ========= 模型 ========= */}
      <Section title="模型">
        {aiConfig.ai_provider === 'custom' ? (
          <input
            style={inputStyle} placeholder="输入模型 ID，如 gpt-4o-mini"
            value={aiConfig.ai_model} onChange={(e) => handleModel(e.target.value)}
          />
        ) : (
          <Select value={aiConfig.ai_model} onChange={handleModel}
            options={(AI_MODELS[aiConfig.ai_provider] ?? []).map((m) => [m, m])} />
        )}
      </Section>

      {/* ========= API Key ========= */}
      <Section title={`${AI_PROVIDER_LABELS[aiConfig.ai_provider] ?? aiConfig.ai_provider} API Key`}>
        <input type="password" style={inputStyle}
          placeholder={`sk-... 或您的 API Key`}
          value={apiKeys[aiConfig.ai_provider] ?? ''}
          onChange={(e) => handleKey(aiConfig.ai_provider, e.target.value)} />
        <div style={{ fontSize: 10, color: '#999', marginTop: 2 }}>
          Key 仅保存在浏览器本地，不会上传到服务器
        </div>
      </Section>

      {/* ========= 自定义端点 (仅 custom) ========= */}
      {aiConfig.ai_provider === 'custom' && (
        <Section title="自定义 API 端点">
          <input style={inputStyle}
            placeholder="https://your-api.com/v1/chat/completions"
            value={aiConfig.ai_api_base_url ?? ''}
            onChange={(e) => handleCustomEndpoint(e.target.value)} />
        </Section>
      )}

    </div>
  );
};

// ---- helpers ----

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ marginBottom: 10 }}>
    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#777', marginBottom: 3 }}>{title}</label>
    {children}
  </div>
);

const Select: React.FC<{ value: string; onChange: (v: string) => void; options: Array<[string, string]> }> =
  ({ value, onChange, options }) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={selectStyle}>
      {options.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
    </select>
  );

const selectStyle: React.CSSProperties = { width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid #d0d0d0', fontSize: 13, background: '#fff' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid #d0d0d0', fontSize: 13, boxSizing: 'border-box' };
const toggleBtnStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', borderRadius: 6, border: '1px solid #d0d0d0', background: '#fff', cursor: 'pointer', fontSize: 13, textAlign: 'left' as const };
const collapseBtn: React.CSSProperties = { background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 12, color: '#888' };
