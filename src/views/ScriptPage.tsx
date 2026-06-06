// ============================================================================
// ScriptPage — 阶段3 剧本编辑全页
// sub-tabs: 剧本编辑 / 人物表
// 写作风格 + 补充指令 + 模板保存/加载（对标阶段 2 ConversionPresetPanel）
// v0.7.0: 后台分析 — 任务不阻塞页面，可自由切换项目/阶段
// ============================================================================

import React, { useCallback, useEffect } from 'react';
import { useScriptStore, useConfigStore, useProjectStore, usePlanStore, useTaskStore } from '../store';
import { startStage3Analysis, cancelTask } from '../background/taskManager';
import { loadScreenplay } from '../api/endpoints';
import { Editor } from '../editor';
import { exportFullProjectPdf } from '../renderer/pdf';
import {
  DIALOGUE_DENSITY_OPTIONS, DIALOGUE_DENSITY_LABELS,
  ACTION_DETAIL_OPTIONS, ACTION_DETAIL_LABELS,
  STAGE_DIRECTION_OPTIONS, STAGE_DIRECTION_LABELS,
} from '../shared/constants';
import type { ConversionConfig } from '../schema/types';
import type { AppSection } from '../components/AppShell';

interface Props {
  section: AppSection;
  onSectionChange: (section: AppSection) => void;
}

const TABS: Array<{ id: AppSection; label: string; icon: string }> = [
  { id: 'script_edit', label: '剧本编辑', icon: '📝' },
  { id: 'script_characters', label: '人物表', icon: '👤' },
];

export const ScriptPage: React.FC<Props> = ({ section, onSectionChange }) => {
  const screenplay = useScriptStore((s) => s.screenplay);
  const setScreenplay = useScriptStore((s) => s.setScreenplay);
  const plan = usePlanStore((s) => s.plan);
  const aiConfig = useConfigStore((s) => s.aiConfig);
  const getProjectConfig = useConfigStore((s) => s.getProjectConfig);
  const setProjectConfig = useConfigStore((s) => s.setProjectConfig);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const task = useTaskStore((s) => s.getTask(activeProjectId || '', 'stage3'));
  const dismissNotification = useTaskStore((s) => s.dismissNotification);

  const projectConfig = getProjectConfig(activeProjectId || 'default');

  const updateConfig = useCallback(<K extends keyof ConversionConfig>(key: K, value: ConversionConfig[K]) => {
    setProjectConfig(activeProjectId || 'default', { [key]: value });
  }, [activeProjectId, setProjectConfig]);

  // 页面挂载时清除该阶段的完成通知
  useEffect(() => {
    if (activeProjectId && task?.status === 'completed') {
      dismissNotification(activeProjectId, 'stage3');
    }
  }, [activeProjectId, task?.status, dismissNotification]);

  // 任务刚完成时：自动从 localStorage 加载 screenplay 到内存
  useEffect(() => {
    if (activeProjectId && task?.status === 'completed' && !screenplay) {
      const stored = loadScreenplay(activeProjectId);
      if (stored) setScreenplay(stored);
    }
  }, [activeProjectId, task?.status, screenplay, setScreenplay]);

  const handleStart = () => {
    if (!plan || !activeProjectId) return;
    const concurrency = useConfigStore.getState().concurrency;
    const cfg = useConfigStore.getState().getProjectConfig(activeProjectId);
    startStage3Analysis(activeProjectId, plan, cfg, aiConfig, concurrency);
  };

  const handleCancel = () => {
    if (!activeProjectId) return;
    cancelTask(activeProjectId, 'stage3');
  };

  const beatsCount = screenplay?.acts.reduce((s, a) => s + a.scenes.reduce((ss, sc) => ss + sc.beats.length, 0), 0) ?? 0;
  const sceneCount = screenplay?.acts.reduce((s, a) => s + a.scenes.length, 0) ?? 0;

  // ---- 有剧本：编辑器 + 工具栏 ----
  if (screenplay) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Sub-tab 导航 */}
        <div style={{
          display: 'flex', gap: 0, padding: '0 24px',
          borderBottom: '1px solid #e0e0e0', background: '#fff', flexShrink: 0,
          alignItems: 'center',
        }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onSectionChange(tab.id)}
              style={{
                padding: '10px 18px',
                border: 'none',
                borderBottom: section === tab.id ? '2px solid #1976d2' : '2px solid transparent',
                background: 'transparent',
                cursor: 'pointer',
                fontWeight: section === tab.id ? 600 : 400,
                color: section === tab.id ? '#1976d2' : '#666',
                fontSize: 13,
                marginBottom: -1,
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
          <div style={{ flex: 1 }} />

          {/* Export */}
          <button onClick={exportFullProjectPdf} style={{
            padding: '6px 14px', border: '1px solid #1976d2', borderRadius: 6,
            background: '#1976d2', color: '#fff', cursor: 'pointer', fontSize: 12,
            fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4,
            marginRight: 8, marginBottom: 8, whiteSpace: 'nowrap',
          }}>
            🖨 导出全部 PDF
          </button>

          <span style={{ fontSize: 11, color: '#999', alignSelf: 'center', marginBottom: 8 }}>
            {beatsCount} beats · {screenplay.acts.length} 幕 · {sceneCount} 场
          </span>
        </div>

        {/* 内容区 */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {section === 'script_characters' ? (
            <div style={{ padding: 24, overflow: 'auto', height: '100%' }}>
              <h3 style={{ marginTop: 0 }}>👤 人物表 ({screenplay.characters.length})</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
                {screenplay.characters.map((c) => (
                  <div key={c.character_id} style={{
                    padding: '10px 14px', border: '1px solid #e8e8e8',
                    borderRadius: 6, background: '#fff', fontSize: 13,
                  }}>
                    <div style={{ fontWeight: 600 }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: '#888' }}>{c.character_id}</div>
                    {c.description && <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>{c.description}</div>}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <Editor />
          )}
        </div>
      </div>
    );
  }

  // ---- 无剧本：配置面板 + 启动按钮（可能带进度条） ----
  return (
    <div style={{ textAlign: 'center', padding: '40px 24px', overflow: 'auto', height: '100%' }}>
      <div style={{ fontSize: 36, marginBottom: 8 }}>📝</div>
      <h3 style={{ marginBottom: 4 }}>阶段 3：剧本</h3>
      <p style={{ color: '#888', marginBottom: 28 }}>
        {plan ? '配置写作风格和补充指令，然后展开 Beat' : '请先在「改编规划」页完成阶段 2'}
      </p>

      {/* 阶段 3 配置面板 */}
      <Stage3PresetPanel
        projectId={activeProjectId || 'default'}
        config={projectConfig}
        onChange={updateConfig}
        onExpand={plan && (!task || task.status === 'failed') ? handleStart : undefined}
      />

      {/* 后台任务进度条 */}
      {task && task.status === 'running' && (
        <div style={{
          margin: '16px auto 0', padding: '12px 20px',
          background: '#fff8e1', border: '1px solid #ffe0b2', borderRadius: 8,
          display: 'inline-block', minWidth: 360, maxWidth: 480, textAlign: 'left',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 18 }}>⏳</span>
            <span style={{ fontSize: 13, color: '#e65100', flex: 1 }}>{task.message}</span>
            <button onClick={handleCancel} style={cancelBtn}>取消</button>
          </div>
          {task.progress && (
            <div>
              <div style={{
                height: 4, background: '#e0e0e0', borderRadius: 2, overflow: 'hidden',
                marginBottom: 6,
              }}>
                <div style={{
                  height: '100%', width: `${Math.round((task.progress.current / (task.progress.total || 1)) * 100)}%`,
                  background: '#ff9800', borderRadius: 2,
                  transition: 'width 0.3s ease',
                }} />
              </div>
              {task.progress.currentScenes && task.progress.currentScenes.length > 0 && (
                <div style={{ fontSize: 11, color: '#888' }}>
                  正在处理：{task.progress.currentScenes.slice(0, 3).join(', ')}
                  {task.progress.currentScenes.length > 3 ? '...' : ''}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 失败状态 */}
      {task && task.status === 'failed' && (
        <div style={{
          marginTop: 16, padding: '12px 20px',
          background: '#ffebee', border: '1px solid #ef9a9a', borderRadius: 8,
          display: 'inline-block', minWidth: 360, textAlign: 'left',
        }}>
          <div style={{ fontSize: 13, color: '#c62828', marginBottom: 6 }}>❌ {task.error || '展开失败'}</div>
          <button onClick={handleStart} style={{ ...primaryBtnSmall }}>重试</button>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Stage3PresetPanel — 阶段 3 专属配置面板（对标 ConversionPresetPanel）
// 模板保存/加载 + 写作风格 + 补充指令
// ============================================================================

interface Stage3PresetPanelProps {
  projectId: string;
  config: ConversionConfig;
  onChange: <K extends keyof ConversionConfig>(key: K, value: ConversionConfig[K]) => void;
  onExpand?: () => void;
}

const Stage3PresetPanel: React.FC<Stage3PresetPanelProps> = ({ projectId, config, onChange, onExpand }) => {
  const templates = useConfigStore((s) => s.conversionTemplates);
  const saveConversionTemplate = useConfigStore((s) => s.saveConversionTemplate);
  const loadConversionTemplate = useConfigStore((s) => s.loadConversionTemplate);
  const deleteConversionTemplate = useConfigStore((s) => s.deleteConversionTemplate);

  const [templateName, setTemplateName] = React.useState('');
  const [savedMsg, setSavedMsg] = React.useState('');

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
    setSavedMsg('✅ 已加载');
    setTimeout(() => setSavedMsg(''), 2000);
  }, [projectId, templates, loadConversionTemplate]);

  const handleDeleteTemplate = useCallback((id: string, name: string) => {
    if (!window.confirm(`确定删除模板 "${name}"？`)) return;
    deleteConversionTemplate(id);
  }, [deleteConversionTemplate]);

  const handleStage3Instructions = useCallback((text: string) => {
    onChange('stage3_custom_instructions', text || undefined);
  }, [onChange]);

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

      {/* ====== 写作风格参数 ====== */}
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
            ✍️ 写作风格
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

        {/* 参数：三列 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px 16px' }}>
          <StyleRow label="对白密度">
            <select value={config.dialogue_density}
              onChange={(e) => onChange('dialogue_density', e.target.value as ConversionConfig['dialogue_density'])}
              style={selectStyle}>
              {DIALOGUE_DENSITY_OPTIONS.map((o) => (
                <option key={o} value={o}>{DIALOGUE_DENSITY_LABELS[o] ?? o}</option>
              ))}
            </select>
          </StyleRow>
          <StyleRow label="动作详细度">
            <select value={config.action_detail_level}
              onChange={(e) => onChange('action_detail_level', e.target.value as ConversionConfig['action_detail_level'])}
              style={selectStyle}>
              {ACTION_DETAIL_OPTIONS.map((o) => (
                <option key={o} value={o}>{ACTION_DETAIL_LABELS[o] ?? o}</option>
              ))}
            </select>
          </StyleRow>
          <StyleRow label="舞台指示">
            <select value={config.stage_direction_style}
              onChange={(e) => onChange('stage_direction_style', e.target.value as ConversionConfig['stage_direction_style'])}
              style={selectStyle}>
              {STAGE_DIRECTION_OPTIONS.map((o) => (
                <option key={o} value={o}>{STAGE_DIRECTION_LABELS[o] ?? o}</option>
              ))}
            </select>
          </StyleRow>
        </div>
      </div>

      {/* ====== 补充指令 ====== */}
      <div style={{
        background: '#fff', border: '1px solid #e8e8e8', borderRadius: 8, padding: '14px 18px',
        marginBottom: 12,
      }}>
        <h4 style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: '#333' }}>
          💬 补充指令
          <span style={{ fontWeight: 400, fontSize: 11, color: '#999', marginLeft: 6 }}>
            （专门注入到阶段 3 Beat 展开的 AI 提示词中）
          </span>
        </h4>
        <textarea
          value={config.stage3_custom_instructions || ''}
          onChange={(e) => handleStage3Instructions(e.target.value)}
          placeholder="例：人物对白要体现时代感；动作场面描写要紧凑有力；保留原文中标志性台词…"
          rows={4}
          style={{
            width: '100%', padding: '8px 10px', borderRadius: 6,
            border: '1px solid #d0d0d0', fontSize: 13, lineHeight: 1.5,
            resize: 'vertical', boxSizing: 'border-box',
            fontFamily: 'inherit', marginTop: 6,
          }}
        />
      </div>

      {/* 展开按钮 */}
      {onExpand && (
        <button onClick={onExpand} style={{
          ...primaryBtn, marginTop: 4,
        }}>
          → 展开 Beat（阶段 3）
        </button>
      )}
    </div>
  );
};

// ====== Shared styles ======

const StyleRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
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

const primaryBtn: React.CSSProperties = {
  padding: '14px 32px', background: '#1976d2', color: '#fff',
  border: 'none', borderRadius: 8, fontSize: 16, cursor: 'pointer', fontWeight: 600,
};

const primaryBtnSmall: React.CSSProperties = {
  padding: '8px 20px', background: '#1976d2', color: '#fff',
  border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 600,
};

const cancelBtn: React.CSSProperties = {
  padding: '4px 12px', border: '1px solid #ccc', borderRadius: 4,
  background: '#fff', cursor: 'pointer', fontSize: 12, color: '#888',
};
