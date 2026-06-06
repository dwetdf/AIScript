// ============================================================================
// ConversionPresetPanel — 项目级创作参数配置面板（阶段 2）
// 配置：媒介 / 时长 / 忠实度 / 基调 / 补充指令 + 模板保存/加载
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useConfigStore } from '../store';
import {
  MEDIUM_LABELS,
  TONE_OPTIONS, TONE_LABELS,
  FIDELITY_OPTIONS, FIDELITY_LABELS,
  DURATION_OPTIONS, DURATION_LABELS,
} from '../shared/constants';
import type { ConversionConfig } from '../schema/types';

interface Props {
  projectId: string;
}

export const ConversionPresetPanel: React.FC<Props> = ({ projectId }) => {
  const getProjectConfig = useConfigStore((s) => s.getProjectConfig);
  const setProjectConfig = useConfigStore((s) => s.setProjectConfig);
  const templates = useConfigStore((s) => s.conversionTemplates);
  const saveConversionTemplate = useConfigStore((s) => s.saveConversionTemplate);
  const loadConversionTemplate = useConfigStore((s) => s.loadConversionTemplate);
  const deleteConversionTemplate = useConfigStore((s) => s.deleteConversionTemplate);

  const [config, setConfig] = useState<ConversionConfig>(() => getProjectConfig(projectId));
  const [templateName, setTemplateName] = useState('');
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    setConfig(getProjectConfig(projectId));
  }, [projectId, getProjectConfig]);

  const updateField = useCallback(<K extends keyof ConversionConfig>(key: K, value: ConversionConfig[K]) => {
    setConfig((prev) => {
      const next = { ...prev, [key]: value };
      setProjectConfig(projectId, next);
      return next;
    });
  }, [projectId, setProjectConfig]);

  const handleCustomInstructions = useCallback((text: string) => {
    setConfig((prev) => {
      const next = { ...prev, custom_instructions: text };
      setProjectConfig(projectId, next);
      return next;
    });
  }, [projectId, setProjectConfig]);

  const handleSaveTemplate = useCallback(() => {
    const name = templateName.trim();
    if (!name) return;
    saveConversionTemplate(projectId, name);
    setTemplateName('');
    setSavedMsg('✅ 已保存');
    setTimeout(() => setSavedMsg(''), 2000);
  }, [projectId, templateName, saveConversionTemplate]);

  const handleLoadTemplate = useCallback((templateId: string) => {
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;
    loadConversionTemplate(projectId, templateId);
    setConfig(tpl.config);
    setSavedMsg('✅ 已加载');
    setTimeout(() => setSavedMsg(''), 2000);
  }, [projectId, templates, loadConversionTemplate]);

  const handleDeleteTemplate = useCallback((id: string, name: string) => {
    if (!window.confirm(`确定删除模板 "${name}"？`)) return;
    deleteConversionTemplate(id);
  }, [deleteConversionTemplate]);

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'left' }}>
      {/* ====== 模板加载栏 ====== */}
      {templates.length > 0 && (
        <div style={{
          background: '#f8f9fa', border: '1px solid #e8e8e8', borderRadius: 8,
          padding: '6px 12px', marginBottom: 12,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#666', whiteSpace: 'nowrap' }}>📁 模板</span>
          <select
            defaultValue=""
            onChange={(e) => { if (e.target.value) { handleLoadTemplate(e.target.value); e.target.value = ''; } }}
            style={{ flex: 1, padding: '4px 6px', borderRadius: 4, border: '1px solid #d0d0d0', fontSize: 12, background: '#fff' }}
          >
            <option value="">— 选择模板 —</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          {templates.map((t) => (
            <button key={t.id} onClick={() => handleDeleteTemplate(t.id, t.name)} title={`删除 "${t.name}"`}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, padding: 0 }}>
              🗑️
            </button>
          ))}
        </div>
      )}

      {/* ====== 创作参数 ====== */}
      <div style={{
        background: '#fff', border: '1px solid #e8e8e8', borderRadius: 8, padding: '14px 18px',
        marginBottom: 12,
      }}>
        {/* 标题行 + 保存模板 */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid #f0f0f0',
        }}>
          <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#333', whiteSpace: 'nowrap' }}>
            ⚙️ 创作参数
          </h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
            <input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveTemplate()}
              placeholder="模板名称"
              style={{ width: 96, padding: '4px 8px', borderRadius: 4, border: '1px solid #d0d0d0', fontSize: 12 }}
            />
            <button onClick={handleSaveTemplate} disabled={!templateName.trim()}
              style={{
                padding: '4px 12px', borderRadius: 4, fontSize: 12, cursor: 'pointer',
                background: templateName.trim() ? '#1976d2' : '#e0e0e0',
                color: templateName.trim() ? '#fff' : '#999',
                border: 'none', whiteSpace: 'nowrap',
              }}>
              💾 保存模板
            </button>
            {savedMsg && <span style={{ fontSize: 11, color: '#2e7d32', whiteSpace: 'nowrap' }}>{savedMsg}</span>}
          </div>
        </div>

        {/* 参数：双列 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', marginBottom: 12 }}>
          <ParamRow label="目标媒介">
            <select
              value={config.target_medium}
              onChange={(e) => {
                const medium = e.target.value as ConversionConfig['target_medium'];
                updateField('target_medium', medium);
                if (medium === 'film' || medium === 'stage_play') {
                  updateField('total_episodes', undefined);
                }
              }}
              style={selectStyle}
            >
              {Object.entries(MEDIUM_LABELS).map(([k, v]) => (
                <option
                  key={k}
                  value={k}
                  disabled={k !== 'film'}
                  title={k !== 'film' ? '暂不支持' : undefined}
                >{v}{k !== 'film' ? '（暂不支持）' : ''}</option>
              ))}
            </select>
          </ParamRow>

          <ParamRow label="目标篇幅">
            <select
              value={config.target_duration ?? 'standard'}
              onChange={(e) => updateField('target_duration', e.target.value as ConversionConfig['target_duration'])}
              style={selectStyle}
            >
              {DURATION_OPTIONS.map((d) => (
                <option key={d} value={d}>{DURATION_LABELS[d] ?? d}</option>
              ))}
            </select>
          </ParamRow>

          <ParamRow label="改编忠实度">
            <select
              value={config.adaptation_fidelity}
              onChange={(e) => updateField('adaptation_fidelity', e.target.value as ConversionConfig['adaptation_fidelity'])}
              style={selectStyle}
            >
              {FIDELITY_OPTIONS.map((f) => (
                <option key={f} value={f}>{FIDELITY_LABELS[f] ?? f}</option>
              ))}
            </select>
          </ParamRow>

          <ParamRow label="基调">
            <select
              value={config.tone}
              onChange={(e) => updateField('tone', e.target.value as ConversionConfig['tone'])}
              style={selectStyle}
            >
              {TONE_OPTIONS.map((t) => (
                <option key={t} value={t}>{TONE_LABELS[t] ?? t}</option>
              ))}
            </select>
          </ParamRow>
        </div>
      </div>

      {/* ====== 补充指令 ====== */}
      <div style={{
        background: '#fff', border: '1px solid #e8e8e8', borderRadius: 8, padding: '14px 18px',
      }}>
        <h4 style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: '#333' }}>
          💬 补充指令
          <span style={{ fontWeight: 400, fontSize: 11, color: '#999', marginLeft: 6 }}>
            （注入到阶段 2 改编策略和阶段 3 剧本展开的 AI 提示词中）
          </span>
        </h4>
        <textarea
          value={config.custom_instructions || ''}
          onChange={(e) => handleCustomInstructions(e.target.value)}
          placeholder="例：重点突出人物之间的情感纠葛；减少动作场面，增加文戏比重；保留原著中所有关键对白…"
          rows={4}
          style={{
            width: '100%', padding: '8px 10px', borderRadius: 6,
            border: '1px solid #d0d0d0', fontSize: 13, lineHeight: 1.5,
            resize: 'vertical', boxSizing: 'border-box',
            fontFamily: 'inherit', marginTop: 6,
          }}
        />
      </div>

    </div>
  );
};

// ====== Helpers ======

const ParamRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <span style={{ fontSize: 12, fontWeight: 600, color: '#777', whiteSpace: 'nowrap', minWidth: 56 }}>
      {label}
    </span>
    <div style={{ flex: 1 }}>{children}</div>
  </div>
);

const selectStyle: React.CSSProperties = {
  width: '100%', padding: '5px 8px', borderRadius: 4,
  border: '1px solid #d0d0d0', fontSize: 13, background: '#fff',
};
