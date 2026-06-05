// ============================================================================
// App 根组件 — v0.2.0 重构
// 面包屑 + 侧边树 + 可视化预览 + 非阻塞AI + Settings独立页
// ============================================================================

import React, { useState, useCallback, useRef } from 'react';
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
import type { ParsedNovel } from './parser';

const PROJECT_ID = 'default_project';

export const App: React.FC = () => {
  const [section, setSection] = useState<AppSection>('import');
  const [error, setError] = useState<string | null>(null);
  const [loadingMsg, setLoadingMsg] = useState('');

  // 展开阶段进度
  const [expandProgress, setExpandProgress] = useState<{ current: number; total: number; currentScene: string } | null>(null);

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
    setExpandProgress({ current: 0, total: plan.scene_plan.length, currentScene: '准备中' });
    await yieldFrame();

    try {
      // 重写 expandBeats：逐场景展开并 report progress
      const screenplayData = await expandBeatsWithProgress(plan, aiConfig, (current, total, sceneName) => {
        setExpandProgress({ current, total, currentScene: sceneName });
        setLoadingMsg(`正在展开场景 ${current}/${total}...`);
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

  // 编辑器模式（进入后不可返回）
  if (screenplay && section === 'script_edit') {
    return <Editor />;
  }

  // Settings 独立页
  if (section === 'settings') {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
        <SettingsPage onBack={() => setSection(analysis ? 'analysis_overview' : plan ? 'plan_overview' : 'import')} />
      </div>
    );
  }

  return (
    <AppShell currentSection={section} onNavigate={setSection}>
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
            sceneName={expandProgress?.currentScene}
            progress={expandProgress || undefined}
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
    </AppShell>
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

// ====================== 辅助：逐场景展开 + 进度回调 ======================

import type { Screenplay, AiConfig, AdaptationPlan, Scene, Beat } from './schema/types';
import { generateBeatId } from './shared/id-generator';
import { SCHEMA_VERSIONS } from './shared/constants';
import { chatCompletionJson } from './api/client';
import { buildBeatExpansionPrompt } from './converter/prompt-templates/beat-expansion';

async function expandBeatsWithProgress(
  plan: AdaptationPlan,
  aiConfig: AiConfig,
  onProgress: (current: number, total: number, sceneName: string) => void
): Promise<Screenplay> {
  const episode = 1;
  const totalScenes = plan.scene_plan.length;
  let completed = 0;

  const acts = [];
  for (const actPlan of plan.episode_plan.acts) {
    const scenes: Scene[] = [];
    const actScenes = plan.scene_plan.filter((sp) => sp.act_number === actPlan.act_number);

    for (const sp of actScenes) {
      onProgress(completed, totalScenes, sp.synopsis.substring(0, 30));
      try {
        const expanded = await expandSceneBeats(sp, episode, aiConfig);
        scenes.push(expanded);
      } catch (e) {
        console.error(`场景 ${sp.scene_global_number} 展开失败：`, e);
        scenes.push(createEmptyScene(sp));
      }
      completed++;
      onProgress(completed, totalScenes, sp.synopsis.substring(0, 30));
    }

    acts.push({ act_number: actPlan.act_number, act_title: actPlan.act_title, act_type: actPlan.act_type || 'other', synopsis: actPlan.synopsis, scenes });
  }

  const screenplay: Screenplay = {
    schema_version: SCHEMA_VERSIONS.screenplay,
    revision_history: [{ revision_number: 1, timestamp: new Date().toISOString(), author: 'AI', change_summary: 'AI 初始生成' }],
    metadata: {
      title: plan.source_analysis_ref?.analysis_file || '未命名剧本',
      target_medium: plan.adaptation_strategy.target_medium,
      language: 'zh-CN',
      generated_at: new Date().toISOString(),
      estimated_runtime_minutes: Math.ceil(acts.reduce((s, a) => s + a.scenes.reduce((ss, sc) => ss + (sc.estimated_duration_seconds || 0), 0), 0) / 60),
      tone: plan.adaptation_strategy.tone_adaptation.target_tone as Screenplay['metadata']['tone'],
      conversion_config: { ai_provider: aiConfig.ai_provider, ai_model: aiConfig.ai_model, dialogue_density: 'balanced', action_detail_level: 'standard', stage_direction_style: 'descriptive' },
    },
    characters: (plan.characters_draft || []).map((cd) => ({ character_id: cd.character_id, name: cd.name, aliases: cd.aliases, role_type: cd.role_type || 'supporting', description: cd.description, arc: cd.arc, voice_notes: cd.voice_notes, relationships: (cd.relationships || []).map((r) => ({ target_character_id: r.target_character_id, relationship_type: r.relationship_type, relationship_description: r.relationship_description })) })),
    locations: (plan.locations_draft || []).map((ld) => ({ location_id: ld.location_id, name: ld.name, location_type: ld.location_type, description: ld.description, parent_location_id: ld.parent_location_id })),
    acts,
    production_notes: { adaptation_decisions: plan.adaptation_strategy.structural_decisions.map((d) => ({ decision: d.decision, rationale: d.rationale })) },
  };
  return screenplay;
}

async function expandSceneBeats(sp: import('./schema/types').ScenePlan, episode: number, aiConfig: AiConfig): Promise<Scene> {
  const prompt = buildBeatExpansionPrompt(sp, sp.source_context, sp.beat_plan);
  const result = await chatCompletionJson<{
    beats: Array<Record<string, unknown>>;
    tension_level?: number;
  }>([{ role: 'system', content: '你是一个专业的剧本写手，将场景大纲展开为剧情节拍。请只输出JSON。' }, { role: 'user', content: prompt }], aiConfig, { temperature: 0.7, maxTokens: 8192 });

  const beats: Beat[] = (result.beats || []).map((rb, idx) => {
    const bt = (rb.beat_type as Beat['beat_type']) || 'action';
    return {
      beat_id: generateBeatId(episode, sp.act_number, sp.scene_global_number, idx + 1),
      beat_type: bt,
      emotion: rb.emotion as string,
      is_ai_generated: rb.is_ai_generated !== false,
      estimated_duration_seconds: (rb.estimated_duration_seconds as number) || 10,
      source_ref: rb.source_ref_chapter ? { chapter: rb.source_ref_chapter as number, paragraph: rb.source_ref_paragraph as number, excerpt: rb.source_ref_excerpt as string } : undefined,
      ...(bt === 'dialogue' || bt === 'voice_over' || bt === 'off_screen' ? { character_id: (rb.character_id as string) || '', dialogue_text: (rb.dialogue_text as string) || '' } : {}),
      ...(bt === 'action' || bt === 'montage_start' || bt === 'montage_end' || bt === 'flashback_end' ? { action_text: (rb.action_text as string) || '' } : {}),
      ...(bt === 'parenthetical' ? { character_id: (rb.character_id as string) || '', parenthetical_text: (rb.parenthetical_text as string) || '' } : {}),
      ...(bt === 'transition' ? { transition_type: (rb.transition_type as string) || 'CUT_TO' } : {}),
      ...(bt === 'title_card' ? { title_card_text: (rb.title_card_text as string) || '' } : {}),
      ...(bt === 'insert' ? { insert_description: (rb.insert_description as string) || '' } : {}),
      ...(bt === 'flashback_start' ? { flashback_label: (rb.flashback_label as string) || '' } : {}),
    } as Beat;
  });

  return {
    scene_number: sp.scene_number, scene_global_number: sp.scene_global_number,
    location: sp.location, time_of_day: sp.time_of_day,
    scene_heading: `${sp.location.interior_exterior}. ${sp.location.name} — ${sp.time_of_day}`,
    scene_heading_override: false,
    source_chapter_ref: sp.source_chapter_ref, synopsis: sp.synopsis,
    dramatic_function: sp.dramatic_function as Scene['dramatic_function'],
    tension_level: result.tension_level || sp.tension_level || 3,
    characters_present: sp.characters_present || [],
    estimated_duration_seconds: beats.reduce((s, b) => s + (b.estimated_duration_seconds || 0), 0),
    beats,
  };
}

function createEmptyScene(sp: import('./schema/types').ScenePlan): Scene {
  return {
    scene_number: sp.scene_number, scene_global_number: sp.scene_global_number,
    location: sp.location, time_of_day: sp.time_of_day,
    scene_heading: `${sp.location.interior_exterior}. ${sp.location.name} — ${sp.time_of_day}`,
    scene_heading_override: false, synopsis: sp.synopsis,
    dramatic_function: sp.dramatic_function as Scene['dramatic_function'],
    tension_level: sp.tension_level, characters_present: sp.characters_present || [],
    estimated_duration_seconds: 0, beats: [],
  };
}
