// ============================================================================
// SettingsPage — 独立设置页
// Tab: AI 引擎 | 转换参数 | 关于
// ============================================================================

import React, { useState } from 'react';
import { useConfigStore } from '@/store';
import {
  AI_PROVIDERS, AI_PROVIDER_LABELS, AI_MODELS,
  DEFAULT_AI_CONFIG, DEFAULT_CONVERSION_CONFIG,
} from '@/shared/constants';
import { getApiKey, setApiKey, saveAiConfig } from '@/shared/ai-config';
import type { AiConfig } from '@/schema/types';

type Tab = 'ai' | 'about';

interface Props {
  onBack: () => void;
}

export const SettingsPage: React.FC<Props> = ({ onBack }) => {
  const [tab, setTab] = useState<Tab>('ai');

  const tabs: Array<{ key: Tab; label: string; icon: string }> = [
    { key: 'ai', label: 'AI 引擎', icon: '🤖' },
    { key: 'about', label: '关于', icon: 'ℹ️' },
  ];

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 32 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <button onClick={onBack} style={backBtn}>← 返回工作区</button>
        <h2 style={{ margin: 0, fontSize: 20 }}>⚙️ 设置</h2>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '2px solid #e0e0e0' }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderBottom: tab === t.key ? '2px solid #1976d2' : '2px solid transparent',
              background: 'transparent',
              cursor: 'pointer',
              fontWeight: tab === t.key ? 600 : 400,
              color: tab === t.key ? '#1976d2' : '#666',
              fontSize: 14,
              marginBottom: -2,
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

	      {/* Tab Content */}
      <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 8, padding: 24 }}>
        {tab === 'ai' && <AiEngineTab />}
        {tab === 'about' && <AboutTab />}
      </div>
    </div>
  );
};

// ===================== AI 引擎 Tab =====================

const AiEngineTab: React.FC = () => {
  const { aiConfig, setAiConfig, setProjectConfig } = useConfigStore();
  const [apiKeys, setApiKeys] = useState<Record<string, string>>(() => {
    const keys: Record<string, string> = {};
    for (const p of AI_PROVIDERS) keys[p] = getApiKey(p) || '';
    return keys;
  });
  const [saved, setSaved] = useState(false);

  const handleProvider = (p: string) => {
    setAiConfig({ ...aiConfig, ai_provider: p as AiConfig['ai_provider'], ai_model: AI_MODELS[p]?.[0] ?? '', tier1_model: undefined });
  };

  const handleKey = (p: string, k: string) => {
    setApiKeys((s) => ({ ...s, [p]: k }));
    setApiKey(p, k);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div>
      {saved && <div style={{ padding: '6px 12px', background: '#e8f5e9', color: '#2e7d32', borderRadius: 4, marginBottom: 12, fontSize: 13 }}>✅ API Key 已保存</div>}

      {/* 重置为默认值 */}
      <div style={{ marginTop: 24, padding: 16, background: '#fafafa', borderRadius: 8, border: '1px solid #e8e8e8' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: 13, color: '#333' }}>⚙️ 重置所有配置</h4>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#999' }}>
              将 AI 配置、API Key、转换参数重置为应用默认值
            </p>
          </div>
          <button
            onClick={() => {
              if (!confirm('确认重置所有配置为默认值？此操作不可撤销。')) return;
              // 重置 AI 配置
              setAiConfig({ ...DEFAULT_AI_CONFIG } as Partial<AiConfig>);
              saveAiConfig(DEFAULT_AI_CONFIG);
              // 重置转换配置（清除所有项目的配置缓存 + 重置 localStorage 中的默认）
              // 注意：setProjectConfig 需要 projectId，但这里只做全局重置
              // 直接清除 localStorage 中存储的项目配置
              try {
                const keys = Object.keys(localStorage).filter((k) => k.startsWith('aiscript_project_conversion_'));
                keys.forEach((k) => localStorage.removeItem(k));
              } catch { /* ignore */ }
              // 清除所有 API Key
              const emptyKeys: Record<string, string> = {};
              for (const p of AI_PROVIDERS) {
                setApiKey(p, '');
                emptyKeys[p] = '';
              }
              setApiKeys(emptyKeys);
              setSaved(true);
              setTimeout(() => setSaved(false), 1500);
            }}
            style={{
              padding: '8px 20px', background: '#fff', color: '#f44336',
              border: '1px solid #f44336', borderRadius: 6, cursor: 'pointer',
              fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
            }}
          >
            🔄 重置为默认值
          </button>
        </div>
      </div>

      {/* SSL警告 */}
      <div style={{ padding: '8px 12px', background: '#fff3e0', border: '1px solid #ffe0b2', borderRadius: 6, marginBottom: 16, fontSize: 12, color: '#e65100' }}>
        ⚠️ API Key 仅保存在浏览器本地存储 (localStorage)，不会上传到任何服务器。请确保在可信设备上使用。
      </div>

      {/* Provider + Model + Key */}
      <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '12px 16px', alignItems: 'center' }}>
        <Label>AI 提供商</Label>
        <select value={aiConfig.ai_provider} onChange={(e) => handleProvider(e.target.value)} style={selectStyle}>
          {AI_PROVIDERS.map((p) => <option key={p} value={p}>{AI_PROVIDER_LABELS[p] ?? p}</option>)}
        </select>

        <Label>默认模型</Label>
        {aiConfig.ai_provider === 'custom' ? (
          <input value={aiConfig.ai_model} onChange={(e) => setAiConfig({ ...aiConfig, ai_model: e.target.value })}
            style={inputStyle} placeholder="输入模型 ID (如 gpt-4o-mini)" />
        ) : (
          <select value={aiConfig.ai_model} onChange={(e) => setAiConfig({ ...aiConfig, ai_model: e.target.value })} style={selectStyle}>
            {(AI_MODELS[aiConfig.ai_provider] ?? []).map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        )}
        <div style={{ gridColumn: '2', fontSize: 10, color: '#aaa', marginTop: -8 }}>用于全文综合、改编规划、Beat 展开等重度任务</div>

        <Label>轻任务模型</Label>
        {aiConfig.ai_provider === 'custom' ? (
          <input value={aiConfig.tier1_model ?? ''} onChange={(e) => setAiConfig({ ...aiConfig, tier1_model: e.target.value || undefined })}
            style={inputStyle} placeholder="留空则使用默认模型" />
        ) : (
          <select value={aiConfig.tier1_model ?? ''} onChange={(e) => setAiConfig({ ...aiConfig, tier1_model: e.target.value || undefined })} style={selectStyle}>
            <option value="">使用默认模型</option>
            {(AI_MODELS[aiConfig.ai_provider] ?? []).map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        )}
        <div style={{ gridColumn: '2', fontSize: 10, color: '#aaa', marginTop: -8 }}>用于逐章分析等轻量并行任务。留空则使用默认模型</div>

        <Label>API Key</Label>
        <input type="password" value={apiKeys[aiConfig.ai_provider] ?? ''}
          onChange={(e) => handleKey(aiConfig.ai_provider, e.target.value)}
          style={inputStyle} placeholder={`${AI_PROVIDER_LABELS[aiConfig.ai_provider]} 的 API Key (sk-...)`} />

        {aiConfig.ai_provider === 'custom' && (
          <>
            <Label>自定义端点</Label>
            <input value={aiConfig.ai_api_base_url ?? ''} style={inputStyle}
              onChange={(e) => setAiConfig({ ...aiConfig, ai_api_base_url: e.target.value })}
              placeholder="https://your-api.com/v1/chat/completions" />
          </>
        )}
      </div>

      {/* 所有 Provider 的 Key（展开） */}
      <details style={{ marginTop: 20 }}>
        <summary style={{ cursor: 'pointer', fontSize: 13, color: '#888' }}>管理所有提供商的 API Key</summary>
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {AI_PROVIDERS.filter((p) => p !== aiConfig.ai_provider).map((p) => (
            <div key={p} style={{ display: 'flex', gap: 12 }}>
              <span style={{ width: 120, fontSize: 12, color: '#666', flexShrink: 0, paddingTop: 6 }}>{AI_PROVIDER_LABELS[p] ?? p}</span>
              <input type="password" value={apiKeys[p] ?? ''} onChange={(e) => handleKey(p, e.target.value)}
                style={inputStyle} placeholder="API Key (sk-...)" />
            </div>
          ))}
        </div>
      </details>
    </div>
  );
};

// ===================== 关于 Tab =====================

const AboutTab: React.FC = () => (
  <div style={{ fontSize: 13, lineHeight: 1.8, color: '#555' }}>
    <h3 style={{ margin: '0 0 12px', color: '#333' }}>AI 辅助剧本创作工具</h3>
    <p><strong>版本:</strong> v0.2.0 (MVP)</p>
    <p><strong>技术栈:</strong> React 18 + TypeScript + Zustand + Vite 6 + js-yaml + ajv</p>
    <p><strong>数据标准:</strong> NovelAnalysis v1.1.0 / AdaptationPlan v1.1.0 / Screenplay v1.1.0</p>
    <p><strong>支持 AI:</strong> DeepSeek (V4 Pro/Flash) / OpenAI / Anthropic / 智谱 / 月之暗面 / 自定义端点</p>
    <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '16px 0' }} />
    <p style={{ color: '#888' }}>API Key 存储于浏览器 localStorage，不会上传到任何第三方服务器。所有 AI 调用直接从浏览器发起。</p>
  </div>
);

// ====== Helpers ======

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ fontSize: 13, fontWeight: 600, color: '#555' }}>{children}</span>
);

const selectStyle: React.CSSProperties = { width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #d0d0d0', fontSize: 13, background: '#fff' };

const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #d0d0d0', fontSize: 13, boxSizing: 'border-box' };

const backBtn: React.CSSProperties = {
  padding: '6px 14px', border: '1px solid #d0d0d0', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 13,
};
