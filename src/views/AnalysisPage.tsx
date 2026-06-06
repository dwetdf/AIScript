// ============================================================================
// AnalysisPage — 阶段1 小说分析全页
// sub-tabs: 概览 / 主题 / 人物 / 剧情 / 章节
// v0.4.0: 按 sub-tab 条件渲染不同区块
// ============================================================================

import React from 'react';
import { useAnalysisStore } from '../store';
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
  const [copied, setCopied] = React.useState(false);

  if (!analysis) {
    return (
      <div style={{ textAlign: 'center', padding: 80, color: '#888' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
        <p>暂无分析数据，请先导入小说</p>
      </div>
    );
  }

  const handleCopy = async () => {
    const ok = await copyToClipboard(JSON.stringify(analysis, null, 2));
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  const handlePdf = () => exportAnalysisPdf();
  const handleHtml = () => exportAnalysisHtml(analysis, analysis.source_info.title);

  // 根据 sub-tab 渲染对应内容
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
            <ChaptersSection analysis={analysis} />
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
            <ChaptersSection analysis={analysis} />
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
