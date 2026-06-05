// ============================================================================
// App 根组件 — v0.2.0 重构
// 面包屑 + 侧边树 + 可视化预览 + 非阻塞AI + Settings独立页
// ============================================================================

import React, { useState, useCallback } from 'react';
import { Editor } from './editor';
import { AppShell, type AppSection } from './components/AppShell';
import { LoadingStage } from './components/LoadingStage';
import { AnalysisPreview } from './views/AnalysisPreview';
import { PlanPreview } from './views/PlanPreview';
import { SettingsPage } from './views/SettingsPage';
import { useScriptStore, useAnalysisStore, usePlanStore, useConfigStore, useEditorStore } from './store';
import { parseNovel } from './parser';
import { analyzeNovel } from './analyzer';
import { planAdaptation } from './planner';
import { expandBeats } from './converter';
import { validate } from './schema/validator';
import { saveAnalysis, savePlan, saveScreenplay, saveProjectMeta } from './api/endpoints';
import { ScreenplayPrintView } from './renderer/ScreenplayPrintView';
import type { ParsedNovel } from './parser';

const PROJECT_ID = 'default_project';

export const App: React.FC = () => {
  const [section, setSection] = useState<AppSection>('import');
  const [error, setError] = useState<string | null>(null);
  const [loadingMsg, setLoadingMsg] = useState('');

  // 展开阶段进度
  const [expandProgress, setExpandProgress] = useState<{ current: number; total: number; currentScenes: string[] } | null>(null);

  const screenplay = useScriptStore((s) => s.screenplay);
  const analysis = useAnalysisStore((s) => s.analysis);
  const plan = usePlanStore((s) => s.plan);
  const aiConfig = useConfigStore((s) => s.aiConfig);
  const setAnalysis = useAnalysisStore((s) => s.setAnalysis);
  const setPlan = usePlanStore((s) => s.setPlan);
  const setScreenplay = useScriptStore((s) => s.setScreenplay);
  const setProcessing = useEditorStore((s) => s.setProcessing);
  const isProcessing = useEditorStore((s) => s.isProcessing);

  /** 让 React 有机会渲染一帧——解决页面卡死问题 */
  const yieldFrame = () => new Promise((r) => setTimeout(r, 0));

  // ===================== 导入 + 分析 =====================
  const handleFileImport = useCallback(async (file: File) => {
    setError(null);
    setSection('analysis_overview');
    setProcessing(true, '解析小说');
    setLoadingMsg('正在解析小说文件...');
    await yieldFrame();

    try {
      const novel: ParsedNovel = await parseNovel(file);
      setLoadingMsg(`已解析 ${novel.chapters.length} 个章节，开始 AI 分析...`);
      setProcessing(true, 'AI 小说分析（阶段 1/3）');
      await yieldFrame();

      const novelAnalysis = await analyzeNovel(novel, aiConfig);
      const validateResult = validate(novelAnalysis, 'novel-analysis');
      if (!validateResult.valid) console.warn('NovelAnalysis 校验警告:', validateResult.errors);

      setAnalysis(novelAnalysis);
      saveAnalysis(PROJECT_ID, novelAnalysis);
      saveProjectMeta({ id: PROJECT_ID, title: novel.title, author: novel.author || '未知', targetMedium: aiConfig.ai_provider, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      setProcessing(false);
      setLoadingMsg('');
      setSection('analysis_overview');
    } catch (e) {
      setError((e as Error).message);
      setSection('import');
      setProcessing(false);
    }
  }, [aiConfig, setAnalysis, setProcessing]);

  // ===================== 规划 =====================
  const handlePlan = useCallback(async () => {
    if (!analysis) return;
    setError(null);
    setSection('plan_overview');
    setProcessing(true, 'AI 改编规划（阶段 2/3）');
    setLoadingMsg('AI 正在设计改编方案...');
    await yieldFrame();

    try {
      const config = useConfigStore.getState().conversionConfig;
      const adaptationPlan = await planAdaptation(analysis, config, aiConfig);
      const validateResult = validate(adaptationPlan, 'adaptation-plan');
      if (!validateResult.valid) console.warn('AdaptationPlan 校验警告:', validateResult.errors);

      setPlan(adaptationPlan);
      savePlan(PROJECT_ID, adaptationPlan);
      setProcessing(false);
      setLoadingMsg('');
      setSection('plan_overview');
    } catch (e) {
      setError((e as Error).message);
      setSection('analysis_overview');
      setProcessing(false);
    }
  }, [analysis, aiConfig, setPlan, setProcessing]);

  // ===================== 展开 Beats =====================
  const handleExpand = useCallback(async () => {
    if (!plan) return;
    setError(null);
    setSection('script_edit');
    setProcessing(true, 'Beat 展开（阶段 3/3）');
    setLoadingMsg('AI 正在展开场景 beat...');
    setExpandProgress({ current: 0, total: plan.scene_plan.length, currentScenes: [] });
    await yieldFrame();

    try {
      const concurrency = useConfigStore.getState().concurrency;
      const screenplayData = await expandBeats(plan, aiConfig, {
        concurrency,
        onProgress: (completed, total, currentScenes) => {
          setExpandProgress({ current: completed, total, currentScenes });
          setLoadingMsg(`正在展开场景 ${completed}/${total}...`);
        },
      });

      const validateResult = validate(screenplayData, 'screenplay');
      if (!validateResult.valid) console.warn('Screenplay 校验警告:', validateResult.errors);

      setScreenplay(screenplayData);
      saveScreenplay(PROJECT_ID, screenplayData);
      setProcessing(false);
      setLoadingMsg('');
      setExpandProgress(null);
      setSection('script_edit');
    } catch (e) {
      setError((e as Error).message);
      setSection('plan_overview');
      setProcessing(false);
      setExpandProgress(null);
    }
  }, [plan, aiConfig, setScreenplay, setProcessing]);

  // ===================== 路由 =====================

  return (
    <>
      <AppShell currentSection={section} onNavigate={setSection}>
      {/* ======== 编辑器模式（全宽） ======== */}
      {section === 'script_edit' && screenplay ? (
        <Editor />
      ) : section === 'settings' ? (
        <div style={{ height: '100%', overflow: 'auto', background: '#f5f5f5', padding: 24 }}>
          <SettingsPage onBack={() => setSection(analysis ? 'analysis_overview' : plan ? 'plan_overview' : 'import')} />
        </div>
      ) : (
        <div style={{ maxWidth: 960, margin: '0 auto', padding: 24 }}>
          {/* ======== 错误提示 ======== */}
          {error && (
            <div style={errorBar}>
              <strong>错误：</strong>{error}
              <button onClick={() => setError(null)} style={{ marginLeft: 12, background: 'transparent', border: 'none', cursor: 'pointer', color: '#c62828', fontWeight: 600 }}>✕</button>
            </div>
          )}

          {/* ======== 导入页 ======== */}
          {section === 'import' && <ImportCard onImport={handleFileImport} />}

          {/* ======== AI 处理中 ======== */}
          {isProcessing && (
            <LoadingStage
              stage={
                expandProgress ? 'expanding' :
                section === 'plan_overview' && loadingMsg ? 'planning' :
                'analyzing'
              }
              message={loadingMsg || '处理中...'}
              sceneNames={expandProgress?.currentScenes}
              progress={expandProgress || undefined}
              concurrency={useConfigStore.getState().concurrency}
            />
          )}

          {/* ======== 阶段1: 分析预览 ======== */}
          {!isProcessing && analysis && (
            section.startsWith('analysis_') || section === 'import'
          ) && (
            <>
              <AnalysisPreview analysis={analysis} />
              {!plan && (
                <div style={{ textAlign: 'center', marginTop: 24 }}>
                  <button onClick={handlePlan} style={primaryBtn}>→ 开始改编规划（阶段 2/3）</button>
                </div>
              )}
            </>
          )}

          {/* ======== 阶段2: 规划预览 ======== */}
          {!isProcessing && plan && (
            section.startsWith('plan_') || section === 'analysis_overview'
          ) && (
            <>
              <PlanPreview plan={plan} />
              {!screenplay && (
                <div style={{ textAlign: 'center', marginTop: 24 }}>
                  <button onClick={handleExpand} style={primaryBtn}>→ 展开 Beat（阶段 3/3）</button>
                </div>
              )}
            </>
          )}

          {/* ======== 阶段3: 已有剧本时的提示 ======== */}
          {!isProcessing && screenplay && section !== 'script_edit' && (
            <div style={{ textAlign: 'center', padding: 48 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
              <h3>剧本已生成</h3>
              <p style={{ color: '#888', marginBottom: 24 }}>点击下方进入编辑器</p>
              <button onClick={() => setSection('script_edit')} style={primaryBtn}>进入编辑器 →</button>
            </div>
          )}
        </div>
      )}
    </AppShell>
    {screenplay && <ScreenplayPrintView />}
  </>
  );
};

// ====================== Sub Components ======================

const ImportCard: React.FC<{ onImport: (file: File) => void }> = ({ onImport }) => (
  <div
    onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onImport(f); }}
    onDragOver={(e) => e.preventDefault()}
    style={{ border: '2px dashed #bbb', borderRadius: 12, padding: 56, textAlign: 'center', background: '#fff', cursor: 'pointer' }}
  >
    <div style={{ fontSize: 56, marginBottom: 16 }}>📖</div>
    <h3 style={{ marginTop: 0 }}>导入小说文件</h3>
    <p style={{ color: '#888', marginBottom: 28 }}>支持 .txt / .docx / .md 格式 · 至少 3 章 · 中文小说</p>
    <label style={{ padding: '12px 28px', background: '#1976d2', color: '#fff', borderRadius: 8, cursor: 'pointer', fontSize: 15, display: 'inline-block' }}>
      选择文件
      <input type="file" accept=".txt,.docx,.md" onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); }} style={{ display: 'none' }} />
    </label>
    <p style={{ fontSize: 11, color: '#bbb', marginTop: 14 }}>或拖拽文件到此处</p>
  </div>
);

const errorBar: React.CSSProperties = {
  padding: 12, background: '#ffebee', border: '1px solid #f44336', borderRadius: 8,
  marginBottom: 16, color: '#c62828', fontSize: 14, display: 'flex', alignItems: 'center',
};

const primaryBtn: React.CSSProperties = {
  padding: '14px 32px', background: '#1976d2', color: '#fff',
  border: 'none', borderRadius: 8, fontSize: 16, cursor: 'pointer', fontWeight: 600,
};
