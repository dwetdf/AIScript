// ============================================================================
// AnalysisPreview — 阶段1 小说分析可视化预览
// 替代原来的 ResultCard，提供卡片视图 + 下载
// ============================================================================

import React from 'react';
import type { NovelAnalysis } from '@/schema/types';
import { toYaml } from '@/yaml-builder';
import { downloadYaml, downloadJson, copyToClipboard } from '@/shared/download';

interface Props {
  analysis: NovelAnalysis;
}

export const AnalysisPreview: React.FC<Props> = ({ analysis }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    const ok = await copyToClipboard(JSON.stringify(analysis, null, 2));
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  const handleDownloadYaml = () => {
    const yaml = toYaml(analysis);
    downloadYaml(yaml, `${analysis.source_info.title}-analysis.yaml`);
  };

  const handleDownloadJson = () => {
    downloadJson(analysis, `${analysis.source_info.title}-analysis.json`);
  };

  const mainChars = analysis.character_analysis.filter((c) => c.importance === 'essential' || c.importance === 'major');
  const chapters = analysis.chapter_summaries;
  const events = analysis.plot_analysis.key_events;
  const themes = analysis.theme_analysis?.core_themes || [];

  return (
    <div style={container}>
      {/* 标题栏 */}
      <div style={titleBar}>
        <h2 style={{ margin: 0, fontSize: 20 }}>📊 小说分析报告</h2>
        <div style={btnGroup}>
          <button onClick={handleCopy} style={btn}>{copied ? '✅ 已复制' : '📋 复制 JSON'}</button>
          <button onClick={handleDownloadJson} style={btn}>📥 JSON</button>
          <button onClick={handleDownloadYaml} style={{ ...btn, background: '#1976d2', color: '#fff', borderColor: '#1976d2' }}>📥 下载 YAML</button>
        </div>
      </div>

      {/* 统计条 */}
      <div style={statRow}>
        <Stat label="章节" value={chapters.length} />
        <Stat label="人物" value={analysis.character_analysis.length} />
        <Stat label="关键事件" value={events.length} />
        <Stat label="总字数" value={(analysis.source_info.word_count || 0).toLocaleString()} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* ===== 主题分析 ===== */}
        <SectionCard icon="🏷️" title="核心主题" span={2}>
          {themes.length === 0 ? <Muted>未提取主题</Muted> : themes.map((t, i) => (
            <div key={i} style={themeCard}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{t.theme}</div>
              <div style={{ fontSize: 13, color: '#555', lineHeight: 1.5 }}>{t.description}</div>
              {t.embodied_by && t.embodied_by.length > 0 && (
                <div style={{ marginTop: 6, fontSize: 11, color: '#888' }}>
                  体现于: {t.embodied_by.join(' · ')}
                </div>
              )}
            </div>
          ))}
          {analysis.theme_analysis?.tonal_characteristics && (
            <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {analysis.theme_analysis.tonal_characteristics.map((tc, i) => (
                <span key={i} style={toneTag}>{tc}</span>
              ))}
            </div>
          )}
        </SectionCard>

        {/* ===== 人物图谱 ===== */}
        <SectionCard icon="👥" title="人物图谱" span={1}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {mainChars.map((c) => (
              <div key={c.character_id} style={charCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: 14 }}>{c.name}</strong>
                  <span style={roleBadge(c.role)}>{c.role}</span>
                </div>
                <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                  id: {c.character_id} · {c.importance}
                </div>
                {c.identity && <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>{c.identity}</div>}
                {c.character_arc && (
                  <div style={{ fontSize: 11, color: '#888', marginTop: 2, fontStyle: 'italic' }}>
                    ↪ {c.character_arc}
                  </div>
                )}
                {c.distinctive_traits?.speech_style && (
                  <div style={{ fontSize: 11, color: '#777', marginTop: 4 }}>
                    💬 {c.distinctive_traits.speech_style}
                  </div>
                )}
              </div>
            ))}
          </div>
        </SectionCard>

        {/* ===== 核心冲突 ===== */}
        <SectionCard icon="⚔️" title="核心冲突" span={1}>
          <div style={{ fontSize: 13, lineHeight: 1.6, color: '#444' }}>
            <div style={{ marginBottom: 8 }}>
              <span style={conflictBadge}>{analysis.plot_analysis.core_conflict.type}</span>
            </div>
            <p style={{ margin: '0 0 8px' }}>{analysis.plot_analysis.core_conflict.description}</p>
            {analysis.plot_analysis.core_conflict.conflict_layers?.map((l, i) => (
              <div key={i} style={{ marginTop: 4, fontSize: 12 }}>
                <strong>{l.layer}:</strong> {l.description}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4, color: '#666' }}>主线</div>
            <div style={{ fontSize: 13, color: '#444', lineHeight: 1.5 }}>{analysis.plot_analysis.main_plot.description}</div>
            <div style={{ marginTop: 4, fontSize: 11, color: '#e65100' }}>⚠️ 赌注: {analysis.plot_analysis.main_plot.stakes}</div>
          </div>
        </SectionCard>

        {/* ===== 关键事件时间线 ===== */}
        <SectionCard icon="📈" title={`关键事件 (${events.length})`} span={2}>
          <div style={{ position: 'relative', paddingLeft: 20 }}>
            {/* 时间线竖线 */}
            <div style={{ position: 'absolute', left: 8, top: 0, bottom: 0, width: 2, background: '#e0e0e0' }} />
            {events.map((evt, i) => (
              <div key={i} style={{ position: 'relative', marginBottom: 12, paddingLeft: 16 }}>
                <div style={{
                  position: 'absolute', left: -16, top: 5, width: 10, height: 10,
                  borderRadius: '50%', background: i === events.length - 1 ? '#1976d2' : '#4caf50',
                  border: '2px solid #fff', boxShadow: '0 0 0 2px #e0e0e0',
                }} />
                <div style={{ fontSize: 12, color: '#999' }}>第 {evt.chapter} 章</div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{evt.event}</div>
                <div style={{ fontSize: 12, color: '#666', lineHeight: 1.4 }}>{evt.description}</div>
                {evt.dramatic_function && (
                  <span style={{ ...funcBadge, background: funcColor(evt.dramatic_function) }}>
                    {evt.dramatic_function}
                  </span>
                )}
              </div>
            ))}
          </div>
        </SectionCard>

        {/* ===== 章节摘要 ===== */}
        <SectionCard icon="📑" title={`章节摘要 (${chapters.length} 章)`} span={2}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
            {chapters.map((ch) => (
              <div key={ch.chapter_number} style={chapterCard}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>
                  第 {ch.chapter_number} 章{ch.chapter_title ? ` · ${ch.chapter_title}` : ''}
                </div>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>
                  {ch.paragraph_count} 段 · {ch.adaptation_potential === 'high' ? '🔥' : ch.adaptation_potential === 'medium' ? '📖' : '📄'} {ch.adaptation_potential}
                </div>
                <div style={{ fontSize: 12, color: '#555', lineHeight: 1.4 }}>
                  {ch.summary}
                </div>
                {ch.key_events && ch.key_events.length > 0 && (
                  <div style={{ marginTop: 4, fontSize: 11, color: '#777' }}>
                    {ch.key_events.map((e, i) => <span key={i} style={{ marginRight: 8 }}>• {e}</span>)}
                  </div>
                )}
                {ch.characters_appeared && ch.characters_appeared.length > 0 && (
                  <div style={{ marginTop: 4, fontSize: 11, color: '#999' }}>
                    出场: {ch.characters_appeared.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </SectionCard>

      </div>
    </div>
  );
};

// ====== Sub-components ======

const SectionCard: React.FC<{ icon: string; title: string; span?: number; children: React.ReactNode }> =
  ({ icon, title, span = 1, children }) => (
    <div style={{
      gridColumn: `span ${span}`,
      background: '#fff',
      border: '1px solid #e8e8e8',
      borderRadius: 8,
      padding: 16,
    }}>
      <h4 style={{ margin: '0 0 12px', fontSize: 14, color: '#333', borderBottom: '1px solid #f0f0f0', paddingBottom: 8 }}>
        {icon} {title}
      </h4>
      {children}
    </div>
  );

const Stat: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div style={{ textAlign: 'center', minWidth: 80 }}>
    <div style={{ fontSize: 22, fontWeight: 700, color: '#1976d2' }}>{value}</div>
    <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{label}</div>
  </div>
);

const Muted: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontSize: 13, color: '#bbb', fontStyle: 'italic' }}>{children}</div>
);

const roleBadge = (role: string): React.CSSProperties => ({
  fontSize: 10, padding: '2px 6px', borderRadius: 8,
  background: role === 'protagonist' ? '#4caf50' : role === 'antagonist' ? '#f44336' : '#90a4ae',
  color: '#fff', fontWeight: 600,
});

const conflictBadge: React.CSSProperties = {
  fontSize: 11, padding: '3px 8px', borderRadius: 4,
  background: '#f44336', color: '#fff', fontWeight: 600, textTransform: 'uppercase',
};

const funcColor = (df: string): string => {
  const m: Record<string, string> = {
    inciting_incident: '#e91e63', climax: '#f44336', resolution: '#4caf50',
    midpoint: '#ff9800', exposition: '#2196f3', plot_point_1: '#9c27b0',
    plot_point_2: '#9c27b0', other: '#607d8b',
  };
  return m[df] || '#607d8b';
};

const funcBadge: React.CSSProperties = {
  fontSize: 9, padding: '2px 6px', borderRadius: 4, color: '#fff', fontWeight: 600,
  display: 'inline-block', marginTop: 4,
};

// ====== Styles ======

const container: React.CSSProperties = { padding: 24 };

const titleBar: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  marginBottom: 16, flexWrap: 'wrap', gap: 8,
};

const btnGroup: React.CSSProperties = { display: 'flex', gap: 6 };

const btn: React.CSSProperties = {
  padding: '6px 14px', border: '1px solid #d0d0d0', borderRadius: 6,
  background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 500,
};

const statRow: React.CSSProperties = {
  display: 'flex', gap: 24, padding: '12px 20px', background: '#fff',
  border: '1px solid #e8e8e8', borderRadius: 8, marginBottom: 16,
  justifyContent: 'center',
};

const themeCard: React.CSSProperties = {
  padding: '10px 14px', background: '#fafafa', borderRadius: 6, border: '1px solid #f0f0f0', marginBottom: 8,
};

const toneTag: React.CSSProperties = {
  padding: '3px 10px', background: '#e3f2fd', color: '#1565c0', borderRadius: 12, fontSize: 11, fontWeight: 500,
};

const charCard: React.CSSProperties = {
  padding: '10px 14px', border: '1px solid #f0f0f0', borderRadius: 6, background: '#fafafa',
};

const chapterCard: React.CSSProperties = {
  padding: '10px 14px', border: '1px solid #f0f0f0', borderRadius: 6, background: '#fafafa',
};
