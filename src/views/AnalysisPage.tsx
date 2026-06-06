// ============================================================================
// AnalysisPage — 阶段1 小说分析全页
// sub-tabs: 概览 / 主题 / 人物 / 剧情 / 章节
// ============================================================================

import React from 'react';
import { useAnalysisStore } from '../store';
import { AnalysisPreview } from './AnalysisPreview';
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

  if (!analysis) {
    return (
      <div style={{ textAlign: 'center', padding: 80, color: '#888' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
        <p>暂无分析数据，请先导入小说</p>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Sub-tab 导航 */}
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
      </div>

      {/* 内容区 */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {/* 当前所有 sub-tab 都显示完整 AnalysisPreview，后续可按需拆分 */}
        <AnalysisPreview analysis={analysis} />
      </div>
    </div>
  );
};