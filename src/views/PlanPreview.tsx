// ============================================================================
// PlanPreview — 阶段2 改编规划可视化预览 + 可编辑场景/幕
// v0.6.0: ActsSection 和 ScenesSection 支持结构化编辑 + 场景重新生成
// ============================================================================

import React from 'react';
import { usePlanStore } from '@/store';
import type { AdaptationPlan, ScenePlan, ActPlan, ConversionConfig } from '@/schema/types';
import { copyToClipboard } from '@/shared/download';

// ============================== 常量 ==============================

const DF_OPTIONS = ['inciting_incident', 'plot_point', 'midpoint', 'climax', 'exposition', 'character_moment', 'action', 'transition', 'other'] as const;

const DF_LABELS: Record<string, string> = {
  inciting_incident: '激励事件',
  plot_point: '情节转折',
  midpoint: '中点转折',
  climax: '高潮',
  exposition: '铺垫',
  character_moment: '人物时刻',
  action: '动作',
  transition: '过渡',
  other: '其他',
};

const ACT_TYPE_OPTIONS = ['setup', 'confrontation', 'resolution', 'other'] as const;
const ACT_TYPE_LABELS: Record<string, string> = { setup: '建置', confrontation: '对抗', resolution: '解决', other: '其他' };

const IE_OPTIONS = ['INT', 'EXT', 'INT_EXT'] as const;

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

// ============================== 幕结构区块（可编辑） ==============================

export const ActsSection: React.FC<{ plan: AdaptationPlan; span?: number }> = ({ plan, span = 2 }) => {
  const updateAct = usePlanStore((s) => s.updateAct);
  const deleteAct = usePlanStore((s) => s.deleteAct);
  const insertAct = usePlanStore((s) => s.insertAct);
  const regenerateScenesFromActs = usePlanStore((s) => s.regenerateScenesFromActs);
  const [regenerating, setRegenerating] = React.useState(false);
  const [flashGreen, setFlashGreen] = React.useState(false);

  const handleRegenerateScenes = async () => {
    setRegenerating(true);
    try {
      await regenerateScenesFromActs();
      setFlashGreen(true);
      setTimeout(() => setFlashGreen(false), 800);
    } catch (e) {
      alert('重新生成失败: ' + (e as Error).message);
    } finally {
      setRegenerating(false);
    }
  };

  const handleAddAct = () => {
    const newAct: ActPlan = {
      act_number: plan.episode_plan.acts.length + 1,
      act_title: `第${plan.episode_plan.acts.length + 1}幕`,
      act_type: 'other',
      synopsis: '',
    };
    insertAct(plan.episode_plan.acts.length, newAct);
  };

  return (
    <SectionCard icon="📐" title={`幕结构 (${plan.episode_plan.total_acts} 幕)`} span={span}>
      <div style={{ fontSize: 11, color: '#999', marginBottom: 8 }}>
        双击字段可编辑 · 幕结构调整后请重新生成场景大纲
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {plan.episode_plan.acts.map((act) => (
          <EditableActCard
            key={act.act_number}
            act={act}
            onUpdate={(patch) => updateAct(act.act_number, patch)}
            onDelete={() => {
              if (confirm(`删除第${act.act_number}幕？相关场景也会被移除。`)) deleteAct(act.act_number);
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button onClick={handleAddAct} style={addBtn}>+ 添加幕</button>
        <button
          onClick={handleRegenerateScenes}
          disabled={regenerating}
          style={{ ...regenerateBtn, borderColor: flashGreen ? '#4caf50' : '#1976d2', background: flashGreen ? '#e8f5e9' : regenerateBtn.background }}
        >
          {regenerating ? '⏳ 生成中...' : '🔄 重新生成场景大纲'}
        </button>
      </div>
    </SectionCard>
  );
};

/** 可编辑的幕卡片 */
const EditableActCard: React.FC<{
  act: ActPlan;
  onUpdate: (patch: Partial<ActPlan>) => void;
  onDelete: () => void;
}> = ({ act, onUpdate, onDelete }) => {
  return (
    <div style={actCard}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>第{act.act_number}幕</span>
            <EditableField
              value={act.act_title || ''}
              placeholder="幕标题"
              onChange={(v) => onUpdate({ act_title: v })}
              style={{ fontWeight: 600, fontSize: 13, minWidth: 120 }}
            />
            <FieldDropdown
              value={act.act_type}
              options={[...ACT_TYPE_OPTIONS]}
              labels={ACT_TYPE_LABELS}
              onChange={(v) => onUpdate({ act_type: v as ActPlan['act_type'] })}
              style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4 }}
            />
          </div>
          <div style={{ fontSize: 12, color: '#555', lineHeight: 1.4 }}>
            <EditableField
              value={act.synopsis}
              placeholder="幕概要（双击编辑）"
              onChange={(v) => onUpdate({ synopsis: v })}
              isTextarea
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ marginTop: 6, display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 11, color: '#888' }}>
            <EditableField
              label="场景数"
              value={act.estimated_scene_count != null ? String(act.estimated_scene_count) : ''}
              placeholder="?"
              onChange={(v) => onUpdate({ estimated_scene_count: v ? parseInt(v) : undefined })}
              inputType="number"
              style={{ width: 40 }}
            />
            <EditableField
              label="时长(分)"
              value={act.estimated_duration_minutes != null ? String(act.estimated_duration_minutes) : ''}
              placeholder="?"
              onChange={(v) => onUpdate({ estimated_duration_minutes: v ? parseInt(v) : undefined })}
              inputType="number"
              style={{ width: 50 }}
            />
            <span>场景数: {act.estimated_scene_count ?? '?'} · 时长: {act.estimated_duration_minutes ?? '?'} min</span>
          </div>
          {act.key_moments && act.key_moments.length > 0 && (
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {act.key_moments.map((km, j) => (
                <span key={j} style={momentTag}>📍 {km.moment}</span>
              ))}
            </div>
          )}
        </div>
        <button onClick={onDelete} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 12, color: '#ccc' }} title="删除幕">
          🗑
        </button>
      </div>
    </div>
  );
};

// ============================== 场景大纲区块（可编辑） ==============================

export const ScenesSection: React.FC<{ plan: AdaptationPlan; span?: number }> = ({ plan, span = 2 }) => {
  const updateScenePlan = usePlanStore((s) => s.updateScenePlan);
  const deleteScenePlan = usePlanStore((s) => s.deleteScenePlan);
  const insertScenePlan = usePlanStore((s) => s.insertScenePlan);

  const handleAddScene = (afterIndex: number, actNumber: number) => {
    const newScene: ScenePlan = {
      scene_global_number: 0, // will be renumbered
      act_number: actNumber,
      scene_number: 0,
      location: { name: '新地点', interior_exterior: 'INT' },
      time_of_day: '白天',
      synopsis: '新场景概要',
      dramatic_function: 'other',
      characters_present: [],
    };
    insertScenePlan(afterIndex, newScene);
  };

  // Group scenes by act
  const scenesByAct = new Map<number, ScenePlan[]>();
  for (const sp of plan.scene_plan) {
    const list = scenesByAct.get(sp.act_number) || [];
    list.push(sp);
    scenesByAct.set(sp.act_number, list);
  }

  return (
    <SectionCard icon="🎞️" title={`场景大纲 (${plan.scene_plan.length} 场)`} span={span}>
      <div style={{ fontSize: 11, color: '#999', marginBottom: 8 }}>
        双击字段可编辑 · 下拉框可切换 · Enter 确认 / Esc 取消
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 600, overflow: 'auto' }}>
        {Array.from(scenesByAct.entries()).map(([actNum, scenes]) => (
          <div key={actNum}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#1976d2', padding: '4px 0', borderBottom: '1px solid #e8e8e8', marginBottom: 4 }}>
              第{actNum}幕 ({scenes.length} 场)
            </div>
            {scenes.map((sp, idx) => {
              const globalIdx = plan.scene_plan.indexOf(sp);
              return (
                <EditableSceneCardV2
                  key={sp.scene_global_number}
                  scenePlan={sp}
                  onUpdate={(patch) => updateScenePlan(sp.scene_global_number, patch)}
                  onDelete={() => {
                    if (confirm(`删除场景 S${sp.scene_global_number}？`)) deleteScenePlan(sp.scene_global_number);
                  }}
                  onAddAfter={() => handleAddScene(globalIdx + 1, sp.act_number)}
                />
              );
            })}
          </div>
        ))}
      </div>
    </SectionCard>
  );
};

/** 可编辑的场景卡片 v2 */
const EditableSceneCardV2: React.FC<{
  scenePlan: ScenePlan;
  onUpdate: (patch: Partial<ScenePlan>) => void;
  onDelete: () => void;
  onAddAfter: () => void;
}> = ({ scenePlan: sp, onUpdate, onDelete, onAddAfter }) => {
  const dfColors: Record<string, string> = {
    inciting_incident: '#e91e63', climax: '#f44336', exposition: '#2196f3',
    character_moment: '#4caf50', plot_point: '#9c27b0', midpoint: '#ff9800',
    transition: '#607d8b', action: '#ff5722', other: '#9e9e9e',
  };

  return (
    <div style={{
      padding: '14px 16px',
      border: '1px solid #e8e8e8',
      borderLeft: `3px solid ${dfColors[sp.dramatic_function] || '#9e9e9e'}`,
      borderRadius: 6,
      background: '#fafafa',
      marginBottom: 6,
      transition: 'box-shadow 0.15s',
    }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 6px rgba(0,0,0,0.08)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
    >
      {/* Top row: scene number + dramatic function badge + tension + actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontWeight: 700, fontSize: 13, color: '#333',
            background: '#f5f5f5', padding: '1px 8px', borderRadius: 4,
          }}>S{sp.scene_global_number}</span>

          <FieldDropdown
            value={sp.dramatic_function}
            options={[...DF_OPTIONS]}
            labels={DF_LABELS}
            onChange={(v) => onUpdate({ dramatic_function: v as ScenePlan['dramatic_function'] })}
            style={{
              fontSize: 10, padding: '2px 8px', borderRadius: 4, color: '#fff',
              background: dfColors[sp.dramatic_function] || '#9e9e9e', fontWeight: 600, cursor: 'pointer',
            }}
          />

          {sp.tension_level != null ? (
            <span style={{ fontSize: 12, letterSpacing: 1 }} title={`张力 ${sp.tension_level}/5`}>
              {'🔥'.repeat(sp.tension_level)}{'⚪'.repeat(5 - sp.tension_level)}
            </span>
          ) : (
            <EditableField
              value="" placeholder="张力1-5" onChange={(v) => { const n = parseInt(v); if (n >= 1 && n <= 5) onUpdate({ tension_level: n }); }}
              inputType="number" style={{ width: 30, fontSize: 11, color: '#ccc' }}
            />
          )}
        </div>

        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={onAddAfter} style={iconBtnSmall} title="在下方添加场景">＋</button>
          <button onClick={onDelete} style={iconBtnSmall} title="删除场景">🗑</button>
        </div>
      </div>

      {/* Location line */}
      <div style={{
        fontSize: 12, color: '#666', marginBottom: 6,
        display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
        padding: '4px 8px', background: '#fff', borderRadius: 4, border: '1px solid #f0f0f0',
      }}>
        <FieldDropdown
          value={sp.location.interior_exterior}
          options={[...IE_OPTIONS]}
          labels={{ INT: '内景', EXT: '外景', INT_EXT: '内外' }}
          onChange={(v) => onUpdate({ location: { ...sp.location, interior_exterior: v as 'INT' | 'EXT' | 'INT_EXT' } })}
          style={{
            fontSize: 10, padding: '1px 6px', borderRadius: 3,
            background: sp.location.interior_exterior === 'INT' ? '#e3f2fd' : sp.location.interior_exterior === 'EXT' ? '#fff3e0' : '#f3e5f5',
            color: sp.location.interior_exterior === 'INT' ? '#1565c0' : sp.location.interior_exterior === 'EXT' ? '#e65100' : '#7b1fa2',
            fontWeight: 600, cursor: 'pointer',
          }}
        />
        <EditableField
          value={sp.location.name} placeholder="地点名"
          onChange={(v) => onUpdate({ location: { ...sp.location, name: v } })}
          style={{ fontWeight: 600, color: '#333' }}
        />
        <span style={{ color: '#ccc' }}>·</span>
        <EditableField
          value={sp.time_of_day} placeholder="时间"
          onChange={(v) => onUpdate({ time_of_day: v })}
          style={{ width: 60, color: '#666' }}
        />
        {sp.location.set_description != null && (
          <EditableField
            value={sp.location.set_description || ''} placeholder="布景"
            onChange={(v) => onUpdate({ location: { ...sp.location, set_description: v || undefined } })}
            style={{ color: '#aaa', fontSize: 11 }}
            prefix="(" suffix=")"
          />
        )}
      </div>

      {/* Synopsis */}
      <div style={{ fontSize: 13, color: '#444', lineHeight: 1.5, marginBottom: 6 }}>
        <EditableField
          value={sp.synopsis} placeholder="场景概要（双击编辑）"
          onChange={(v) => onUpdate({ synopsis: v })}
          isTextarea
          style={{ width: '100%' }}
        />
      </div>

      {/* Characters */}
      <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>
        <span style={{ marginRight: 4 }}>👤</span>
        <EditableField
          value={sp.characters_present?.join(', ') || ''}
          placeholder="角色ID，逗号分隔"
          onChange={(v) => onUpdate({ characters_present: v ? v.split(',').map(s => s.trim()).filter(Boolean) : undefined })}
          style={{ minWidth: 100 }}
        />
      </div>

      {/* Beat plan info */}
      {sp.beat_plan && (
        <div style={{
          marginTop: 4, padding: '6px 8px', background: '#f8f9ff',
          borderRadius: 4, border: '1px solid #e3e8f5',
          fontSize: 11, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        }}>
          <span style={{ color: '#1976d2', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            📋
            <EditableField
              value={sp.beat_plan.estimated_beat_count != null ? String(sp.beat_plan.estimated_beat_count) : ''}
              placeholder="?" onChange={(v) => onUpdate({ beat_plan: { ...(sp.beat_plan || { key_beats: [], notes: '' }), estimated_beat_count: parseInt(v) || undefined } })}
              inputType="number" style={{ width: 30 }}
            />
            beats
          </span>
          <span style={{ color: '#888' }}>· 🔑 {sp.beat_plan.key_beats?.length || 0} 关键节拍</span>
          <EditableField
            value={sp.beat_plan.notes || ''}
            placeholder="备注..." onChange={(v) => onUpdate({ beat_plan: { ...(sp.beat_plan || { key_beats: [] }), notes: v } })}
            style={{ color: '#999', fontStyle: 'italic', minWidth: 80 }}
          />
        </div>
      )}
    </div>
  );
};

// ============================== 通用可编辑组件 ==============================

/** 可编辑文本字段 — 双击编辑，Enter 确认，Esc 取消 */
const EditableField: React.FC<{
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
  label?: string;
  style?: React.CSSProperties;
  inputType?: string;
  isTextarea?: boolean;
  prefix?: string;
  suffix?: string;
}> = ({ value, placeholder, onChange, label, style, inputType, isTextarea, prefix, suffix }) => {
  const [editing, setEditing] = React.useState(false);
  const [text, setText] = React.useState(value);
  const inputRef = React.useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  React.useEffect(() => { setText(value); }, [value]);

  const commit = () => {
    setEditing(false);
    if (text !== value) onChange(text);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (isTextarea && e.key === 'Enter' && e.shiftKey) return; // allow shift+enter newline
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { setText(value); setEditing(false); }
  };

  if (editing) {
    if (isTextarea) {
      return (
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKey}
          style={{ ...inlineInput, ...style, width: style?.width || '100%', minHeight: 32 }}
          placeholder={placeholder}
        />
      );
    }
    return (
      <input
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKey}
        type={inputType || 'text'}
        style={{ ...inlineInput, ...style }}
        placeholder={placeholder}
      />
    );
  }

  const displayText = value || placeholder;
  const showPlaceholder = !value;

  return (
    <span
      style={{
        cursor: 'pointer',
        borderBottom: '1px dashed transparent',
        color: showPlaceholder ? '#ccc' : undefined,
        ...style,
      }}
      onMouseEnter={(e) => { (e.target as HTMLElement).style.borderBottomColor = '#1976d2'; }}
      onMouseLeave={(e) => { (e.target as HTMLElement).style.borderBottomColor = 'transparent'; }}
      onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}
      title="双击编辑"
    >
      {label && <span style={{ color: '#aaa', marginRight: 2 }}>{label}:</span>}
      {prefix}{displayText}{suffix}
    </span>
  );
};

/** 可编辑下拉选择器 */
const FieldDropdown: React.FC<{
  value: string;
  options: readonly string[];
  labels: Record<string, string>;
  onChange: (v: string) => void;
  style?: React.CSSProperties;
}> = ({ value, options, labels, onChange, style }) => {
  const [open, setOpen] = React.useState(false);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <span
        onClick={() => setOpen(!open)}
        style={{ cursor: 'pointer', ...style }}
        title="点击切换"
      >
        {labels[value] || value}
      </span>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, zIndex: 100,
          background: '#fff', border: '1px solid #e0e0e0', borderRadius: 4,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)', padding: 4, minWidth: 120,
        }}>
          {options.map(opt => (
            <div
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              style={{
                padding: '4px 8px', cursor: 'pointer', borderRadius: 3,
                background: opt === value ? '#e3f2fd' : 'transparent',
                fontWeight: opt === value ? 600 : 400,
                fontSize: 12,
              }}
            >
              {labels[opt] || opt}
            </div>
          ))}
        </div>
      )}
      {open && <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setOpen(false)} />}
    </div>
  );
};

// ============================== 概览 ==============================

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
  return { fontSize: 10, padding: '2px 8px', borderRadius: 4, color: '#fff', background: colors[df] || '#9e9e9e', fontWeight: 600, cursor: 'pointer' };
};

const priorityBadge: React.CSSProperties = {
  fontSize: 9, padding: '2px 6px', borderRadius: 4, color: '#fff', fontWeight: 600, textTransform: 'uppercase',
};

const inlineInput: React.CSSProperties = {
  fontSize: 12, padding: '2px 6px', border: '1px solid #1976d2', borderRadius: 3, background: '#fff', outline: 'none',
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
const momentTag: React.CSSProperties = { fontSize: 11, padding: '2px 8px', background: '#fff3e0', borderRadius: 4, color: '#e65100' };
const sceneCard: React.CSSProperties = { padding: '10px 14px', border: '1px solid #f0f0f0', borderRadius: 6, background: '#fafafa' };
const iconBtnSmall: React.CSSProperties = { background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 10, color: '#bbb', padding: '2px 4px' };
const addBtn: React.CSSProperties = { padding: '6px 14px', border: '1px dashed #1976d2', borderRadius: 6, background: 'transparent', cursor: 'pointer', fontSize: 12, color: '#1976d2' };
const regenerateBtn: React.CSSProperties = { padding: '6px 14px', border: '1px solid #1976d2', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 12, color: '#1976d2', fontWeight: 500 };
