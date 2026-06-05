// ============================================================================
// PlanPreview — 阶段2 改编规划可视化预览
// 替代原来的 ResultCard，提供卡片视图 + 下载
// ============================================================================

import React from 'react';
import type { AdaptationPlan } from '@/schema/types';
import { toYaml } from '@/yaml-builder';
import { downloadYaml, downloadJson, copyToClipboard } from '@/shared/download';

interface Props {
  plan: AdaptationPlan;
}

export const PlanPreview: React.FC<Props> = ({ plan }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    const ok = await copyToClipboard(JSON.stringify(plan, null, 2));
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  const handleYaml = () => {
    downloadYaml(toYaml(plan), 'adaptation-plan.yaml');
  };

  const handleJson = () => {
    downloadJson(plan, 'adaptation-plan.json');
  };

  const strategy = plan.adaptation_strategy;

  return (
    <div style={{ padding: 24 }}>
      {/* 标题 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>🎬 改编规划</h2>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={handleCopy} style={btn}>{copied ? '✅ 已复制' : '📋 复制 JSON'}</button>
          <button onClick={handleJson} style={btn}>📥 JSON</button>
          <button onClick={handleYaml} style={{ ...btn, background: '#1976d2', color: '#fff', borderColor: '#1976d2' }}>📥 下载 YAML</button>
        </div>
      </div>

      {/* 统计 */}
      <div style={statRow}>
        <Stat label="幕" value={plan.episode_plan.total_acts} />
        <Stat label="场景" value={plan.scene_plan.length} />
        <Stat label="改编决策" value={strategy.structural_decisions.length} />
        <Stat label="人物 (初稿)" value={plan.characters_draft?.length || 0} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* ===== 基调 + 媒介 ===== */}
        <SectionCard icon="🎯" title="改编策略">
          <InfoRow label="目标媒介" value={strategy.target_medium} />
          <InfoRow label="原著基调" value={strategy.tone_adaptation.source_tone} />
          <InfoRow label="剧本基调" value={<strong>{strategy.tone_adaptation.target_tone}</strong>} />
          <div style={{ marginTop: 8, fontSize: 13, color: '#555', lineHeight: 1.5 }}>
            {strategy.tone_adaptation.notes}
          </div>
        </SectionCard>

        {/* ===== 外化 + 压缩 ===== */}
        <SectionCard icon="🔄" title="外化 & 压缩">
          {strategy.externalization_strategy && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 600, fontSize: 12, color: '#666', marginBottom: 4 }}>外化策略</div>
              <div style={{ fontSize: 12, color: '#555', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {strategy.externalization_strategy}
              </div>
            </div>
          )}
          {strategy.compression_rules && strategy.compression_rules.length > 0 && (
            <div>
              <div style={{ fontWeight: 600, fontSize: 12, color: '#666', marginBottom: 4 }}>压缩规则</div>
              {strategy.compression_rules.map((r, i) => (
                <div key={i} style={{ fontSize: 12, color: '#555', marginBottom: 4, display: 'flex', gap: 6 }}>
                  <span style={{ ...priorityBadge, background: r.priority === 'must' ? '#f44336' : '#ff9800' }}>
                    {r.priority || 'may'}
                  </span>
                  <span style={{ flex: 1 }}>{r.rule} <span style={{ color: '#999' }}>({r.applies_to})</span></span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* ===== 结构决策 ===== */}
        <SectionCard icon="🏗️" title={`结构改编决策 (${strategy.structural_decisions.length})`} span={2}>
          {strategy.structural_decisions.map((d, i) => (
            <div key={i} style={decisionCard}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{d.decision}</span>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, color: '#fff',
                  background: d.impact === 'high' ? '#f44336' : d.impact === 'medium' ? '#ff9800' : '#4caf50' }}>
                  {d.impact}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#666', lineHeight: 1.5 }}>{d.rationale}</div>
              {d.affected_characters && d.affected_characters.length > 0 && (
                <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>影响人物: {d.affected_characters.join(', ')}</div>
              )}
            </div>
          ))}
        </SectionCard>

        {/* ===== 人物改编 ===== */}
        {strategy.character_adaptations && strategy.character_adaptations.length > 0 && (
          <SectionCard icon="👥" title={`人物改编 (${strategy.character_adaptations.length})`} span={2}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
              {strategy.character_adaptations.map((ca) => (
                <div key={ca.character_id} style={charAdaptCard}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{ca.character_id}</span>
                    <span style={{
                      fontSize: 10, padding: '2px 8px', borderRadius: 8, fontWeight: 600, color: '#fff',
                      background: ca.action === 'keep' ? '#4caf50' : ca.action === 'cut' ? '#f44336' : ca.action === 'merge' ? '#ff9800' : ca.action === 'expand' ? '#2196f3' : '#9e9e9e',
                    }}>
                      {ca.action}
                    </span>
                  </div>
                  {ca.notes && <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>{ca.notes}</div>}
                  {ca.merge_with && <div style={{ fontSize: 11, color: '#e65100', marginTop: 2 }}>→ 合并到: {ca.merge_with}</div>}
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* ===== 幕结构 ===== */}
        <SectionCard icon="📐" title={`幕结构 (${plan.episode_plan.total_acts} 幕)`} span={2}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {plan.episode_plan.acts.map((act, i) => (
              <div key={i} style={actCard}>
                <div style={actHeader}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{act.act_title || `第${act.act_number}幕`}</span>
                    <span style={{ marginLeft: 8, fontSize: 11, color: '#999' }}>{act.act_type}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#888' }}>
                    🎞️ {act.estimated_scene_count} 场 · ⏱ {act.estimated_duration_minutes} 分钟
                  </div>
                </div>
                <div style={{ fontSize: 13, color: '#555', lineHeight: 1.5, marginTop: 4 }}>{act.synopsis}</div>
                {act.key_moments && act.key_moments.length > 0 && (
                  <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {act.key_moments.map((km, j) => (
                      <span key={j} style={momentTag}>📍 {km.moment}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </SectionCard>

        {/* ===== 场景大纲 ===== */}
        <SectionCard icon="🎞️" title={`场景大纲 (${plan.scene_plan.length} 场)`} span={2}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 500, overflow: 'auto' }}>
            {plan.scene_plan.map((sp) => (
              <div key={sp.scene_global_number} style={sceneCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>S{sp.scene_global_number}</span>
                      <span style={funcBadge(sp.dramatic_function)}>{sp.dramatic_function}</span>
                      {sp.tension_level && (
                        <span style={{ fontSize: 12, color: '#ff9800' }}>{'🔥'.repeat(sp.tension_level)}</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: '#777', marginTop: 2 }}>
                      {sp.location.interior_exterior}. {sp.location.name} — {sp.time_of_day}
                    </div>
                    <div style={{ fontSize: 12, color: '#555', lineHeight: 1.4, marginTop: 4 }}>{sp.synopsis}</div>
                    {sp.characters_present && sp.characters_present.length > 0 && (
                      <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>出场: {sp.characters_present.join(' · ')}</div>
                    )}
                    {sp.beat_plan && (
                      <div style={{ marginTop: 6, fontSize: 11, color: '#1976d2', display: 'flex', gap: 8 }}>
                        <span>📋 {sp.beat_plan.estimated_beat_count} beats</span>
                        <span>🔑 {sp.beat_plan.key_beats?.length || 0} 关键</span>
                        {sp.beat_plan.notes && <span style={{ color: '#888' }}>💡 {sp.beat_plan.notes}</span>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

      </div>
    </div>
  );
};

// ====== Helpers ======

const SectionCard: React.FC<{ icon: string; title: string; span?: number; children: React.ReactNode }> =
  ({ icon, title, span = 1, children }) => (
    <div style={{ gridColumn: `span ${span}`, background: '#fff', border: '1px solid #e8e8e8', borderRadius: 8, padding: 16 }}>
      <h4 style={{ margin: '0 0 12px', fontSize: 14, color: '#333', borderBottom: '1px solid #f0f0f0', paddingBottom: 8 }}>{icon} {title}</h4>
      {children}
    </div>
  );

const Stat: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div style={{ textAlign: 'center', minWidth: 70 }}>
    <div style={{ fontSize: 22, fontWeight: 700, color: '#1976d2' }}>{value}</div>
    <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{label}</div>
  </div>
);

const InfoRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', borderBottom: '1px solid #f9f9f9' }}>
    <span style={{ color: '#888' }}>{label}</span>
    <span>{value}</span>
  </div>
);

const funcBadge = (df: string): React.CSSProperties => {
  const colors: Record<string, string> = { inciting_incident: '#e91e63', climax: '#f44336', exposition: '#2196f3', character_moment: '#4caf50', plot_point: '#9c27b0', midpoint: '#ff9800', transition: '#607d8b', action: '#ff5722', other: '#9e9e9e' };
  return { fontSize: 9, padding: '2px 6px', borderRadius: 4, color: '#fff', background: colors[df] || '#9e9e9e', fontWeight: 600 };
};

const priorityBadge: React.CSSProperties = {
  fontSize: 9, padding: '2px 6px', borderRadius: 4, color: '#fff', fontWeight: 600, textTransform: 'uppercase',
};

// ====== Styles ======

const btn: React.CSSProperties = {
  padding: '6px 14px', border: '1px solid #d0d0d0', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 500,
};

const statRow: React.CSSProperties = {
  display: 'flex', gap: 24, padding: '12px 20px', background: '#fff', border: '1px solid #e8e8e8', borderRadius: 8, marginBottom: 16, justifyContent: 'center',
};

const decisionCard: React.CSSProperties = {
  padding: '10px 14px', border: '1px solid #f0f0f0', borderRadius: 6, background: '#fafafa', marginBottom: 8,
};

const charAdaptCard: React.CSSProperties = {
  padding: '10px 14px', border: '1px solid #f0f0f0', borderRadius: 6, background: '#fafafa',
};

const actCard: React.CSSProperties = {
  padding: '12px 16px', border: '1px solid #e0e0e0', borderRadius: 8, background: '#fafafa',
};

const actHeader: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4,
};

const momentTag: React.CSSProperties = {
  fontSize: 11, padding: '2px 8px', background: '#fff3e0', borderRadius: 4, color: '#e65100',
};

const sceneCard: React.CSSProperties = {
  padding: '10px 14px', border: '1px solid #f0f0f0', borderRadius: 6, background: '#fafafa',
};
