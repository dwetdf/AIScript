// ============================================================================
// PlanPrintView — 改编规划打印视图
// 渲染 AdaptationPlan 数据的干净 HTML，屏幕隐藏，仅 @media print 时可见
// ============================================================================

import React from 'react';
import { usePlanStore } from '../store';
import type { AdaptationPlan } from '@/schema/types';

export const PlanPrintView: React.FC = () => {
  const plan = usePlanStore((s) => s.plan);
  if (!plan) return null;

  const { adaptation_strategy: strategy, episode_plan, scene_plan, characters_draft } = plan;
  const acts = episode_plan.acts;

  return (
    <div id="plan-print-view" style={{ display: 'none' }}>
      {/* 标题 */}
      <div style={{ textAlign: 'center', marginBottom: '2cm' }}>
        <h1>改编规划</h1>
        <p style={{ fontSize: 11, color: '#888' }}>
          生成于 {new Date(plan.generated_at ?? '').toLocaleDateString('zh-CN')}
        </p>
      </div>

      {/* 统计条 */}
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', padding: 16, background: '#f9f9f9', borderRadius: 6, marginBottom: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#1976d2' }}>{acts.length}</div>
          <div style={{ fontSize: 11, color: '#888' }}>幕</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#1976d2' }}>{scene_plan.length}</div>
          <div style={{ fontSize: 11, color: '#888' }}>场景</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#1976d2' }}>{characters_draft?.length ?? 0}</div>
          <div style={{ fontSize: 11, color: '#888' }}>人物</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#1976d2' }}>{strategy.target_medium}</div>
          <div style={{ fontSize: 11, color: '#888' }}>目标媒介</div>
        </div>
      </div>

      {/* 改编策略 */}
      <h2>改编策略</h2>
      <div style={{ padding: 10, borderLeft: '3px solid #1976d2', background: '#fafafa', marginBottom: 8 }}>
        <strong>基调映射：</strong>{strategy.tone_adaptation.source_tone} → {strategy.tone_adaptation.target_tone}
        {strategy.tone_adaptation.notes ? `（${strategy.tone_adaptation.notes}）` : ''}
      </div>
      {strategy.externalization_strategy && (
        <div style={{ padding: 10, borderLeft: '3px solid #ff9800', background: '#fafafa', marginBottom: 8 }}>
          <strong>外化策略：</strong>{strategy.externalization_strategy}
        </div>
      )}
      {strategy.pacing_strategy && (
        <div style={{ padding: 10, borderLeft: '3px solid #4caf50', background: '#fafafa', marginBottom: 8 }}>
          <strong>节奏规划：</strong>{strategy.pacing_strategy.overall_pacing} · 高张力比 {strategy.pacing_strategy.high_tension_ratio}
        </div>
      )}

      {/* 结构决策 */}
      {strategy.structural_decisions.length > 0 && (
        <>
          <h2>结构改编决策</h2>
          {strategy.structural_decisions.map((d, i) => (
            <div key={i} style={{ padding: '8px 12px', marginBottom: 6, borderLeft: '3px solid #2196f3', background: '#fafafa' }}>
              <strong>{d.decision}</strong>
              <span style={{ fontSize: 10, marginLeft: 8, padding: '2px 6px', borderRadius: 3, color: '#fff', background: d.impact === 'high' ? '#f44336' : d.impact === 'medium' ? '#ff9800' : '#4caf50' }}>
                {d.impact}
              </span>
              <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>{d.rationale}</div>
            </div>
          ))}
        </>
      )}

      {/* 人物改编决策 */}
      {(strategy.character_adaptations?.length ?? 0) > 0 && (
        <>
          <h2 className="page-break-before">人物改编决策</h2>
          {(strategy.character_adaptations ?? []).map((ca, i) => (
            <div key={i} style={{ padding: '6px 10px', marginBottom: 4, background: '#fafafa', borderRadius: 4 }}>
              <strong>{ca.character_id}</strong>
              <span style={{ display: 'inline-block', padding: '1px 6px', borderRadius: 3, color: '#fff', fontSize: 10, marginLeft: 8, background: ca.action === 'keep' ? '#4caf50' : ca.action === 'cut' ? '#f44336' : ca.action === 'merge' ? '#ff9800' : '#2196f3' }}>
                {ca.action}
              </span>
              {ca.notes && <span style={{ fontSize: 11, color: '#888', marginLeft: 8 }}>{ca.notes}</span>}
            </div>
          ))}
        </>
      )}

      {/* 压缩规则 */}
      {(strategy.compression_rules?.length ?? 0) > 0 && (
        <>
          <h2>叙述压缩规则</h2>
          {(strategy.compression_rules ?? []).map((cr, i) => (
            <div key={i} style={{ padding: '6px 10px', marginBottom: 4, fontSize: 12 }}>
              <span style={{ display: 'inline-block', padding: '1px 6px', borderRadius: 3, fontSize: 9, background: '#e0e0e0', marginRight: 6 }}>
                {cr.applies_to}
              </span>
              {cr.rule}
              {cr.priority ? <span style={{ fontSize: 10, color: '#888', marginLeft: 6 }}>[{cr.priority}]</span> : ''}
            </div>
          ))}
        </>
      )}

      {/* 幕结构 */}
      <h2 className="page-break-before">幕结构</h2>
      {acts.map((act) => {
        const actScenes = scene_plan.filter(sp => sp.act_number === act.act_number);
        const actLabel = act.act_type === 'setup' ? '建置' : act.act_type === 'confrontation' ? '对抗' : act.act_type === 'resolution' ? '解决' : '其他';
        return (
          <div key={act.act_number} style={{ padding: '10px 14px', marginBottom: 10, background: '#fafafa', borderRadius: 4, borderLeft: '3px solid #673ab7' }}>
            <h3>第 {act.act_number} 幕：{act.act_title} <span style={{ fontSize: 10, color: '#888', fontWeight: 400 }}>({actLabel} · {act.estimated_scene_count ?? actScenes.length} 场景 · ~{act.estimated_duration_minutes ?? '?'} 分钟)</span></h3>
            <p style={{ fontSize: 12, color: '#555' }}>{act.synopsis}</p>
            {act.source_chapters?.length ? <div style={{ fontSize: 10, color: '#999' }}>改编自第 {act.source_chapters.join(', ')} 章</div> : null}
          </div>
        );
      })}

      {/* 场景大纲 */}
      <h2 className="page-break-before">场景大纲（{scene_plan.length} 场）</h2>
      {scene_plan.map((sp) => {
        const dfLabels: Record<string, string> = {
          exposition: '说明', inciting_incident: '激励事件', rising_action: '上升', midpoint: '中点', climax: '高潮', falling_action: '下落', resolution: '结局', other: '其他',
        };
        return (
          <div key={sp.scene_global_number} style={{ padding: '10px 14px', marginBottom: 8, background: '#fafafa', borderRadius: 4, borderLeft: '3px solid #4caf50' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>场景 {sp.scene_global_number}</strong>
              <span style={{ fontSize: 10 }}>
                <span style={{ color: '#888', marginRight: 8 }}>第 {sp.act_number} 幕</span>
                <span style={{ display: 'inline-block', padding: '1px 6px', borderRadius: 3, color: '#fff', fontSize: 9, background: '#2196f3' }}>
                  {dfLabels[sp.dramatic_function ?? 'other'] ?? sp.dramatic_function}
                </span>
              </span>
            </div>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>
              {sp.location.interior_exterior}. {sp.location.name} — {sp.time_of_day}
              {sp.location.set_description ? `（${sp.location.set_description}）` : ''}
            </div>
            <p style={{ fontSize: 12, color: '#555', margin: '4px 0' }}>{sp.synopsis}</p>
            <div style={{ fontSize: 10, color: '#999' }}>
              张力: {'⭐'.repeat(sp.tension_level ?? 0)} · {sp.characters_present?.join(', ') ?? ''}
              {sp.beat_plan?.estimated_beat_count ? ` · ~${sp.beat_plan.estimated_beat_count} beats` : ''}
            </div>
          </div>
        );
      })}

      {/* 尾页 */}
      <div className="page-break-before" style={{ textAlign: 'center', marginTop: '30%' }}>
        <p>— 改编规划结束 —</p>
        <p style={{ fontSize: 9, color: '#999' }}>本规划由 AI 辅助生成 · 初稿</p>
      </div>
    </div>
  );
};
