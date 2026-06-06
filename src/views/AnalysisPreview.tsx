// ============================================================================
// AnalysisPreview — 阶段1 小说分析可视化预览
// v0.5.0: 卡片样式优化 + 布局重构 + 中文显示
// ============================================================================

import React from 'react';
import type { NovelAnalysis, CharacterAnalysis } from '@/schema/types';
import { copyToClipboard } from '@/shared/download';

// ============================== 统计条 ==============================

export const StatBar: React.FC<{ analysis: NovelAnalysis }> = ({ analysis }) => {
  const chapters = analysis.chapter_summaries;
  const chars = analysis.character_analysis;
  const events = analysis.plot_analysis.key_events;
  const words = analysis.source_info.word_count || 0;

  const items = [
    { icon: '📑', label: '章节', value: chapters.length },
    { icon: '👥', label: '人物', value: chars.length },
    { icon: '📈', label: '关键事件', value: events.length },
    { icon: '📝', label: '总字数', value: words.toLocaleString() },
  ];

  return (
    <div style={statRow}>
      {items.map((item, i) => (
        <React.Fragment key={item.label}>
          {i > 0 && <div style={statDivider} />}
          <div style={statItem}>
            <span style={statIcon}>{item.icon}</span>
            <div>
              <div style={statValue}>{item.value}</div>
              <div style={statLabel}>{item.label}</div>
            </div>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
};

// ============================== 主题分析区块 ==============================

export const ThemesSection: React.FC<{ analysis: NovelAnalysis; span?: number }> = ({ analysis, span = 2 }) => {
  const themes = analysis.theme_analysis?.core_themes || [];
  const tonal = analysis.theme_analysis?.tonal_characteristics || [];

  return (
    <SectionCard icon="🏷️" title={`核心主题 (${themes.length})`} span={span}>
      {themes.length === 0 ? (
        <Muted>未提取主题</Muted>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {themes.map((t, i) => (
            <div key={i} style={themeCard}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ ...themeDot, background: themeColors[i % themeColors.length] }} />
                <span style={{ fontWeight: 600, fontSize: 14, color: '#333' }}>{t.theme}</span>
              </div>
              <div style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>{t.description}</div>
              {t.embodied_by && t.embodied_by.length > 0 && (
                <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {t.embodied_by.map((eb) => (
                    <span key={eb} style={embodiedTag}>{eb}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {tonal.length > 0 && (
        <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', padding: '8px 12px', background: '#fafafa', borderRadius: 6 }}>
          <span style={{ fontSize: 11, color: '#999', fontWeight: 600 }}>基调</span>
          {tonal.map((tc, i) => (
            <span key={i} style={toneTag}>{tc}</span>
          ))}
        </div>
      )}
    </SectionCard>
  );
};

// ============================== 人物图谱区块 ==============================

interface CharactersSectionProps {
  analysis: NovelAnalysis;
  all?: boolean;
}

export const CharactersSection: React.FC<CharactersSectionProps & { span?: number }> = ({ analysis, all = false, span = 2 }) => {
  const chars = all
    ? analysis.character_analysis
    : analysis.character_analysis.filter((c) => c.importance === 'essential' || c.importance === 'major');

  return (
    <SectionCard icon="👥" title={`人物图谱 (${chars.length})`} span={span}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 10 }}>
        {chars.map((c) => (
          <CharacterCard key={c.character_id} character={c} />
        ))}
      </div>
    </SectionCard>
  );
};

const CharacterCard: React.FC<{ character: CharacterAnalysis }> = ({ character: c }) => {
  const avatarColor = avatarColors[charToIndex(c.character_id)];
  const importanceLabel = impLabel(c.importance);
  const importanceColor = impColor(c.importance);

  return (
    <div style={charCard}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ ...avatarStyle, background: avatarColor }}>
          {c.name.charAt(0)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
            <strong style={{ fontSize: 14, color: '#333' }}>{c.name}</strong>
            <span style={{ ...roleBadge, background: roleColor(c.role) }}>{roleLabel(c.role)}</span>
            <span style={{ ...importanceBadge, background: importanceColor, color: '#fff' }}>{importanceLabel}</span>
          </div>
          <div style={{ fontSize: 11, color: '#aaa', fontFamily: 'monospace', marginBottom: 4 }}>
            {c.character_id}
          </div>
          {c.identity && (
            <div style={{ fontSize: 12, color: '#555', lineHeight: 1.5, marginBottom: 4 }}>{c.identity}</div>
          )}
          {c.character_arc && (
            <div style={{ fontSize: 11, color: '#888', padding: '4px 8px', background: '#f5f5f5', borderRadius: 4, fontStyle: 'italic', marginBottom: 4 }}>
              ↪ {c.character_arc}
            </div>
          )}
          {c.distinctive_traits?.speech_style && (
            <div style={{ fontSize: 11, color: '#1565c0', padding: '4px 8px', background: '#e3f2fd', borderRadius: 4 }}>
              💬 {c.distinctive_traits.speech_style}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================== 核心冲突区块 ==============================

export const ConflictSection: React.FC<{ analysis: NovelAnalysis; span?: number }> = ({ analysis, span = 2 }) => {
  const cc = analysis.plot_analysis.core_conflict;
  const mp = analysis.plot_analysis.main_plot;

  return (
    <SectionCard icon="⚔️" title="核心冲突" span={span}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div>
          <div style={{ marginBottom: 10 }}>
            <span style={conflictTypeBadge}>{conflictTypeLabel(cc.type)}</span>
          </div>
          <p style={{ margin: '0 0 12px', fontSize: 13, lineHeight: 1.6, color: '#444' }}>{cc.description}</p>
          {cc.conflict_layers?.map((l, i) => (
            <div key={i} style={{ marginTop: 6, fontSize: 12, color: '#555', padding: '8px 12px', background: '#fafafa', borderRadius: 4, borderLeft: `3px solid ${layerColors[i % layerColors.length]}` }}>
              <strong>{layerLabel(l.layer)}</strong>: {l.description}
            </div>
          ))}
        </div>
        <div style={{ borderLeft: '1px solid #f0f0f0', paddingLeft: 20 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: '#333' }}>📖 故事主线</div>
          <div style={{ fontSize: 13, color: '#444', lineHeight: 1.6 }}>{mp.description}</div>
          <div style={{
            marginTop: 12, padding: '10px 14px', background: '#fff3e0',
            borderRadius: 6, fontSize: 12, color: '#e65100', border: '1px solid #ffe0b2',
          }}>
            ⚠️ 核心赌注: {mp.stakes}
          </div>
        </div>
      </div>
    </SectionCard>
  );
};

// ============================== 关键事件时间线 ==============================

export const EventsTimeline: React.FC<{ analysis: NovelAnalysis; span?: number }> = ({ analysis, span = 2 }) => {
  const events = analysis.plot_analysis.key_events;
  if (events.length === 0) return null;

  return (
    <SectionCard icon="📈" title={`关键事件 (${events.length})`} span={span}>
      <div style={{ position: 'relative', paddingLeft: 24 }}>
        <div style={{ position: 'absolute', left: 8, top: 4, bottom: 4, width: 2, background: '#e8e8e8', borderRadius: 1 }} />
        {events.map((evt, i) => {
          const isLast = i === events.length - 1;
          const dotColor = isLast ? '#1565c0' : i === 0 ? '#e91e63' : '#4caf50';
          return (
            <div key={i} style={{ position: 'relative', marginBottom: i < events.length - 1 ? 14 : 0, paddingLeft: 20 }}>
              <div style={{
                position: 'absolute', left: -19, top: 6, width: 14, height: 14,
                borderRadius: '50%', background: dotColor,
                border: '2px solid #fff', boxShadow: `0 0 0 2px ${dotColor}33`,
                zIndex: 1,
              }} />
              <div style={{
                padding: '10px 14px', borderRadius: 6,
                background: '#fafafa', border: '1px solid #f0f0f0',
                transition: 'box-shadow 0.15s',
              }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#fff', background: '#333', padding: '1px 6px', borderRadius: 3 }}>
                    第{evt.chapter}章
                  </span>
                  {evt.dramatic_function && (
                    <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 3, background: funcBg(evt.dramatic_function), color: funcColor(evt.dramatic_function), fontWeight: 600 }}>
                      {funcLabel(evt.dramatic_function)}
                    </span>
                  )}
                </div>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2, color: '#333' }}>{evt.event}</div>
                <div style={{ fontSize: 12, color: '#666', lineHeight: 1.5 }}>{evt.description}</div>
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
};

// ============================== 章节摘要区块 ==============================

export const ChaptersSection: React.FC<{ analysis: NovelAnalysis; span?: number }> = ({ analysis, span = 2 }) => {
  const chapters = analysis.chapter_summaries;
  if (chapters.length === 0) return null;

  return (
    <SectionCard icon="📑" title={`章节摘要 (${chapters.length} 章)`} span={span}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 10 }}>
        {chapters.map((ch) => {
          const pot = ch.adaptation_potential || 'low';
          const potColor = pot === 'high' ? '#4caf50' : pot === 'medium' ? '#ff9800' : '#9e9e9e';
          const potLabel = pot === 'high' ? '高潜力' : pot === 'medium' ? '中潜力' : '低潜力';
          return (
            <div key={ch.chapter_number} style={chapterCard}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ ...chapterNumBadge, background: potColor }}>
                  {ch.chapter_number}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#333' }}>
                    {ch.chapter_title || `第${ch.chapter_number}章`}
                  </div>
                  <div style={{ fontSize: 11, color: '#999', display: 'flex', gap: 8 }}>
                    <span>{ch.paragraph_count} 段</span>
                    <span style={{ padding: '0 4px', borderRadius: 3, background: potColor + '20', color: potColor, fontSize: 10, fontWeight: 600 }}>{potLabel}</span>
                  </div>
                </div>
              </div>
              <div style={{ height: 3, borderRadius: 2, background: '#eee', marginBottom: 8, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: pot === 'high' ? '100%' : pot === 'medium' ? '60%' : '25%', background: potColor, borderRadius: 2, transition: 'width 0.3s' }} />
              </div>
              <div style={{ fontSize: 12, color: '#555', lineHeight: 1.5 }}>
                {ch.summary}
              </div>
              {ch.key_events && ch.key_events.length > 0 && (
                <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {ch.key_events.map((e, i) => (
                    <span key={i} style={chapterEventTag}>{e}</span>
                  ))}
                </div>
              )}
              {ch.characters_appeared && ch.characters_appeared.length > 0 && (
                <div style={{ marginTop: 8, fontSize: 11, color: '#999', padding: '4px 8px', background: '#f5f5f5', borderRadius: 4 }}>
                  👤 {ch.characters_appeared.join(' · ')}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
};

// ============================== 概览（全量组合） ==============================

export const AnalysisPreview: React.FC<{ analysis: NovelAnalysis }> = ({ analysis }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    const ok = await copyToClipboard(JSON.stringify(analysis, null, 2));
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  return (
    <div style={{ padding: 24 }}>
      <StatBar analysis={analysis} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <ThemesSection analysis={analysis} span={1} />
        <CharactersSection analysis={analysis} span={1} />
        <ConflictSection analysis={analysis} span={1} />
        <EventsTimeline analysis={analysis} span={1} />
      </div>
      <div style={{ height: 16 }} />
      <ChaptersSection analysis={analysis} span={2} />
    </div>
  );
};

// ====== Sub-components ======

const SectionCard: React.FC<{ icon: string; title: string; span?: number; children: React.ReactNode }> = ({
  icon, title, span = 1, children,
}) => (
  <div style={{
    gridColumn: `span ${span}`,
    background: '#fff',
    border: '1px solid #e8e8e8',
    borderRadius: 8,
    padding: 20,
    transition: 'box-shadow 0.15s',
  }}>
    <h4 style={{
      margin: '0 0 14px', fontSize: 14, fontWeight: 600, color: '#333',
      borderBottom: '1px solid #f0f0f0', paddingBottom: 10,
      letterSpacing: '0.02em',
    }}>
      {icon} {title}
    </h4>
    {children}
  </div>
);

const Muted: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontSize: 13, color: '#bbb', fontStyle: 'italic', padding: '8px 0' }}>{children}</div>
);

// ====== Helpers ======

const themeColors = ['#1976d2', '#e91e63', '#4caf50', '#ff9800', '#9c27b0', '#00bcd4', '#795548', '#607d8b'];

const charToIndex = (s: string): number => {
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  return Math.abs(hash);
};

const avatarColors = ['#4caf50', '#2196f3', '#ff9800', '#9c27b0', '#e91e63', '#00bcd4', '#795548', '#607d8b'];

const roleColor = (r: string): string =>
  r === 'protagonist' ? '#4caf50' : r === 'antagonist' ? '#f44336' : '#607d8b';

const roleLabel = (r: string): string => {
  const m: Record<string, string> = { protagonist: '主角', antagonist: '反派', supporting: '配角', minor: '次要', narrator: '旁白', ensemble: '群像' };
  return m[r] || r;
};

const roleBadge: React.CSSProperties = { fontSize: 10, padding: '2px 8px', borderRadius: 10, color: '#fff', fontWeight: 600, whiteSpace: 'nowrap' };

const impLabel = (imp: string) => {
  const m: Record<string, string> = { essential: '核心', major: '主要', supporting: '次要', minor: '龙套' };
  return m[imp] || imp;
};
const impColor = (imp: string) =>
  imp === 'essential' ? '#1565c0' : imp === 'major' ? '#1976d2' : imp === 'supporting' ? '#90a4ae' : '#ccc';

const importanceBadge: React.CSSProperties = { fontSize: 9, padding: '1px 6px', borderRadius: 8, fontWeight: 600, whiteSpace: 'nowrap' };

const conflictTypeLabel = (t: string): string => {
  const m: Record<string, string> = { person_vs_person: '人物 vs 人物', person_vs_society: '人物 vs 社会', person_vs_nature: '人物 vs 自然', person_vs_self: '人物 vs 自我', person_vs_technology: '人物 vs 科技', person_vs_fate: '人物 vs 命运', mixed: '混合冲突' };
  return m[t] || t;
};

const conflictTypeBadge: React.CSSProperties = { fontSize: 11, padding: '4px 12px', borderRadius: 4, background: '#f44336', color: '#fff', fontWeight: 600, display: 'inline-block' };

const layerColors = ['#1976d2', '#e91e63', '#4caf50', '#ff9800'];
const layerLabel = (l: string) => {
  const m: Record<string, string> = { internal: '内心冲突', interpersonal: '人际冲突', societal: '社会冲突', external: '外部冲突' };
  return m[l] || l;
};

const funcColor = (df: string): string => {
  const m: Record<string, string> = { inciting_incident: '#e91e63', climax: '#f44336', resolution: '#4caf50', midpoint: '#ff9800', exposition: '#2196f3', plot_point_1: '#9c27b0', plot_point_2: '#9c27b0', other: '#607d8b', character_moment: '#4caf50', action: '#ff5722' };
  return m[df] || '#607d8b';
};

const funcBg = (df: string): string => {
  const c = funcColor(df);
  return c + '18';
};

const funcLabel = (df: string): string => {
  const m: Record<string, string> = { inciting_incident: '激励事件', climax: '高潮', resolution: '结局', midpoint: '中点', exposition: '说明', plot_point_1: '情节一', plot_point_2: '情节二', other: '其他', character_moment: '人物时刻', action: '动作场景' };
  return m[df] || df;
};

// ====== Styles ======

const statRow: React.CSSProperties = {
  display: 'flex', gap: 0, padding: '14px 20px', background: '#fff',
  border: '1px solid #e8e8e8', borderRadius: 8, marginBottom: 16,
  justifyContent: 'center', alignItems: 'center',
};
const statItem: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '0 24px' };
const statIcon: React.CSSProperties = { fontSize: 24, opacity: 0.8 };
const statValue: React.CSSProperties = { fontSize: 22, fontWeight: 700, color: '#1976d2', lineHeight: 1.2 };
const statLabel: React.CSSProperties = { fontSize: 11, color: '#999', marginTop: 1 };
const statDivider: React.CSSProperties = { width: 1, height: 32, background: '#e8e8e8' };

const themeCard: React.CSSProperties = { padding: '14px 16px', background: '#fafafa', borderRadius: 6, border: '1px solid #f0f0f0' };
const themeDot: React.CSSProperties = { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 };
const toneTag: React.CSSProperties = { padding: '3px 10px', background: '#e8eaf6', color: '#3949ab', borderRadius: 12, fontSize: 11, fontWeight: 500 };
const embodiedTag: React.CSSProperties = { padding: '2px 8px', background: '#e3f2fd', color: '#1565c0', borderRadius: 10, fontSize: 11, fontWeight: 500 };

const charCard: React.CSSProperties = { padding: '14px 16px', border: '1px solid #f0f0f0', borderRadius: 6, background: '#fafafa', transition: 'box-shadow 0.15s' };
const avatarStyle: React.CSSProperties = { width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 18, flexShrink: 0 };

const chapterCard: React.CSSProperties = { padding: '14px 16px', border: '1px solid #f0f0f0', borderRadius: 6, background: '#fafafa', transition: 'box-shadow 0.15s' };
const chapterNumBadge: React.CSSProperties = { width: 32, height: 32, borderRadius: '50%', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 };
const chapterEventTag: React.CSSProperties = { fontSize: 10, padding: '2px 6px', background: '#f0f0f0', borderRadius: 4, color: '#666' };
