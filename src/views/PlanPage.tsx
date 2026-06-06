// ============================================================================
// PlanPage — 阶段2 改编规划全页
// sub-tabs: 概览 / 改编策略 / 幕结构 / 场景大纲
// ============================================================================

import React from 'react';
import { usePlanStore, useConfigStore, useScriptStore, useAnalysisStore, useProjectStore } from '../store';
import { planAdaptation } from '../planner';
import { expandBeats } from '../converter';
import { savePlan, saveScreenplay } from '../api/endpoints';
import { validate } from '../schema/validator';
import { PlanPreview } from './PlanPreview';
import { LoadingStage } from '../components/LoadingStage';
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
  const analysis = useAnalysisStore((s) => s.analysis);
  const screenplay = useScriptStore((s) => s.screenplay);
  const aiConfig = useConfigStore((s) => s.aiConfig);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);

  const [isProcessing, setIsProcessing] = React.useState(false);
  const [loadingMsg, setLoadingMsg] = React.useState('');
  const [expandProgress, setExpandProgress] = React.useState<{
    current: number; total: number; currentScenes: string[];
  } | null>(null);

  const handlePlan = async () => {
    if (!analysis) return;
    setIsProcessing(true);
    setLoadingMsg('AI 正在设计改编方案...');
    await new Promise((r) => setTimeout(r, 0));

    try {
      const config = useConfigStore.getState().conversionConfig;
      const adaptationPlan = await planAdaptation(analysis, config, aiConfig);
      const vr = validate(adaptationPlan, 'adaptation-plan');
      if (!vr.valid) console.warn('AdaptationPlan 校验警告:', vr.errors);
      usePlanStore.getState().setPlan(adaptationPlan);
      if (activeProjectId) {
        savePlan(activeProjectId, adaptationPlan);
        useProjectStore.getState().updateProjectPhase(activeProjectId, 'planned');
      }
      setIsProcessing(false);
      setLoadingMsg('');
    } catch (e) {
      setIsProcessing(false);
      setLoadingMsg('');
      console.error('Plan failed:', e);
    }
  };

  const handleExpand = async () => {
    if (!plan) return;
    setIsProcessing(true);
    setLoadingMsg('AI 正在展开场景 beat...');
    setExpandProgress({ current: 0, total: plan.scene_plan.length, currentScenes: [] });
    await new Promise((r) => setTimeout(r, 0));

    try {
      const concurrency = useConfigStore.getState().concurrency;
      const screenplayData = await expandBeats(plan, aiConfig, {
        concurrency,
        onProgress: (completed, total, currentScenes) => {
          setExpandProgress({ current: completed, total, currentScenes });
          setLoadingMsg(`正在展开场景 ${completed}/${total}...`);
        },
      });
      const vr = validate(screenplayData, 'screenplay');
      if (!vr.valid) console.warn('Screenplay 校验警告:', vr.errors);
      useScriptStore.getState().setScreenplay(screenplayData);
      if (activeProjectId) {
        saveScreenplay(activeProjectId, screenplayData);
        useProjectStore.getState().updateProjectPhase(activeProjectId, 'scripted');
      }
      setIsProcessing(false);
      setLoadingMsg('');
      setExpandProgress(null);
      onSectionChange('script_edit');
    } catch (e) {
      setIsProcessing(false);
      setLoadingMsg('');
      setExpandProgress(null);
      console.error('Expand failed:', e);
    }
  };

  if (isProcessing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <LoadingStage
          stage={expandProgress ? 'expanding' : 'planning'}
          message={loadingMsg}
          sceneNames={expandProgress?.currentScenes}
          progress={expandProgress || undefined}
          concurrency={useConfigStore.getState().concurrency}
        />
      </div>
    );
  }

  if (!plan) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎬</div>
        <h3>尚未生成改编规划</h3>
        <p style={{ color: '#888', marginBottom: 24 }}>需要先完成阶段1 小说分析</p>
        <button onClick={handlePlan} style={primaryBtn}>→ 开始改编规划（阶段 2/3）</button>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex', gap: 0, padding: '0 24px',
        borderBottom: '1px solid #e0e0e0', background: '#fff', flexShrink: 0,
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
        {!screenplay && (
          <button onClick={handleExpand} style={{
            ...primaryBtn, padding: '8px 20px', fontSize: 13,
            alignSelf: 'center', marginBottom: 8,
          }}>
            → 展开 Beat（阶段 3/3）
          </button>
        )}
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <PlanPreview plan={plan} />
      </div>
    </div>
  );
};

const primaryBtn: React.CSSProperties = {
  padding: '14px 32px', background: '#1976d2', color: '#fff',
  border: 'none', borderRadius: 8, fontSize: 16, cursor: 'pointer', fontWeight: 600,
};