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
  const regenerateScene = useScriptStore((s) => s.regenerateScene);
  const regeneratingScenes = useEditorStore((s) => s.regeneratingSceneNumbers);
  const isRegenerating = regeneratingScenes.has(scene.scene_global_number);

  const [showRegenModal, setShowRegenModal] = React.useState(false);
  const [regenMode, setRegenMode] = React.useState<'improve' | 'rewrite'>('improve');
  const [regenError, setRegenError] = React.useState<string | null>(null);
  const [flashGreen, setFlashGreen] = React.useState(false);

  const handleAddBeat = () => {
    const newBeat = createEmptyBeat(scene.scene_global_number);
    insertBeat(scene.scene_global_number, scene.beats.length, newBeat);
    setEditingBeatId(newBeat.beat_id);
  };

  const handleRegenerate = async () => {
    setShowRegenModal(false);
    setRegenError(null);
    try {
      await regenerateScene(scene.scene_global_number, regenMode);
      setFlashGreen(true);
      setTimeout(() => setFlashGreen(false), 800);
    } catch (e: unknown) {
      setRegenError((e as Error).message || '生成失败');
    }
  };

  return (
    <div
      id={`scene-${scene.scene_global_number}`}
      style={{
        marginBottom: 12,
        border: flashGreen ? '2px solid #4caf50' : '1px solid #e0e0e0',
        borderRadius: 4,
        overflow: 'hidden',
        transition: 'border-color 0.4s, box-shadow 0.4s',
        boxShadow: flashGreen ? '0 0 12px rgba(76, 175, 80, 0.3)' : 'none',
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
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: '#999' }}>S{scene.scene_global_number}</span>
          <strong>{scene.scene_heading}</strong>
          {scene.scene_heading_override && (
            <span style={{ fontSize: 10, color: '#e65100' }}>已修改</span>
          )}
          {/* Regenerate button */}
          <button
            onClick={(e) => { e.stopPropagation(); setShowRegenModal(true); }}
            disabled={isRegenerating}
            style={{
              fontSize: 11, padding: '2px 8px', border: '1px solid #ccc',
              borderRadius: 4, background: '#fff', cursor: isRegenerating ? 'wait' : 'pointer',
              color: isRegenerating ? '#999' : '#333', whiteSpace: 'nowrap',
            }}
          >
            {isRegenerating ? '⏳ 生成中...' : '🔄 AI 重新生成'}
          </button>
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

      {/* Error toast */}
      {regenError && (
        <div style={{
          padding: '8px 16px', background: '#ffebee', color: '#c62828',
          fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>生成失败: {regenError}</span>
          <button onClick={() => setRegenError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>✕</button>
        </div>
      )}

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
          {isRegenerating ? (
            <div style={{ padding: 16 }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} style={{
                  height: 24, background: '#f0f0f0', borderRadius: 3,
                  margin: '4px 0', width: `${70 + Math.random() * 30}%`,
                  animation: 'pulse 1.5s ease-in-out infinite',
                }} />
              ))}
              <div style={{ textAlign: 'center', fontSize: 12, color: '#999', marginTop: 8 }}>
                AI 正在生成场景 {scene.scene_global_number} 的内容...
              </div>
            </div>
          ) : scene.beats.length === 0 ? (
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
                totalBeats={scene.beats.length}
                onClick={() => setSelectedBeatId(beat.beat_id)}
              />
            ))
          )}
          {!isRegenerating && (
            <div style={{ textAlign: 'center', paddingTop: 8 }}>
              <button
                style={{
                  padding: '4px 16px', border: '1px dashed #ccc', borderRadius: 4,
                  background: 'transparent', cursor: 'pointer', fontSize: 12, color: '#999',
                }}
                onClick={handleAddBeat}
              >
                + 添加 Beat
              </button>
            </div>
          )}
        </div>
      )}

      {/* Regenerate Modal */}
      {showRegenModal && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowRegenModal(false)}
        >
          <div
            style={{
              background: '#fff', borderRadius: 8, padding: 24, maxWidth: 420, width: '90%',
              boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>
              重新生成 S{scene.scene_global_number} 的场景内容
            </h3>
            <p style={{ fontSize: 13, color: '#666', margin: '0 0 16px' }}>
              这将替换当前 {scene.beats.length} 个 beats。
            </p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', cursor: 'pointer', fontSize: 13 }}>
                <input
                  type="radio" name="regenMode" value="improve"
                  checked={regenMode === 'improve'}
                  onChange={() => setRegenMode('improve')}
                />
                <div>
                  <div style={{ fontWeight: 600 }}>优化改进</div>
                  <div style={{ color: '#888', fontSize: 11 }}>基于现有内容微调改进，保持整体结构</div>
                </div>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', cursor: 'pointer', fontSize: 13 }}>
                <input
                  type="radio" name="regenMode" value="rewrite"
                  checked={regenMode === 'rewrite'}
                  onChange={() => setRegenMode('rewrite')}
                />
                <div>
                  <div style={{ fontWeight: 600 }}>完全重写</div>
                  <div style={{ color: '#888', fontSize: 11 }}>AI 从零重新创作此场景</div>
                </div>
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                onClick={() => setShowRegenModal(false)}
                style={{ padding: '6px 16px', border: '1px solid #ccc', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 13 }}
              >
                取消
              </button>
              <button
                onClick={handleRegenerate}
                style={{ padding: '6px 16px', border: 'none', borderRadius: 4, background: '#1976d2', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
              >
                开始生成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function createEmptyBeat(sceneGlobal: number): Beat {
  const tempId = `_new_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  return {
    beat_id: tempId,
    beat_type: 'action',
    action_text: '[新 beat — 双击编辑]',
    is_ai_generated: true,
    estimated_duration_seconds: 10,
  } as Beat;
}
