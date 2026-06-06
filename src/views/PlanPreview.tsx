// ============================================================================
// PlanPreview — 阶段2 改编规划可视化预览 + 场景大纲编辑
// v0.5.0: ScenesSection 支持行内编辑（synopsis/location/dramatic_function/characters）
// ============================================================================

import React from 'react';
import { usePlanStore } from '@/store';
import type { AdaptationPlan, ScenePlan } from '@/schema/types';
import { copyToClipboard } from '@/shared/download';

// ============================== 统计条 ==============================

export const PlanStatBar: React.FC<{ plan: AdaptationPlan }> = ({ plan }) => {
  const strategy = plan.adaptation_strategy;
  const items = [
    { label: '幕', value: plan.episode_plan.total_acts },
    { label: '场景', value: plan.scene_plan.length },
    { label: '改编决策', value: strategy.structural_decisions.length },
    { label: '人物 (初稿)', value: plan.characters_draft?.length || 0 },
  ];
  return (
    <div style={statRow}>
      {items.map((item) => (
        <div key={item.label} style={statItem}>
          <div style={statValue}>{item.value}</div>
          <div style={statLabel}>{item.label}</div>
        </div>
      ))}
    </div>
  );
};

// ============================== 改编策略区块 ==============================

export const StrategySection: React.FC<{ plan: AdaptationPlan; span?: number }> = ({ plan, span = 2 }) => {
  const strategy = plan.adaptation_strategy;
  return (
    <>
      <SectionCard icon="🎯" title="改编策略" span={span}>
        <InfoRow label="目标媒介" value={strategy.target_medium} />
        <InfoRow label="原著基调" value={strategy.tone_adaptation.source_tone} />
        <InfoRow label="剧本基调" value={<strong>{strategy.tone_adaptation.target_tone}</strong>} />
        <div style={{ marginTop: 8, fontSize: 13, color: '#555', lineHeight: 1.5 }}>{strategy.tone_adaptation.notes}</div>
      </SectionCard>

      {(strategy.externalization_strategy || (strategy.compression_rules && strategy.compression_rules.length > 0)) && (
        <SectionCard icon="🔄" title="外化 & 压缩" span={span}>
          {strategy.externalization_strategy && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 600, fontSize: 12, color: '#666', marginBottom: 4 }}>外化策略</div>
              <div style={{ fontSize: 12, color: '#555', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{strategy.externalization_strategy}</div>
            </div>
          )}
          {strategy.compression_rules && strategy.compression_rules.length > 0 && (
            <div>
              <div style={{ fontWeight: 600, fontSize: 12, color: '#666', marginBottom: 4 }}>压缩规则</div>
              {strategy.compression_rules.map((r, i) => (
                <div key={i} style={{ fontSize: 12, color: '#555', marginBottom: 4, display: 'flex', gap: 6 }}>
                  <span style={{ ...priorityBadge, background: r.priority === 'must' ? '#f44336' : '#ff9800' }}>{r.priority || 'may'}</span>
                  <span style={{ flex: 1 }}>{r.rule} <span style={{ color: '#999' }}>({r.applies_to})</span></span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      <SectionCard icon="🏗️" title={`结构改编决策 (${strategy.structural_decisions.length})`} span={span}>
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

      {strategy.character_adaptations && strategy.character_adaptations.length > 0 && (
        <SectionCard icon="👥" title={`人物改编 (${strategy.character_adaptations.length})`} span={span}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
            {strategy.character_adaptations.map((ca) => (
              <div key={ca.character_id} style={charAdaptCard}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{ca.character_id}</span>
                  <span style={{
                    fontSize: 10, padding: '2px 8px', borderRadius: 8, fontWeight: 600, color: '#fff',
                    background: ca.action === 'keep' ? '#4caf50' : ca.action === 'cut' ? '#f44336' : ca.action === 'merge' ? '#ff9800' : ca.action === 'expand' ? '#2196f3' : '#9e9e9e',
                  }}>{ca.action}</span>
                </div>
                {ca.notes && <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>{ca.notes}</div>}
                {ca.merge_with && <div style={{ fontSize: 11, color: '#e65100', marginTop: 2 }}>→ 合并到: {ca.merge_with}</div>}
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </>
  );
};

// ============================== 幕结构区块 ==============================
export const ActsSection: React.FC<{ plan: AdaptationPlan; span?: number }> = ({ plan, span = 2 }) => {
  return (
    <SectionCard icon="📐" title={`幕结构 (${plan.episode_plan.total_acts} 幕)`} span={span}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {plan.episode_plan.acts.map((act, i) => (
          <div key={i} style={actCard}>
            <div style={actHeader}>
              <div>
                <span style={{ fontWeight: 700, fontSize: 15 }}>{act.act_title || '第' + act.act_number + '幕'}</span>
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
  );
};

// ============================== 场景大纲区块（可编辑） ==============================
export const ScenesSection: React.FC<{ plan: AdaptationPlan; span?: number }> = ({ plan, span = 2 }) => {
  const updateScenePlan = usePlanStore((s) => s.updateScenePlan);
  const deleteScenePlan = usePlanStore((s) => s.deleteScenePlan);

  return (
    <SectionCard icon="🎞️" title={`场景大纲 (${plan.scene_plan.length} 场)`} span={span}>
      <div style={{ fontSize: 11, color: '#999', marginBottom: 8 }}>
        💡 双击字段可编辑 · 修改后立即生效
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 500, overflow: 'auto' }}>
        {plan.scene_plan.map((sp) => (
          <EditableSceneCard
            key={sp.scene_global_number}
            scenePlan={sp}
            onUpdate={(patch) => updateScenePlan(sp.scene_global_number, patch)}
            onDelete={() => {
              if (confirm(`删除场景 S${sp.scene_global_number}？`)) deleteScenePlan(sp.scene_global_number);
            }}
          />
        ))}
      </div>
    </SectionCard>
  );
};

/** 可编辑的场景卡片 */
const EditableSceneCard: React.FC<{
  scenePlan: ScenePlan;
  onUpdate: (patch: Partial<ScenePlan>) => void;
  onDelete: () => void;
}> = ({ scenePlan: sp, onUpdate, onDelete }) => {
  const [editField, setEditField] = React.useState<string | null>(null);
  const [editValue, setEditValue] = React.useState('');

  const startEdit = (field: string, currentValue: string) => {
    setEditField(field);
    setEditValue(currentValue);
  };

  const commitEdit = () => {
    if (!editField) return;
    const trimmed = editValue.trim();
    if (!trimmed) { setEditField(null); return; }

    switch (editField) {
      case 'synopsis':
        onUpdate({ synopsis: trimmed });
        break;
      case 'location':
        onUpdate({ location: { ...sp.location, name: trimmed } });
        break;
      case 'set_description':
        onUpdate({ location: { ...sp.location, set_description: trimmed } });
        break;
      case 'time_of_day':
        onUpdate({ time_of_day: trimmed });
        break;
      case 'dramatic_function':
        onUpdate({ dramatic_function: trimmed as ScenePlan['dramatic_function'] });
        break;
      case 'characters':
        onUpdate({ characters_present: trimmed.split(',').map((s) => s.trim()).filter(Boolean) });
        break;
      case 'tension':
        const n = parseInt(trimmed, 10);
        if (!isNaN(n) && n >= 1 && n <= 5) onUpdate({ tension_level: n });
        break;
      case 'beat_count':
        const bc = parseInt(trimmed, 10);
        if (!isNaN(bc) && bc >= 0) {
          onUpdate({ beat_plan: { ...(sp.beat_plan || {}), estimated_beat_count: bc, key_beats: sp.beat_plan?.key_beats || [], notes: sp.beat_plan?.notes || '' } });
        }
        break;
    }
    setEditField(null);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
    if (e.key === 'Escape') { setEditField(null); }
  };

  const renderField = (field: string, display: React.ReactNode, value: string) => {
    if (editField === field) {
      return (
        <input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleKey}
          autoFocus
          style={inlineInput}
          placeholder="输入后按 Enter 确认"
        />
      );
    }
    return (
      <span
        style={{ cursor: 'pointer', borderBottom: '1px dashed transparent' }}
        onMouseEnter={(e) => { (e.target as HTMLElement).style.borderBottomColor = '#1976d2'; }}
        onMouseLeave={(e) => { (e.target as HTMLElement).style.borderBottomColor = 'transparent'; }}
        onDoubleClick={() => startEdit(field, value)}
        title="双击编辑"
      >
        {display}
      </span>
    );
  };

  return (
    <div style={sceneCard}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>S{sp.scene_global_number}</span>
            {renderField('dramatic_function',
              <span style={funcBadge(sp.dramatic_function)}>{sp.dramatic_function}</span>,
              sp.dramatic_function || '')
            }
            {sp.tension_level != null && renderField('tension',
              <span style={{ fontSize: 12, color: '#ff9800' }}>{'🔥'.repeat(sp.tension_level)}</span>,
              String(sp.tension_level)
            )}
          </div>
          <div style={{ fontSize: 12, color: '#777', marginTop: 2 }}>
            {sp.location.interior_exterior}.{' '}
            {renderField('location', sp.location.name, sp.location.name)} —{' '}
            {renderField('time_of_day', sp.time_of_day, sp.time_of_day)}
            {sp.location.set_description && (
              <span style={{ color: '#aaa' }}>
                {' '}({renderField('set_description', sp.location.set_description, sp.location.set_description)})
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: '#555', lineHeight: 1.4, marginTop: 4 }}>
            {renderField('synopsis', sp.synopsis || '(暂无概要，双击编辑)', sp.synopsis || '')}
          </div>
          <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
            出场: {renderField('characters',
              sp.characters_present?.length ? sp.characters_present.join(', ') : '(点击编辑)',
              sp.characters_present?.join(', ') || ''
            )}
          </div>
          {sp.beat_plan && (
            <div style={{ marginTop: 6, fontSize: 11, color: '#1976d2', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span>📋 {renderField('beat_count', `${sp.beat_plan.estimated_beat_count ?? '?'} beats`, String(sp.beat_plan.estimated_beat_count ?? 0))}</span>
              <span>🔑 {sp.beat_plan.key_beats?.length || 0} 关键</span>
              {sp.beat_plan.notes && <span style={{ color: '#888' }}>💡 {sp.beat_plan.notes}</span>}
            </div>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 12, color: '#ccc', padding: '2px 6px' }}
          title="删除场景"
        >
          🗑
        </button>
      </div>
    </div>
  );
};

// ============================== 概览（全量组合） ==============================

export const PlanPreview: React.FC<{ plan: AdaptationPlan }> = ({ plan }) => {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = async () => {
    const ok = await copyToClipboard(JSON.stringify(plan, null, 2));
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  return (
    <div style={{ padding: 24 }}>
      <PlanStatBar plan={plan} />
      <StrategySection plan={plan} />
      <ActsSection plan={plan} />
      <ScenesSection plan={plan} />
    </div>
  );
};

// ====== Sub-components ======

const SectionCard: React.FC<{ icon: string; title: string; span?: number; children: React.ReactNode }> =
  ({ icon, title, span = 1, children }) => (
    <div style={{ gridColumn: 'span ' + span, background: '#fff', border: '1px solid #e8e8e8', borderRadius: 6, padding: 20, marginBottom: 16 }}>
      <h4 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: '#333', borderBottom: '1px solid #f0f0f0', paddingBottom: 8 }}>{icon} {title}</h4>
      {children}
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
  return { fontSize: 9, padding: '2px 6px', borderRadius: 4, color: '#fff', background: colors[df] || '#9e9e9e', fontWeight: 600, cursor: 'pointer' };
};

const priorityBadge: React.CSSProperties = {
  fontSize: 9, padding: '2px 6px', borderRadius: 4, color: '#fff', fontWeight: 600, textTransform: 'uppercase',
};

const inlineInput: React.CSSProperties = {
  fontSize: 12,
  padding: '2px 6px',
  border: '1px solid #1976d2',
  borderRadius: 3,
  background: '#fff',
  outline: 'none',
};

const statRow: React.CSSProperties = {
  display: 'flex', gap: 24, padding: '12px 20px', background: '#fff', border: '1px solid #e8e8e8', borderRadius: 6, marginBottom: 16, justifyContent: 'center',
};
const statItem: React.CSSProperties = { textAlign: 'center', minWidth: 70 };
const statValue: React.CSSProperties = { fontSize: 22, fontWeight: 700, color: '#1976d2' };
const statLabel: React.CSSProperties = { fontSize: 11, color: '#888', marginTop: 2 };
const decisionCard: React.CSSProperties = { padding: '10px 14px', border: '1px solid #f0f0f0', borderRadius: 6, background: '#fafafa', marginBottom: 8 };
const charAdaptCard: React.CSSProperties = { padding: '10px 14px', border: '1px solid #f0f0f0', borderRadius: 6, background: '#fafafa' };
const actCard: React.CSSProperties = { padding: '12px 16px', border: '1px solid #e0e0e0', borderRadius: 6, background: '#fafafa' };
const actHeader: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4 };
const momentTag: React.CSSProperties = { fontSize: 11, padding: '2px 8px', background: '#fff3e0', borderRadius: 4, color: '#e65100' };
const sceneCard: React.CSSProperties = { padding: '10px 14px', border: '1px solid #f0f0f0', borderRadius: 6, background: '#fafafa' };
