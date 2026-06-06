// ============================================================================
// AnalysisPage — 阶段1 小说分析全页
// sub-tabs: 概览 / 主题 / 人物 / 剧情 / 章节
// v0.7.0: 后台分析 — 支持显示后台任务进度，自动加载完成结果
// ============================================================================

import React, { useEffect, useState, useCallback } from 'react';
import { useAnalysisStore, useProjectStore, useTaskStore, useConfigStore } from '../store';
import { loadAnalysis, loadNovel, saveAnalysis } from '../api/endpoints';
import { cancelTask } from '../background/taskManager';
import { regenerateChapter } from '../analyzer';
import { StatBar, ThemesSection, CharactersSection, ConflictSection, EventsTimeline, ChaptersSection } from './AnalysisPreview';
import { exportAnalysisPdf, exportAnalysisHtml } from '../renderer/analysisExport';
import { copyToClipboard } from '../shared/download';
import type { AppSection } from '../components/AppShell';

interface Props {
  section: AppSection;
  onSectionChange: (section: AppSection) => void;
}

const TABS: Array<{ id: AppSection; label: string; icon: string }> = [
  { id: 'analysis_overview', label: '概览', icon: '📋' },
  { id: 'analysis_theme', label: '主题', icon: '🏷️' },
  { id: 'analysis_characters', label: '人物', icon: '👥' },
  { id: 'analysis_plot', label: '剧情', icon: '📈' },
  { id: 'analysis_chapters', label: '章节', icon: '📑' },
];

export const AnalysisPage: React.FC<Props> = ({ section, onSectionChange }) => {
  const analysis = useAnalysisStore((s) => s.analysis);
  const setAnalysis = useAnalysisStore((s) => s.setAnalysis);
  const updateChapter = useAnalysisStore((s) => s.updateChapter);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const aiConfig = useConfigStore((s) => s.aiConfig);
  const task = useTaskStore((s) => s.getTask(activeProjectId || '', 'stage1'));
  const dismissNotification = useTaskStore((s) => s.dismissNotification);
  const [copied, setCopied] = useState(false);
  const [regeneratingChapter, setRegeneratingChapter] = useState<number | null>(null);

  // 单章重新生成
  const handleRegenerate = useCallback(async (chapterNumber: number) => {
    if (!activeProjectId || !analysis) return;
    const novel = loadNovel(activeProjectId);
    if (!novel) {
      alert('未找到原始小说数据。请重新导入小说后再试。\n\n（原因：该项目在阶段1分析时未保存原文，需重新导入）');
      return;
    }

    const chapterIndex = chapterNumber - 1;
    if (chapterIndex < 0 || chapterIndex >= novel.chapters.length) {
      alert(`章节索引错误：第${chapterNumber}章超出范围`);
      return;
    }

    setRegeneratingChapter(chapterNumber);
    try {
      const { chapterSummary, curatedPassages } = await regenerateChapter(
        { title: novel.title, author: novel.author, chapters: novel.chapters, rawText: '' },
        chapterIndex,
        aiConfig
      );
      updateChapter(chapterNumber, chapterSummary, curatedPassages);
      // 同步持久化
      const updated = useAnalysisStore.getState().analysis;
      if (updated) saveAnalysis(activeProjectId, updated);
    } catch (e) {
      console.error(`重新生成第${chapterNumber}章失败:`, e);
      alert(`重新生成第${chapterNumber}章失败：${(e as Error).message}`);
    } finally {
      setRegeneratingChapter(null);
    }
  }, [activeProjectId, analysis, aiConfig, updateChapter]);

  // 页面挂载时清除该阶段的完成通知
  useEffect(() => {
    if (activeProjectId && task?.status === 'completed') {
      dismissNotification(activeProjectId, 'stage1');
    }
  }, [activeProjectId, task?.status, dismissNotification]);

  // 任务刚完成时：自动从 localStorage 加载 analysis 到内存
  useEffect(() => {
    if (activeProjectId && task?.status === 'completed' && !analysis) {
      const stored = loadAnalysis(activeProjectId);
      if (stored) setAnalysis(stored);
    }
  }, [activeProjectId, task?.status, analysis, setAnalysis]);

  // ---- 后台任务运行中 ----
  if (task && task.status === 'running' && !analysis) {
    return (
      <div style={{ textAlign: 'center', padding: 80, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
        <h3 style={{ marginBottom: 8 }}>阶段 1：AI 正在分析小说</h3>
        <p style={{ color: '#888', marginBottom: 24 }}>{task.message}</p>
        {task.progress && (
          <div style={{ width: 400 }}>
            {/* Tier 1 章节进度 */}
            {task.progress.tier1Total != null && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: '#555', fontWeight: 500 }}>
                    📖 逐章分析
                  </span>
                  <span style={{ fontSize: 12, color: '#888' }}>
                    {task.progress.tier1Done} / {task.progress.tier1Total}
                    {task.progress.tier1Done === task.progress.tier1Total ? ' ✅' : ''}
                  </span>
                </div>
                <div style={{
                  height: 6, background: '#e0e0e0', borderRadius: 3, overflow: 'hidden', marginBottom: 16,
                }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.round(((task.progress.tier1Done ?? 0) / (task.progress.tier1Total || 1)) * 100)}%`,
                    background: task.progress.tier1Done === task.progress.tier1Total ? '#4caf50' : '#1976d2',
                    borderRadius: 3, transition: 'width 0.3s ease',
                  }} />
                </div>
              </>
            )}

            {/* Tier 2 全局分析 */}
            {task.progress.tier2Running && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: '#555', fontWeight: 500 }}>
                    🌐 全局主题与人物关系提炼
                  </span>
                  <span style={{ fontSize: 12, color: '#e65100' }}>
                    <Spinner /> 进行中...
                  </span>
                </div>
                <div style={{
                  height: 6, background: '#e0e0e0', borderRadius: 3, overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: '100%',
                    background: 'linear-gradient(90deg, #ff9800, #ffc107, #ff9800)',
                    borderRadius: 3,
                    animation: 'tier2Pulse 1.5s ease-in-out infinite',
                  }} />
                </div>
                <style>{`
                  @keyframes tier2Pulse {
                    0%, 100% { opacity: 0.4; }
                    50% { opacity: 1; }
                  }
                  @keyframes spin {
                    to { transform: rotate(360deg); }
                  }
                `}</style>
              </>
            )}
          </div>
        )}
        <button
          onClick={() => activeProjectId && cancelTask(activeProjectId, 'stage1')}
          style={{ marginTop: 24, ...cancelBtnStyle }}
        >
          取消分析
        </button>
      </div>
    );
  }

  // ---- 后台任务失败 ----
  if (task && task.status === 'failed' && !analysis) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
        <p style={{ color: '#c62828' }}>分析失败：{task.error || '未知错误'}</p>
        <p style={{ color: '#888' }}>请返回导入页面重新导入小说</p>
      </div>
    );
  }

  // ---- 无分析数据且无后台任务 ----
  if (!analysis) {
    return (
      <div style={{ textAlign: 'center', padding: 80, color: '#888' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
        <p>暂无分析数据，请先导入小说</p>
      </div>
    );
  }

  // ---- 有分析数据：正常显示 ----
  const handleCopy = async () => {
    const ok = await copyToClipboard(JSON.stringify(analysis, null, 2));
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  const handlePdf = () => exportAnalysisPdf();
  const handleHtml = () => exportAnalysisHtml(analysis, analysis.source_info.title);

  const renderContent = () => {
    switch (section) {
      case 'analysis_overview':
        return (
          <>
            <StatBar analysis={analysis} />
            <ThemesSection analysis={analysis} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <CharactersSection analysis={analysis} span={1} />
              <ConflictSection analysis={analysis} span={1} />
            </div>
            <div style={{ height: 16 }} />
            <EventsTimeline analysis={analysis} />
            <div style={{ height: 16 }} />
            <ChaptersSection analysis={analysis} onRegenerate={handleRegenerate} regeneratingChapter={regeneratingChapter} />
          </>
        );
      case 'analysis_theme':
        return (
          <>
            <StatBar analysis={analysis} />
            <ThemesSection analysis={analysis} />
          </>
        );
      case 'analysis_characters':
        return (
          <>
            <StatBar analysis={analysis} />
            <CharactersSection analysis={analysis} all />
          </>
        );
      case 'analysis_plot':
        return (
          <>
            <StatBar analysis={analysis} />
            <ConflictSection analysis={analysis} />
            <div style={{ height: 16 }} />
            <EventsTimeline analysis={analysis} />
          </>
        );
      case 'analysis_chapters':
        return (
          <>
            <StatBar analysis={analysis} />
            <ChaptersSection analysis={analysis} onRegenerate={handleRegenerate} regeneratingChapter={regeneratingChapter} />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Sub-tab 导航 + 导出按钮 */}
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

        {/* 导出按钮组 */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', paddingRight: 4 }}>
          <button onClick={handlePdf} style={pdfBtn}>
            🖨 导出 PDF
          </button>
          <button onClick={handleHtml} style={htmlBtn}>
            📄 导出 HTML
          </button>
          <button onClick={handleCopy} style={copyBtn}>
            {copied ? '✅ 已复制' : '📋 复制 JSON'}
          </button>
        </div>
      </div>

      {/* 内容区 */}
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        {renderContent()}
      </div>
    </div>
  );
};

// ====== Styles ======

const pdfBtn: React.CSSProperties = {
  padding: '6px 14px',
  border: '1px solid #1976d2',
  borderRadius: 6,
  background: '#1976d2',
  color: '#fff',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 500,
  display: 'flex',
  alignItems: 'center',
  gap: 4,
};

const htmlBtn: React.CSSProperties = {
  padding: '6px 14px',
  border: '1px solid #d0d0d0',
  borderRadius: 6,
  background: '#fff',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 500,
  display: 'flex',
  alignItems: 'center',
  gap: 4,
};

const copyBtn: React.CSSProperties = {
  padding: '6px 10px',
  border: '1px solid #e0e0e0',
  borderRadius: 6,
  background: 'transparent',
  cursor: 'pointer',
  fontSize: 11,
  color: '#888',
};

const Spinner: React.FC = () => (
  <span style={{
    display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
    border: '2px solid #e65100', borderTopColor: 'transparent',
    animation: 'spin 0.6s linear infinite', verticalAlign: 'middle', marginRight: 4,
  }} />
);

const cancelBtnStyle: React.CSSProperties = {
  padding: '8px 20px', border: '1px solid #ccc', borderRadius: 6,
  background: '#fff', cursor: 'pointer', fontSize: 13, color: '#888',
};
