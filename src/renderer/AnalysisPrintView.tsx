// ============================================================================
// AnalysisPrintView — 分析报告打印视图
// 渲染所有分析数据的干净 HTML，屏幕隐藏，仅 @media print 时可见
// ============================================================================

import React from 'react';
import { useAnalysisStore } from '../store';
import type { NovelAnalysis } from '@/schema/types';

export const AnalysisPrintView: React.FC = () => {
  const analysis = useAnalysisStore((s) => s.analysis);
  if (!analysis) return null;

  const chars = analysis.character_analysis;
  const chapters = analysis.chapter_summaries;
  const events = analysis.plot_analysis.key_events;
  const themes = analysis.theme_analysis?.core_themes || [];
  const tonal = analysis.theme_analysis?.tonal_characteristics || [];
  const cc = analysis.plot_analysis.core_conflict;
  const mp = analysis.plot_analysis.main_plot;

  return (
    <div id="analysis-print-view" style={{ display: 'none' }}>
      {/* 标题页 */}
      <div style={{ textAlign: 'center', marginBottom: '2cm' }}>
        <h1>{analysis.source_info.title}</h1>
        <p style={{ fontSize: 11, color: '#888' }}>
          小说分析报告 · {new Date().toLocaleDateString('zh-CN')}
        </p>
      </div>

      {/* 统计条 */}
      <div className="ap-stat-row">
        <div className="ap-stat-item">
          <div className="ap-stat-value">{chapters.length}</div>
          <div className="ap-stat-label">章节</div>
        </div>
        <div className="ap-stat-item">
          <div className="ap-stat-value">{chars.length}</div>
          <div className="ap-stat-label">人物</div>
        </div>
        <div className="ap-stat-item">
          <div className="ap-stat-value">{events.length}</div>
          <div className="ap-stat-label">关键事件</div>
        </div>
        <div className="ap-stat-item">
          <div className="ap-stat-value">{(analysis.source_info.word_count || 0).toLocaleString()}</div>
          <div className="ap-stat-label">总字数</div>
        </div>
      </div>

      {/* 主题分析 */}
      {themes.length > 0 && (
        <>
          <h2>核心主题</h2>
          {themes.map((t, i) => (
            <div key={i} className="ap-theme-card">
              <div className="ap-theme-name">{t.theme}</div>
              <div className="ap-theme-desc">{t.description}</div>
              {t.embodied_by && t.embodied_by.length > 0 && (
                <div style={{ fontSize: '9pt', color: '#888', marginTop: '4pt' }}>
                  体现于: {t.embodied_by.join(' · ')}
                </div>
              )}
            </div>
          ))}
          {tonal.length > 0 && (
            <div style={{ marginTop: '8pt', fontSize: '9pt', color: '#888' }}>
              基调: {tonal.join(' · ')}
            </div>
          )}
        </>
      )}

      {/* 人物图谱 */}
      {chars.length > 0 && (
        <>
          <h2 className="page-break-before">人物图谱</h2>
          {chars.map((c) => (
            <div key={c.character_id} className="ap-char-card">
              <span className="ap-char-name">{c.name}</span>
              <span className="ap-char-role"> ({c.role})</span>
              {c.identity ? <span> — {c.identity}</span> : ''}
              {c.character_arc ? <span> · {c.character_arc}</span> : ''}
            </div>
          ))}
        </>
      )}

      {/* 核心冲突 */}
      <h2 className="page-break-before">核心冲突</h2>
      <div className="ap-conflict-type">{cc.type}</div>
      <p>{cc.description}</p>
      {cc.conflict_layers?.map((l, i) => (
        <div key={i} style={{ marginTop: '4pt' }}>
          <strong>{l.layer}:</strong> {l.description}
        </div>
      ))}
      <h3>主线</h3>
      <p>{mp.description}</p>
      <p style={{ fontWeight: 500 }}>⚠️ 赌注: {mp.stakes}</p>

      {/* 关键事件 */}
      {events.length > 0 && (
        <>
          <h2 className="page-break-before">关键事件</h2>
          {events.map((evt, i) => (
            <div key={i} className="ap-event-card">
              <div style={{ fontSize: '9pt', color: '#999' }}>第 {evt.chapter} 章</div>
              <div style={{ fontWeight: 700 }}>{evt.event}</div>
              <div style={{ fontSize: '10pt', color: '#555' }}>{evt.description}</div>
              {evt.dramatic_function && (
                <span className="ap-func-badge" style={{ background: funcColor(evt.dramatic_function) }}>
                  {funcLabel(evt.dramatic_function)}
                </span>
              )}
            </div>
          ))}
        </>
      )}

      {/* 章节摘要 */}
      {chapters.length > 0 && (
        <>
          <h2 className="page-break-before">章节摘要</h2>
          <div className="ap-chapter-grid">
            {chapters.map((ch) => (
              <div key={ch.chapter_number} className="ap-chapter-card">
                <span className="ap-chapter-num">{ch.chapter_number}</span>
                <strong>{ch.chapter_title || `第 ${ch.chapter_number} 章`}</strong>
                <div style={{ fontSize: '9pt', color: '#888' }}>{ch.paragraph_count} 段</div>
                <div style={{ fontSize: '10pt', color: '#555', marginTop: '4pt' }}>{ch.summary}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 尾页 */}
      <div className="page-break-before" style={{ textAlign: 'center', marginTop: '30%' }}>
        <p>— 分析报告结束 —</p>
        <p style={{ fontSize: '9pt', color: '#999' }}>
          本报告由 AI 辅助生成 · 初稿
        </p>
      </div>
    </div>
  );
};

function funcLabel(df: string): string {
  const m: Record<string, string> = {
    inciting_incident: '激励事件', climax: '高潮', resolution: '结局',
    midpoint: '中点', exposition: '说明', plot_point_1: '情节一',
    plot_point_2: '情节二', other: '其他',
  };
  return m[df] || df;
}

function funcColor(df: string): string {
  const m: Record<string, string> = {
    inciting_incident: '#e91e63', climax: '#f44336', resolution: '#4caf50',
    midpoint: '#ff9800', exposition: '#2196f3', plot_point_1: '#9c27b0',
    plot_point_2: '#9c27b0', other: '#607d8b',
  };
  return m[df] || '#607d8b';
}
