// ============================================================================
// App 根组件 — MVP 完整流程
// 导入 → 分析 → 规划 → 展开 → 编辑 → 导出
// ============================================================================

import React, { useState } from 'react';
import { Editor } from './editor';
import { useScriptStore, useAnalysisStore, usePlanStore, useConfigStore, useEditorStore } from './store';
import { parseNovel } from './parser';
import { analyzeNovel } from './analyzer';
import { planAdaptation } from './planner';
import { expandBeats } from './converter';
import { validate } from './schema/validator';
import { AiSetupPanel } from './config/AiSetupPanel';
import { saveAnalysis, savePlan, saveScreenplay, saveProjectMeta } from './api/endpoints';
import type { ParsedNovel } from './parser';

type AppStep = 'import' | 'analyzing' | 'analysis_done' | 'planning' | 'plan_done' | 'expanding' | 'editing';

export const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>('import');
  const [error, setError] = useState<string | null>(null);
  const [loadingMsg, setLoadingMsg] = useState('');

  const screenplay = useScriptStore((s) => s.screenplay);
  const analysis = useAnalysisStore((s) => s.analysis);
  const plan = usePlanStore((s) => s.plan);
  const aiConfig = useConfigStore((s) => s.aiConfig);
  const setAnalysis = useAnalysisStore((s) => s.setAnalysis);
  const setPlan = usePlanStore((s) => s.setPlan);
  const setScreenplay = useScriptStore((s) => s.setScreenplay);
  const setProcessing = useEditorStore((s) => s.setProcessing);

  const PROJECT_ID = 'default_project';

  // If we have a screenplay, show the editor
  if (screenplay) {
    return <Editor />;
  }

  const handleFileImport = async (file: File) => {
    setError(null);
    setStep('analyzing');
    setLoadingMsg('正在解析小说文件...');
    setProcessing(true, '解析小说');

    try {
      // 1. Parse
      const novel: ParsedNovel = await parseNovel(file);
      setLoadingMsg(`已解析 ${novel.chapters.length} 个章节，开始 AI 分析...`);

      // 2. Analyze (Stage 1)
      setProcessing(true, 'AI 小说分析（阶段 1/3）');
      const novelAnalysis = await analyzeNovel(novel, aiConfig);

      // Validate
      const validateResult = validate(novelAnalysis, 'novel-analysis');
      if (!validateResult.valid) {
        console.warn('NovelAnalysis 校验警告:', validateResult.errors);
      }

      setAnalysis(novelAnalysis);
      saveAnalysis(PROJECT_ID, novelAnalysis);
      saveProjectMeta({ id: PROJECT_ID, title: novel.title, author: novel.author || '未知', targetMedium: aiConfig.ai_provider, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      setStep('analysis_done');
      setLoadingMsg(`✅ 小说分析完成！已保存到 localStorage。点击继续...`);
      setProcessing(false);
    } catch (e) {
      setError((e as Error).message);
      setStep('import');
      setProcessing(false);
    }
  };

  const handlePlan = async () => {
    if (!analysis) return;
    setError(null);
    setStep('planning');
    setLoadingMsg('AI 改编规划中...');
    setProcessing(true, 'AI 改编规划（阶段 2/3）');

    try {
      const config = useConfigStore.getState().conversionConfig;
      const adaptationPlan = await planAdaptation(analysis, config, aiConfig);

      const validateResult = validate(adaptationPlan, 'adaptation-plan');
      if (!validateResult.valid) {
        console.warn('AdaptationPlan 校验警告:', validateResult.errors);
      }

      setPlan(adaptationPlan);
      savePlan(PROJECT_ID, adaptationPlan);
      setStep('plan_done');
      setLoadingMsg(`✅ 改编规划完成！已保存。${adaptationPlan.scene_plan.length} 个场景待展开...`);
      setProcessing(false);
    } catch (e) {
      setError((e as Error).message);
      setStep('analysis_done');
      setProcessing(false);
    }
  };

  const handleExpand = async () => {
    if (!plan) return;
    setError(null);
    setStep('expanding');
    setLoadingMsg(`正在展开 ${plan.scene_plan.length} 个场景...`);
    setProcessing(true, 'Beat 展开（阶段 3/3）');

    try {
      const screenplayData = await expandBeats(plan, aiConfig);

      const validateResult = validate(screenplayData, 'screenplay');
      if (!validateResult.valid) {
        console.warn('Screenplay 校验警告:', validateResult.errors);
      }

      setScreenplay(screenplayData);
      saveScreenplay(PROJECT_ID, screenplayData);
      setStep('editing');
      setProcessing(false);
      setLoadingMsg('✅ 剧本生成完成！已保存，进入编辑器...');
    } catch (e) {
      setError((e as Error).message);
      setStep('plan_done');
      setProcessing(false);
    }
  };

  // 导入之前的步骤也显示配置面板
  const showConfig = step === 'import' || step === 'analysis_done' || step === 'plan_done';

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: 'system-ui' }}>
      {/* Header */}
      <div style={headerStyle}>
        <h1 style={{ margin: 0, fontSize: 20 }}>AI 辅助剧本创作工具</h1>
        <span style={{ fontSize: 12, color: '#888' }}>MVP v0.1.0</span>
      </div>

      {/* Body: 左侧配置 + 右侧主流程 */}
      <div style={{ display: 'flex', maxWidth: 1100, margin: '0 auto' }}>
        {/* 左侧配置面板 */}
        {showConfig && (
          <div style={{ width: 300, flexShrink: 0, padding: '16px 0' }}>
            <AiSetupPanel />
          </div>
        )}

        {/* 右侧主内容 */}
        <div style={{ flex: 1, padding: '24px 32px' }}>
          {/* Stepper */}
          <StepIndicator currentStep={step} />

          {/* Error */}
          {error && (
            <div style={{ padding: 12, background: '#ffebee', border: '1px solid #f44336', borderRadius: 8, marginBottom: 16, color: '#c62828', fontSize: 14 }}>
              <strong>错误：</strong>{error}
            </div>
          )}

          {/* Import Step */}
          {step === 'import' && <ImportCard onImport={handleFileImport} />}

          {/* Processing */}
          {(step === 'analyzing' || step === 'planning' || step === 'expanding') && (
            <div style={{ textAlign: 'center', padding: 48, background: '#fff', borderRadius: 8, border: '1px solid #e0e0e0' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
              <h3>{loadingMsg}</h3>
              <p style={{ color: '#888' }}>请耐心等待，AI 处理中...</p>
              <div style={{ marginTop: 16, width: '100%', height: 4, background: '#e0e0e0', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: step === 'expanding' ? '80%' : step === 'planning' ? '50%' : '20%', background: '#1976d2', borderRadius: 2, transition: 'width 0.5s' }} />
              </div>
            </div>
          )}

          {/* Analysis Done */}
          {step === 'analysis_done' && analysis && (
            <div>
              <ResultCard title="✅ 小说分析完成" items={[
                `主题：${(analysis.theme_analysis?.core_themes || []).map((t) => t.theme).join('、') || '待提取'}`,
                `核心冲突：${analysis.plot_analysis.core_conflict?.description || '待提取'}`,
                `人物：${analysis.character_analysis.length} 个（${analysis.character_analysis.filter((c) => c.importance === 'essential').map((c) => c.name).join('、')} 等）`,
                `章节：${analysis.chapter_summaries.length} 章`,
                `关键事件：${analysis.plot_analysis.key_events.length} 个`,
              ]} />
              <button onClick={handlePlan} style={primaryBtnStyle}>
                → 开始改编规划（阶段 2/3）
              </button>
            </div>
          )}

          {/* Plan Done */}
          {step === 'plan_done' && plan && (
            <div>
              <ResultCard title="✅ 改编规划完成" items={[
                `基调：${plan.adaptation_strategy.tone_adaptation.target_tone}（原著：${plan.adaptation_strategy.tone_adaptation.source_tone}）`,
                `幕数：${plan.episode_plan.total_acts} 幕 · ${plan.scene_plan.length} 个场景`,
                `改编决策：${plan.adaptation_strategy.structural_decisions.length} 项`,
                `人物初稿：${plan.characters_draft?.length || 0} 个`,
              ]} />
              <button onClick={handleExpand} style={primaryBtnStyle}>
                → 展开 Beat（阶段 3/3）
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================== Sub Components ==============================

const StepIndicator: React.FC<{ currentStep: AppStep }> = ({ currentStep }) => {
  const steps = [
    { key: 'import' as const, label: '1. 导入' },
    { key: 'analyzing' as const, label: '2. 分析' },
    { key: 'planning' as const, label: '3. 规划' },
    { key: 'editing' as const, label: '4. 编辑' },
  ];

  const currentIdx =
    currentStep === 'editing' || currentStep === 'expanding' ? 3
    : currentStep === 'plan_done' || currentStep === 'planning' ? 2
    : currentStep === 'analysis_done' || currentStep === 'analyzing' ? 1
    : 0;

  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32, gap: 40 }}>
      {steps.map((s, i) => (
        <div key={s.key} style={{ textAlign: 'center' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', display: 'flex',
            alignItems: 'center', justifyContent: 'center', margin: '0 auto 4px',
            background: i < currentIdx ? '#4caf50' : i === currentIdx ? '#1976d2' : '#e0e0e0',
            color: i <= currentIdx ? '#fff' : '#888', fontWeight: 600, fontSize: 14,
          }}>
            {i < currentIdx ? '✓' : i + 1}
          </div>
          <span style={{ fontSize: 12, color: i <= currentIdx ? '#333' : '#999' }}>{s.label}</span>
        </div>
      ))}
    </div>
  );
};

const ImportCard: React.FC<{ onImport: (file: File) => void }> = ({ onImport }) => {
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) onImport(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onImport(file);
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      style={{
        border: '2px dashed #bbb', borderRadius: 12, padding: 48,
        textAlign: 'center', background: '#fff', cursor: 'pointer',
      }}
    >
      <div style={{ fontSize: 48, marginBottom: 16 }}>📖</div>
      <h3>导入小说文件</h3>
      <p style={{ color: '#888', marginBottom: 24 }}>
        支持 .txt / .docx / .md 格式 · 至少 3 章 · 中文小说
      </p>
      <label style={{
        padding: '10px 24px', background: '#1976d2', color: '#fff',
        borderRadius: 8, cursor: 'pointer', fontSize: 15, display: 'inline-block',
      }}>
        选择文件
        <input type="file" accept=".txt,.docx,.md" onChange={handleFileChange} style={{ display: 'none' }} />
      </label>
      <p style={{ fontSize: 11, color: '#bbb', marginTop: 12 }}>或拖拽文件到此处</p>
    </div>
  );
};

const ResultCard: React.FC<{ title: string; items: string[] }> = ({ title, items }) => (
  <div style={{ padding: 20, background: '#fff', borderRadius: 8, border: '1px solid #e0e0e0', marginBottom: 16 }}>
    <h3 style={{ marginTop: 0 }}>{title}</h3>
    {items.map((item, i) => (
      <p key={i} style={{ margin: '4px 0', fontSize: 14, color: '#555' }}>{item}</p>
    ))}
  </div>
);

const headerStyle: React.CSSProperties = {
  background: '#fff', borderBottom: '1px solid #e0e0e0',
  padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
};

const primaryBtnStyle: React.CSSProperties = {
  width: '100%', padding: '14px 24px', background: '#1976d2', color: '#fff',
  border: 'none', borderRadius: 8, fontSize: 16, cursor: 'pointer', fontWeight: 600,
};
