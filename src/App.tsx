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
import {
  useProjectStore, useAnalysisStore, usePlanStore,
  useScriptStore, useConfigStore, useEditorStore,
} from './store';
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
  const setAnalysis = useAnalysisStore((s) => s.setAnalysis);
  const setPlan = usePlanStore((s) => s.setPlan);
  const setScreenplay = useScriptStore((s) => s.setScreenplay);
  const screenplay = useScriptStore((s) => s.screenplay);
  const isProcessing = useEditorStore((s) => s.isProcessing);
  const processingStep = useEditorStore((s) => s.processingStep);

  // 活跃项目标题
  const activeProject = projects.find((p) => p.id === activeProjectId);
  const projectTitle = activeProject?.title || '';

  // 是否有数据（用于导入导出按钮）
  const hasData = !!(useAnalysisStore((s) => s.analysis) || usePlanStore((s) => s.plan) || screenplay);

  // 面包屑
  const breadcrumb: BreadcrumbItem[] = deriveBreadcrumb(section, projectTitle);

  // 激活第一个项目（启动时）
  useEffect(() => {
    if (projects.length > 0 && !activeProjectId) {
      const first = projects[0];
      setActiveProject(first.id);
      // 加载该项目的持久化数据
      const a = loadAnalysis(first.id);
      if (a) setAnalysis(a);
      if (a) setAnalysis(a);
      const p = loadPlan(first.id);
      if (p) setPlan(p);
      const s = loadScreenplay(first.id);
      if (s) setScreenplay(s);
    }
  }, [projects, activeProjectId, setActiveProject, setAnalysis, setPlan, setScreenplay]);

  // 切换项目时加载数据
  const handleProjectSwitch = useCallback((id: string) => {
    setActiveProject(id);
    const a = loadAnalysis(id);
    if (a) setAnalysis(a); else setAnalysis(null as any);
    const p = loadPlan(id);
    if (p) setPlan(p); else setPlan(null as any);
    const s = loadScreenplay(id);
    if (s) setScreenplay(s); else setScreenplay(null as any);
    // 根据项目状态决定默认页面
    if (s) setSection('script_edit');
    else if (p) setSection('plan_overview');
    else if (a) setSection('analysis_overview');
    else setSection('import');
  }, [setActiveProject, setAnalysis, setPlan, setScreenplay]);

  // 导出
  const handleExport = useCallback(() => {
    const json = exportProjectBundle(activeProjectId || 'default');
    const title = projectTitle || 'project';
    downloadFile(json, `${title}-aiscript-bundle.json`, 'application/json');
  }, [activeProjectId, projectTitle]);

  // 导入
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
    importProjectBundle(importRawJson, importPreview.projectId);
    setImportPreview(null);
    setImportRawJson('');
  }, [importPreview, importRawJson]);

  const handleImportCancel = useCallback(() => {
    setImportPreview(null);
    setImportRawJson('');
  }, []);

  // 页面渲染
  const renderPage = () => {
    if (section === 'import') return <ImportPage onSectionChange={setSection} />;
    if (section.startsWith('analysis_')) return <AnalysisPage section={section} onSectionChange={setSection} />;
    if (section.startsWith('plan_')) return <PlanPage section={section} onSectionChange={setSection} />;
    if (section.startsWith('script_')) return <ScriptPage section={section} onSectionChange={setSection} />;
    if (section === 'settings') return <SettingsPage onBack={() => setSection(activeProject?.phase === 'scripted' ? 'script_edit' : 'import')} />;
    return <ImportPage onSectionChange={setSection} />;
  };

  // 状态栏
  const statusLeft = screenplay
    ? `${screenplay.metadata.title} · ${screenplay.acts.reduce((sum, a) => sum + a.scenes.reduce((ss, sc) => ss + sc.beats.length, 0), 0)} beats`
    : projects.length > 0 ? `${projects.length} 个项目` : '尚未导入小说';
  const statusRight = isProcessing ? '⏳ 处理中' : '✅ 就绪';

  return (
    <>
      <AppShell
        breadcrumb={breadcrumb}
        sidebar={
          <ProjectSidebar
            currentSection={section}
            onNavigate={(s) => {
              // 如果是项目切换，用 handleProjectSwitch
              setSection(s);
            }}
            onExport={handleExport}
            onImport={handleImportClick}
            hasProjectData={hasData}
          />
        }
        processing={isProcessing ? { step: processingStep } : undefined}
        statusBar={{ left: statusLeft, right: statusRight }}
        onNavigate={setSection}
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
    </>
  );
};