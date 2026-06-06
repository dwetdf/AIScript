// ============================================================================
// App 根组件 — 简洁路由器
// 项目管理侧边栏 + 阶段独立页面
// ============================================================================

import React, { useState, useCallback, useEffect } from 'react';
import { AppShell, deriveBreadcrumb, type AppSection, type BreadcrumbItem } from './components/AppShell';
import { ProjectSidebar } from './components/ProjectSidebar';
import { ImportPage } from './views/ImportPage';
import { AnalysisPage } from './views/AnalysisPage';
import { PlanPage } from './views/PlanPage';
import { ScriptPage } from './views/ScriptPage';
import { SettingsPage } from './views/SettingsPage';
import { ScreenplayPrintView } from './renderer/ScreenplayPrintView';
import { AnalysisPrintView } from './renderer/AnalysisPrintView';
import { PlanPrintView } from './renderer/PlanPrintView';
import {
  useProjectStore, useAnalysisStore, usePlanStore,
  useScriptStore, useConfigStore, useEditorStore,
} from './store';
import type { ProjectMeta } from './store/projectStore';
import {
  loadAnalysis, loadPlan, loadScreenplay,
  exportProjectBundle, importProjectBundle,
} from './api/endpoints';
import { downloadFile } from './shared/download';
import { pickFile } from './shared/file-picker';
import { previewProjectBundle } from './shared/project-io';
import type { BundlePreview } from './shared/project-io';
import { ImportPreviewDialog } from './components/ImportPreviewDialog';

export const App: React.FC = () => {
  const [section, setSection] = useState<AppSection>('import');
  const [importPreview, setImportPreview] = useState<BundlePreview | null>(null);
  const [importRawJson, setImportRawJson] = useState('');

  // stores
  const projects = useProjectStore((s) => s.projects);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const setActiveProject = useProjectStore((s) => s.setActiveProject);
  const addProject = useProjectStore((s) => s.addProject);
  const updateProjectPhase = useProjectStore((s) => s.updateProjectPhase);
  const setAnalysis = useAnalysisStore((s) => s.setAnalysis);
  const clearAnalysis = useAnalysisStore((s) => s.clearAnalysis);
  const setPlan = usePlanStore((s) => s.setPlan);
  const clearPlan = usePlanStore((s) => s.clearPlan);
  const setScreenplay = useScriptStore((s) => s.setScreenplay);
  const clearScreenplay = useScriptStore((s) => s.clearScreenplay);
  const screenplay = useScriptStore((s) => s.screenplay);
  const analysis = useAnalysisStore((s) => s.analysis);
  const isProcessing = useEditorStore((s) => s.isProcessing);
  const processingStep = useEditorStore((s) => s.processingStep);

  const activeProject = projects.find((p) => p.id === activeProjectId);
  const projectTitle = activeProject?.title || '';
  const analysisForCheck = useAnalysisStore((s) => s.analysis);
  const planForCheck = usePlanStore((s) => s.plan);
  const hasData = !!(analysisForCheck || planForCheck || screenplay);

  const breadcrumb: BreadcrumbItem[] = deriveBreadcrumb(section, projectTitle);

  // 初始加载：有项目但未选中 → 自动选中第一个
  useEffect(() => {
    if (projects && projects.length > 0 && !activeProjectId) {
      setActiveProject(projects[0].id);
    }
  }, [projects, activeProjectId, setActiveProject]);

  // 项目切换：activeProjectId 变化时从 localStorage 加载对应数据（F100, F101）
  useEffect(() => {
    if (!activeProjectId) return;
    const a = loadAnalysis(activeProjectId);
    if (a) setAnalysis(a); else clearAnalysis();
    const p = loadPlan(activeProjectId);
    if (p) setPlan(p); else clearPlan();
    const s = loadScreenplay(activeProjectId);
    if (s) setScreenplay(s); else clearScreenplay();
  }, [activeProjectId, setAnalysis, clearAnalysis, setPlan, clearPlan, setScreenplay, clearScreenplay]);

  const handleExport = useCallback(() => {
    const json = exportProjectBundle(activeProjectId || 'default');
    const title = projectTitle || 'project';
    downloadFile(json, title + '-aiscript-bundle.json', 'application/json');
  }, [activeProjectId, projectTitle]);

  const handleImportClick = useCallback(async () => {
    const file = await pickFile('.json');
    if (!file) return;
    const text = await file.text();
    const preview = previewProjectBundle(text);
    setImportRawJson(text);
    setImportPreview(preview);
  }, []);

  const handleImportConfirm = useCallback(() => {
    if (!importPreview?.valid) return;

    // 如果导入的 projectId 与已有项目冲突，自动分配新 ID 避免覆盖
    let targetProjectId: string = importPreview.projectId;
    if (projects.findIndex((p) => p.id === targetProjectId) >= 0) {
      targetProjectId = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    }

    const meta = importProjectBundle(importRawJson, targetProjectId);
    if (!meta) {
      setImportPreview(null);
      setImportRawJson('');
      return;
    }

    // 根据导入数据推导项目阶段
    const derivePhase = (): ProjectMeta['phase'] => {
      if (importPreview.stages.screenplay) return 'scripted';
      if (importPreview.stages.plan) return 'planned';
      if (importPreview.stages.analysis) return 'analyzed';
      return 'imported';
    };
    const phase = derivePhase();

    // 同步到项目列表 store（新项目追加，已有项目更新阶段）
    const existingIdx = projects.findIndex((p) => p.id === meta.id);
    if (existingIdx >= 0) {
      updateProjectPhase(meta.id, phase);
    } else {
      addProject({
        id: meta.id,
        title: meta.title || '未命名项目',
        author: meta.author || '未知',
        createdAt: meta.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        phase,
      });
    }

    // 切换到导入的项目
    setActiveProject(meta.id);

    // 加载导入数据到内存 stores
    const a = loadAnalysis(meta.id);
    if (a) setAnalysis(a);
    const p = loadPlan(meta.id);
    if (p) setPlan(p);
    const s = loadScreenplay(meta.id);
    if (s) setScreenplay(s);

    // 跳转到项目对应的阶段概览页
    if (phase === 'scripted') setSection('script_edit');
    else if (phase === 'planned') setSection('plan_overview');
    else if (phase === 'analyzed') setSection('analysis_overview');
    else setSection('import');

    setImportPreview(null);
    setImportRawJson('');
  }, [importPreview, importRawJson, projects, addProject, updateProjectPhase, setActiveProject, setAnalysis, setPlan, setScreenplay]);

  const handleImportCancel = useCallback(() => {
    setImportPreview(null);
    setImportRawJson('');
  }, []);

  const renderPage = () => {
    if (section === 'import') return <ImportPage onSectionChange={setSection} />;
    if (section.startsWith('analysis_')) return <AnalysisPage section={section} onSectionChange={setSection} />;
    if (section.startsWith('plan_')) return <PlanPage section={section} onSectionChange={setSection} />;
    if (section.startsWith('script_')) return <ScriptPage section={section} onSectionChange={setSection} />;
    if (section === 'settings') return <SettingsPage onBack={() => setSection(activeProject?.phase === 'scripted' ? 'script_edit' : 'import')} />;
    return <ImportPage onSectionChange={setSection} />;
  };

  const statusLeft = screenplay
    ? screenplay.metadata.title + ' ' + screenplay.acts.reduce((sum, a) => sum + a.scenes.reduce((ss, sc) => ss + sc.beats.length, 0), 0) + ' beats'
    : projects.length > 0 ? projects.length + ' 个项目' : '尚未导入小说';
  const statusRight = isProcessing ? '处理中' : '就绪';

  return (
    <>
      <AppShell
        breadcrumb={breadcrumb}
        sidebar={
          <ProjectSidebar
            currentSection={section}
            onNavigate={setSection}
            onExport={handleExport}
            onImport={handleImportClick}
            hasProjectData={hasData}
          />
        }
        processing={isProcessing ? { step: processingStep } : undefined}
        statusBar={{ left: statusLeft, right: statusRight }}
        onNavigate={setSection}
        headerActions={
          <>
            <button onClick={handleImportClick} style={headerBtn} title="导入项目">
              导入
            </button>
            {hasData && (
              <button onClick={handleExport} style={headerBtn} title="导出项目">
                导出
            </button>
            )}
            <button onClick={() => setSection('settings')} style={gearBtn} title="设置">
              {'\u2699\ufe0f'}
            </button>
          </>
        }
      >
        {renderPage()}
      </AppShell>

      {importPreview && (
        <ImportPreviewDialog
          preview={importPreview}
          onConfirm={handleImportConfirm}
          onCancel={handleImportCancel}
        />
      )}
      {screenplay && <ScreenplayPrintView />}
      {analysis && <AnalysisPrintView />}
      <PlanPrintView />
    </>
  );
};

const headerBtn: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid #d0d0d0',
  borderRadius: 6,
  fontSize: 12,
  cursor: 'pointer',
  padding: '4px 10px',
  color: '#555',
};

const gearBtn: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  fontSize: 20,
  cursor: 'pointer',
  padding: '4px 8px',
  borderRadius: 6,
};
