// ============================================================================
// 改编规划查看视图 — PlanView
// ============================================================================

import React from 'react';
import { usePlanStore } from '@/store';

export const PlanView: React.FC = () => {
  const plan = usePlanStore((s) => s.plan);

  if (!plan) {
    return <div style={{ padding: 48, textAlign: 'center', color: '#888' }}>暂无改编规划数据</div>;
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>改编规划</h2>

      {/* 改编策略 */}
      <Section title="改编策略">
        <p><strong>基调：</strong>{plan.adaptation_strategy.tone_adaptation.target_tone}（原著：{plan.adaptation_strategy.tone_adaptation.source_tone}）</p>
        <p><strong>媒介：</strong>{plan.adaptation_strategy.target_medium}</p>
        <p><strong>外化策略：</strong>{plan.adaptation_strategy.externalization_strategy || '暂无'}</p>
        <p><strong>压缩规则：</strong>{(plan.adaptation_strategy.compression_rules || []).length} 条</p>
      </Section>

      {/* 结构决策 */}
      <Section title="结构改编决策">
        {(plan.adaptation_strategy.structural_decisions || []).map((d, i) => (
          <div key={i} style={cardStyle}>
            <strong>{d.decision}</strong>
            <p style={{ color: '#666', margin: '4px 0' }}>{d.rationale}</p>
            <span style={{ fontSize: 11, color: '#999' }}>影响程度：{d.impact}</span>
          </div>
        ))}
      </Section>

      {/* 幕规划 */}
      <Section title="幕结构">
        {plan.episode_plan.acts.map((act) => (
          <div key={act.act_number} style={cardStyle}>
            <h4>{act.act_title || `第${act.act_number}幕`} ({act.act_type})</h4>
            <p>{act.synopsis}</p>
            <span style={{ fontSize: 11, color: '#999' }}>
              预估 {act.estimated_scene_count} 场景 · {act.estimated_duration_minutes} 分钟
            </span>
          </div>
        ))}
      </Section>

      {/* 场景列表 */}
      <Section title={`场景大纲 (${plan.scene_plan.length} 场)`}>
        {plan.scene_plan.map((sp) => (
          <div key={sp.scene_global_number} style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>S{sp.scene_global_number} — {sp.dramatic_function}</strong>
              <span style={{ fontSize: 11, color: '#999' }}>
                {sp.act_number}·{sp.scene_number} | 张力 {sp.tension_level || '?'}
              </span>
            </div>
            <p style={{ margin: '4px 0', color: '#555' }}>{sp.synopsis}</p>
            <span style={{ fontSize: 11, color: '#888' }}>
              {`${sp.location.interior_exterior}. ${sp.location.name} — ${sp.time_of_day}`}
            </span>
            {sp.beat_plan && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                Beat 规划：{sp.beat_plan.estimated_beat_count} 个 · {sp.beat_plan.key_beats?.length || 0} 个关键节拍
              </div>
            )}
          </div>
        ))}
      </Section>
    </div>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ marginBottom: 24 }}>
    <h3 style={{ borderBottom: '2px solid #1976d2', paddingBottom: 4 }}>{title}</h3>
    {children}
  </div>
);

const cardStyle: React.CSSProperties = {
  border: '1px solid #e0e0e0',
  borderRadius: 6,
  padding: 10,
  marginBottom: 8,
  background: '#fafafa',
};
