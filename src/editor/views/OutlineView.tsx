// ============================================================================
// 大纲树视图 — 幕/场景树（两级导航）
// ============================================================================

import React from 'react';
import { useScriptStore, useEditorStore } from '@/store';

const DRAMATIC_FUNCTION_LABELS: Record<string, string> = {
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

export const OutlineView: React.FC = () => {
  const screenplay = useScriptStore((s) => s.screenplay);
  const expandedActs = useEditorStore((s) => s.expandedActs);
  const toggleAct = useEditorStore((s) => s.toggleAct);
  const expandedScenes = useEditorStore((s) => s.expandedScenes);
  const toggleScene = useEditorStore((s) => s.toggleScene);

  if (!screenplay) return null;

  const handleClickScene = (sceneGlobalNumber: number) => {
    toggleScene(sceneGlobalNumber);
    const el = document.getElementById(`scene-${sceneGlobalNumber}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
          {expandedActs.has(act.act_number) && act.scenes.map((scene) => {
            const isSceneExpanded = expandedScenes.has(scene.scene_global_number);
            const df = scene.dramatic_function;
            const dfLabel = df ? ((DRAMATIC_FUNCTION_LABELS as Record<string, string>)[df] || df) : '';

            return (
              <div
                key={scene.scene_global_number}
                onClick={() => handleClickScene(scene.scene_global_number)}
                style={{
                  padding: '5px 8px 5px 24px',
                  fontSize: 12,
                  color: '#555',
                  cursor: 'pointer',
                  borderRadius: 3,
                }}
              >
                <div style={{ fontWeight: 500, display: 'flex', justifyContent: 'space-between' }}>
                  <span>S{scene.scene_global_number} — {scene.scene_heading}</span>
                  <span style={{ fontSize: 9 }}>{isSceneExpanded ? '▲' : '▼'}</span>
                </div>
                <div style={{ color: '#999', fontSize: 10 }}>
                  {dfLabel}{dfLabel && scene.beats.length ? ' · ' : ''}
                  {scene.beats.length} beats
                  {scene.tension_level && ` · ${'🔥'.repeat(scene.tension_level)}`}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};
