// ============================================================================
// ActPanel — 幕面板组件
// ============================================================================

import React from 'react';
import { useEditorStore } from '@/store';
import { SceneCard } from './SceneCard';
import type { Act } from '../../schema/types';

interface Props {
  act: Act;
  viewMode: 'edit' | 'source_compare' | 'analysis';
}

export const ActPanel: React.FC<Props> = ({ act, viewMode }) => {
  const expandedActs = useEditorStore((s) => s.expandedActs);
  const toggleAct = useEditorStore((s) => s.toggleAct);
  const isExpanded = expandedActs.has(act.act_number);

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Act Header */}
      <div
        onClick={() => toggleAct(act.act_number)}
        style={{
          cursor: 'pointer',
          padding: '10px 16px',
          background: '#f5f5f5',
          borderBottom: '2px solid #333',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h2 style={{ margin: 0, fontSize: 20 }}>
          {isExpanded ? '▼' : '▶'} {act.act_title || `第${act.act_number}幕`}
        </h2>
        <span style={{ fontSize: 13, color: '#888' }}>
          {act.act_type?.toUpperCase()} · {act.scenes.length} SCENES
        </span>
      </div>

      {/* Act Synopsis */}
      {isExpanded && act.synopsis && (
        <div style={{ padding: '8px 16px', fontSize: 13, color: '#666', fontStyle: 'italic', background: '#fafafa' }}>
          {act.synopsis}
        </div>
      )}

      {/* Scenes */}
      {isExpanded && act.scenes.map((scene) => (
        <SceneCard key={scene.scene_global_number} scene={scene} viewMode={viewMode} />
      ))}
    </div>
  );
};
