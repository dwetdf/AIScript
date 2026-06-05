// ============================================================================
// 大纲树视图 — 幕/场景树
// ============================================================================

import React from 'react';
import { useScriptStore, useEditorStore } from '@/store';

export const OutlineView: React.FC = () => {
  const screenplay = useScriptStore((s) => s.screenplay);
  const selectedBeatId = useEditorStore((s) => s.selectedBeatId);
  const setSelectedBeatId = useEditorStore((s) => s.setSelectedBeatId);
  const expandedActs = useEditorStore((s) => s.expandedActs);
  const toggleAct = useEditorStore((s) => s.toggleAct);

  if (!screenplay) return null;

  const handleClickBeat = (beatId: string) => {
    setSelectedBeatId(beatId);
    // Scroll the beat into view
    const el = document.getElementById(`beat-${beatId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div style={{ padding: 8 }}>
      <h4 style={{ fontSize: 13, color: '#888', margin: '0 0 8px 8px' }}>大纲</h4>
      {screenplay.acts.map((act) => (
        <div key={act.act_number}>
          <div
            onClick={() => toggleAct(act.act_number)}
            style={{
              padding: '6px 8px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 13,
              borderRadius: 4,
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>{expandedActs.has(act.act_number) ? '▼' : '▶'} {act.act_title || `第${act.act_number}幕`}</span>
            <span style={{ color: '#999', fontSize: 11 }}>{act.scenes.length} 场</span>
          </div>
          {expandedActs.has(act.act_number) && act.scenes.map((scene) => (
            <div key={scene.scene_global_number} style={{ paddingLeft: 16 }}>
              <div style={{
                padding: '4px 8px',
                fontSize: 12,
                color: '#555',
                cursor: 'pointer',
                borderRadius: 3,
              }}>
                <div style={{ fontWeight: 500 }}>S{scene.scene_global_number} — {scene.scene_heading}</div>
                <div style={{ color: '#999', fontSize: 10 }}>
                  {scene.dramatic_function} · {scene.beats.length} beats
                  {scene.tension_level && ` · 张力 ${'🔥'.repeat(scene.tension_level)}`}
                </div>
                {scene.beats.slice(0, 5).map((beat) => (
                  <div
                    key={beat.beat_id}
                    onClick={() => handleClickBeat(beat.beat_id)}
                    style={{
                      padding: '2px 4px',
                      fontSize: 10,
                      cursor: 'pointer',
                      marginLeft: 8,
                      borderRadius: 2,
                      background: selectedBeatId === beat.beat_id ? '#e3f2fd' : 'transparent',
                      color: ('dialogue_text' in beat || 'parenthetical_text' in beat) ? '#1565c0' : '#666',
                    }}
                  >
                    {beat.beat_id.replace('E1A', '')} {getBeatPreview(beat)}
                  </div>
                ))}
                {scene.beats.length > 5 && (
                  <div style={{ padding: '2px 4px', fontSize: 10, color: '#999', marginLeft: 8 }}>
                    ... 还有 {scene.beats.length - 5} 个 beat
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

function getBeatPreview(beat: import('../../schema/types').Beat): string {
  if ('dialogue_text' in beat) return (beat.dialogue_text || '').substring(0, 20);
  if ('action_text' in beat) return (beat.action_text || '').substring(0, 20);
  if ('transition_type' in beat) return beat.transition_type;
  if ('insert_description' in beat) return '【插入】';
  if ('title_card_text' in beat) return '【字幕】';
  if ('flashback_label' in beat) return '【闪回】';
  return '';
}
