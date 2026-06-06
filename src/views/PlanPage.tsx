// ============================================================================
// PlanPage — 阶段2 改编规划全页
// sub-tabs: 概览 / 改编策略 / 幕结构 / 场景大纲
// v0.7.0: 后台分析 — 任务不阻塞页面，可自由切换项目/阶段
// ============================================================================

import React, { useEffect } from 'react';
import { usePlanStore, useConfigStore, useAnalysisStore, useProjectStore, useTaskStore } from '../store';
import { startStage2Analysis, cancelTask } from '../background/taskManager';
import { loadPlan } from '../api/endpoints';
import { PlanStatBar, StrategySection, ActsSection, ScenesSection } from './PlanPreview';
import { exportPlanPdf, exportPlanHtml } from '../renderer/planExport';
import { copyToClipboard } from '../shared/download';
import { ConversionPresetPanel } from './ConversionPresetPanel';
import type { AppSection } from '../components/AppShell';

interface Props {
  section: AppSection;
  onSectionChange: (section: AppSection) => void;
}

const TABS: Array<{ id: AppSection; label: string; icon: string }> = [
  { id: 'plan_overview', label: '概览', icon: '📋' },
  { id: 'plan_strategy', label: '改编策略', icon: '🎯' },
  { id: 'plan_acts', label: '幕结构', icon: '📐' },
  { id: 'plan_scenes', label: '场景大纲', icon: '🎞️' },
];

export const PlanPage: React.FC<Props> = ({ section, onSectionChange }) => {
  const plan = usePlanStore((s) => s.plan);
  const setPlan = usePlanStore((s) => s.setPlan);
  const analysis = useAnalysisStore((s) => s.analysis);
  const aiConfig = useConfigStore((s) => s.aiConfig);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const task = useTaskStore((s) => s.getTask(activeProjectId || '', 'stage2'));
  const dismissNotification = useTaskStore((s) => s.dismissNotification);

  const [copied, setCopied] = React.useState(false);

  // 页面挂载时清除该阶段的完成通知
  useEffect(() => {
    if (activeProjectId && task?.status === 'completed') {
      dismissNotification(activeProjectId, 'stage2');
    }
  }, [activeProjectId, task?.status, dismissNotification]);

  // 任务刚完成时：自动从 localStorage 加载 plan 到内存
  useEffect(() => {
    if (activeProjectId && task?.status === 'completed' && !plan) {
      const stored = loadPlan(activeProjectId);
      if (stored) setPlan(stored);
    }
  }, [activeProjectId, task?.status, plan, setPlan]);

  const handleStart = () => {
    if (!analysis || !activeProjectId) return;
    const config = useConfigStore.getState().getProjectConfig(activeProjectId);
    startStage2Analysis(activeProjectId, analysis, config, aiConfig);
  };

  const handleCancel = () => {
    if (!activeProjectId) return;
    cancelTask(activeProjectId, 'stage2');
  };

  const handleCopy = async () => {
    if (!plan) return;
    const ok = await copyToClipboard(JSON.stringify(plan, null, 2));
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };
  const handlePdf = () => exportPlanPdf();
  const handleHtml = () => {
    if (!plan) return;
    exportPlanHtml(plan, '改编规划');
  };

  // ---- 有 plan 数据：正常显示 ----
  if (plan) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Tab 导航 */}
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
          {/* Export buttons */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', paddingRight: 4 }}>
            <button onClick={handlePdf} style={pdfBtn}>🖨 导出 PDF</button>
            <button onClick={handleHtml} style={htmlBtn}>📄 导出 HTML</button>
            <button onClick={handleCopy} style={copyBtn}>
              {copied ? '✅ 已复制' : '📋 复制 JSON'}
            </button>
          </div>
        </div>

        {/* 内容区 */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          <PlanStatBar plan={plan} />
          {(section === 'plan_overview' || section === 'plan_strategy') && <StrategySection plan={plan} />}
          {(section === 'plan_overview' || section === 'plan_acts') && <ActsSection plan={plan} />}
          {(section === 'plan_overview' || section === 'plan_scenes') && <ScenesSection plan={plan} />}
        </div>
      </div>
    );
  }

  // ---- 无 plan：显示预设面板 + 启动按钮（可能带进度条） ----
  return (
    <div style={{ textAlign: 'center', padding: '40px 24px', overflow: 'auto', height: '100%' }}>
      <div style={{ fontSize: 36, marginBottom: 8 }}>🎬</div>
      <h3 style={{ marginBottom: 8 }}>阶段 2：改编规划</h3>
      <p style={{ color: '#888', marginBottom: 28 }}>先配置创作预设，再启动 AI 改编规划</p>

      {/* 创作预设面板 */}
      <ConversionPresetPanel projectId={activeProjectId || 'default'} />

      {/* 后台任务进度条 */}
      {task && task.status === 'running' && (
        <div style={{
          marginTop: 16, padding: '12px 20px',
          background: '#fff8e1', border: '1px solid #ffe0b2', borderRadius: 8,
          display: 'inline-block', minWidth: 360, textAlign: 'left',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 18 }}>⏳</span>
            <span style={{ fontSize: 13, color: '#e65100', flex: 1 }}>{task.message}</span>
            <button onClick={handleCancel} style={cancelBtn}>取消</button>
          </div>
          {task.progress && (
            <div style={{
              height: 4, background: '#e0e0e0', borderRadius: 2, overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', width: `${Math.round((task.progress.current / task.progress.total) * 100)}%`,
                background: '#ff9800', borderRadius: 2,
                transition: 'width 0.3s ease',
              }} />
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
          <div style={{ fontSize: 13, color: '#c62828', marginBottom: 6 }}>❌ {task.error || '分析失败'}</div>
          <button onClick={handleStart} style={{ ...primaryBtnSmall }}>重试</button>
        </div>
      )}

      {/* 启动按钮（无任务时显示） */}
      {(!task || task.status === 'failed') && (
        <button onClick={handleStart} style={{
          ...primaryBtn, marginTop: 16,
        }}>
          → 开始改编规划（阶段 2/3）
        </button>
      )}
    </div>
  );
};

// ---- Styles ----

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

const pdfBtn: React.CSSProperties = {
  padding: '6px 14px', border: '1px solid #1976d2', borderRadius: 6,
  background: '#1976d2', color: '#fff', cursor: 'pointer', fontSize: 12,
  fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4,
};

const htmlBtn: React.CSSProperties = {
  padding: '6px 14px', border: '1px solid #d0d0d0', borderRadius: 6,
  background: '#fff', cursor: 'pointer', fontSize: 12,
  fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4,
};

const copyBtn: React.CSSProperties = {
  padding: '6px 10px', border: '1px solid #e0e0e0', borderRadius: 6,
  background: 'transparent', cursor: 'pointer', fontSize: 11, color: '#888',
};
