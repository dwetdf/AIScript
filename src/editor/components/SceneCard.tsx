// ============================================================================
// SceneCard — 场景卡片组件
// ============================================================================

import React from 'react';
import { useEditorStore, useScriptStore } from '@/store';
import { BeatLine } from './BeatLine';
import type { Scene, Beat } from '@/schema/types';

interface Props {
  scene: Scene;
  viewMode: 'edit' | 'source_compare' | 'analysis';
}

export const SceneCard: React.FC<Props> = ({ scene, viewMode }) => {
  const expandedScenes = useEditorStore((s) => s.expandedScenes);
  const toggleScene = useEditorStore((s) => s.toggleScene);
  const isExpanded = expandedScenes.has(scene.scene_global_number);
  const setSelectedBeatId = useEditorStore((s) => s.setSelectedBeatId);
  const setEditingBeatId = useEditorStore((s) => s.setEditingBeatId);
  const insertBeat = useScriptStore((s) => s.insertBeat);

  const handleAddBeat = () => {
    // 找到当前场景的 act_number
    const newBeat = createEmptyBeat(scene.scene_global_number);
    // 追加到 beat 列表末尾
    insertBeat(scene.scene_global_number, scene.beats.length, newBeat);
    // 自动进入编辑模式
    setEditingBeatId(newBeat.beat_id);
  };

  return (
    <div
      id={`scene-${scene.scene_global_number}`}
      style={{
        marginBottom: 12,
        border: '1px solid #e0e0e0',
        borderRadius: 4,
        overflow: 'hidden',
      }}
    >
      {/* Scene Header */}
      <div
        onClick={() => toggleScene(scene.scene_global_number)}
        style={{
          cursor: 'pointer',
          padding: '10px 16px',
          background: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: isExpanded ? '1px solid #eee' : 'none',
        }}
      >
        <div>
          <span style={{ fontSize: 11, color: '#999', marginRight: 8 }}>S{scene.scene_global_number}</span>
          <strong>{scene.scene_heading}</strong>
          {scene.scene_heading_override && (
            <span style={{ fontSize: 10, color: '#e65100', marginLeft: 8 }}>已修改</span>
          )}
        </div>
        <div style={{ fontSize: 11, color: '#888', display: 'flex', gap: 12, alignItems: 'center' }}>
          <span>{scene.dramatic_function}</span>
          {scene.tension_level && <span>{'🔥'.repeat(scene.tension_level)}</span>}
          <span>{scene.beats.length} beats</span>
          {scene.estimated_duration_seconds && (
            <span>{Math.round(scene.estimated_duration_seconds / 60)} min</span>
          )}
          <span>{isExpanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Scene Synopsis */}
      {isExpanded && scene.synopsis && (
        <div style={{ padding: '6px 16px', fontSize: 12, color: '#666', background: '#fafafa', borderBottom: '1px solid #eee' }}>
          {scene.synopsis}
        </div>
      )}

      {/* Scene Characters */}
      {isExpanded && scene.characters_present && scene.characters_present.length > 0 && (
        <div style={{ padding: '4px 16px', fontSize: 11, color: '#888', background: '#fafafa', borderBottom: '1px solid #eee' }}>
          出场：{scene.characters_present.join(' · ')}
        </div>
      )}

      {/* Beats */}
      {isExpanded && (
        <div style={{ padding: '0 16px 8px' }}>
          {scene.beats.length === 0 ? (
            <div style={{ padding: 16, textAlign: 'center', color: '#ccc', fontSize: 13 }}>
              (空场景 — 尚无 beats)
            </div>
          ) : (
            scene.beats.map((beat, idx) => (
              <BeatLine
                key={beat.beat_id}
                beat={beat}
                index={idx}
                sceneGlobalNumber={scene.scene_global_number}
                onClick={() => setSelectedBeatId(beat.beat_id)}
              />
            ))
          )}
          {/* Add Beat button */}
          <div style={{ textAlign: 'center', paddingTop: 8 }}>
            <button
              style={{
                padding: '4px 16px',
                border: '1px dashed #ccc',
                borderRadius: 4,
                background: 'transparent',
                cursor: 'pointer',
                fontSize: 12,
                color: '#999',
              }}
              onClick={handleAddBeat}
            >
              + 添加 Beat
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

function createEmptyBeat(sceneGlobal: number): Beat {
  // 占位ID，insertBeat 后会由 renumberBeats 自动重新编号
  const tempId = `_new_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  return {
    beat_id: tempId,
    beat_type: 'action',
    action_text: '[新 beat — 双击编辑]',
    is_ai_generated: true,
    estimated_duration_seconds: 10,
  } as Beat;
}
