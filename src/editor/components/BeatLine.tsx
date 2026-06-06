// ============================================================================
// BeatLine — 核心组件：单行 beat 编辑器 (F67, F68, F72)
// v0.5.0: Enter键保存 + 修复撤销/重做死代码
// ============================================================================

import React from 'react';
import { useScriptStore, useEditorStore } from '@/store';
import { AiBadge } from './AiBadge';
import type { Beat } from '../../schema/types';

interface Props {
  beat: Beat;
  index: number;
  sceneGlobalNumber: number;
  onClick: () => void;
}

export const BeatLine: React.FC<Props> = ({ beat, index, sceneGlobalNumber, onClick }) => {
  const updateBeat = useScriptStore((s) => s.updateBeat);
  const deleteBeat = useScriptStore((s) => s.deleteBeat);
  const editingBeatId = useEditorStore((s) => s.editingBeatId);
  const setEditingBeatId = useEditorStore((s) => s.setEditingBeatId);
  const selectedBeatId = useEditorStore((s) => s.selectedBeatId);

  const isEditing = editingBeatId === beat.beat_id;
  const isSelected = selectedBeatId === beat.beat_id;
  const isAiGen = beat.is_ai_generated !== false;

  const handleDoubleClick = () => {
    setEditingBeatId(beat.beat_id);
  };

  return (
    <div
      id={`beat-${beat.beat_id}`}
      onClick={onClick}
      onDoubleClick={handleDoubleClick}
      style={{
        display: 'flex',
        padding: '4px 8px',
        margin: '1px 0',
        borderRadius: 3,
        cursor: 'pointer',
        background: isSelected ? '#e3f2fd' : isAiGen ? '#fffde7' : 'transparent',
        borderLeft: isSelected ? '3px solid #1976d2' : '3px solid transparent',
        transition: 'background 0.1s',
        alignItems: 'flex-start',
        gap: 6,
        minHeight: 24,
      }}
    >
      {/* Beat ID */}
      <span style={{ fontSize: 9, color: '#bbb', minWidth: 50, paddingTop: 2, flexShrink: 0, fontFamily: 'monospace' }}>
        {beat.beat_id.replace('E1A', '')}
      </span>

      {/* AI Badge */}
      <AiBadge isAiGenerated={isAiGen} />

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {isEditing ? (
          <EditableContent beat={beat} onSave={() => setEditingBeatId(null)} />
        ) : (
          <RenderedContent beat={beat} />
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 2, flexShrink: 0, opacity: 0.5 }}>
        <button
          onClick={(e) => { e.stopPropagation(); setEditingBeatId(beat.beat_id); }}
          style={miniBtnStyle}
          title="编辑"
        >
          ✏️
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); if (confirm('删除此 beat？')) deleteBeat(beat.beat_id); }}
          style={miniBtnStyle}
          title="删除"
        >
          🗑
        </button>
      </div>
    </div>
  );
};

/** Beat 内容渲染 */
const RenderedContent: React.FC<{ beat: Beat }> = ({ beat }) => {
  switch (beat.beat_type) {
    case 'action':
    case 'montage_start':
    case 'montage_end':
    case 'flashback_end':
      return (
        <div style={{ fontSize: 13, lineHeight: 1.5 }}>
          {(beat as { action_text?: string }).action_text}
        </div>
      );
    case 'dialogue':
    case 'voice_over':
    case 'off_screen': {
      const d = beat as { character_name_display?: string; character_id: string; dialogue_text: string };
      return (
        <div style={{ paddingLeft: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase' }}>
            {d.character_name_display || d.character_id}
          </div>
          <div style={{ fontSize: 13, marginTop: -1 }}>{d.dialogue_text}</div>
        </div>
      );
    }
    case 'parenthetical': {
      const p = beat as { character_name_display?: string; character_id: string; parenthetical_text: string };
      return (
        <div style={{ paddingLeft: 24, fontSize: 12, fontStyle: 'italic', color: '#555' }}>
          ({p.parenthetical_text})
        </div>
      );
    }
    case 'transition':
      return (
        <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 600 }}>
          {(beat as { transition_type: string }).transition_type}
        </div>
      );
    case 'title_card':
      return (
        <div style={{ textAlign: 'center', fontSize: 13, fontStyle: 'italic', fontWeight: 600 }}>
          SUPER: {(beat as { title_card_text: string }).title_card_text}
        </div>
      );
    case 'flashback_start':
      return (
        <div style={{ fontSize: 13, fontStyle: 'italic', color: '#e65100' }}>
          ⏪ FLASHBACK: {(beat as { flashback_label: string }).flashback_label}
        </div>
      );
    case 'insert':
      return (
        <div style={{ fontSize: 12, fontStyle: 'italic', color: '#888' }}>
          INSERT — {(beat as { insert_description: string }).insert_description}
        </div>
      );
    default:
      return <div style={{ fontSize: 12, color: '#999' }}>[{(beat as Beat).beat_type}]</div>;
  }
};

/** 内联编辑器 */
const EditableContent: React.FC<{ beat: Beat; onSave: () => void }> = ({ beat, onSave }) => {
  const updateBeat = useScriptStore((s) => s.updateBeat);
  const setEditingBeatId = useEditorStore((s) => s.setEditingBeatId);
  const [text, setText] = React.useState(getEditableText(beat));

  const handleSave = () => {
    const patch = getPatch(beat, text);
    updateBeat(beat.beat_id, patch);
    onSave();
  };

  const handleEsc = () => setEditingBeatId(null);
  const handleEnter = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <div>
      {beat.beat_type === 'dialogue' || beat.beat_type === 'voice_over' || beat.beat_type === 'off_screen' ? (
        <div>
          <input
            value={(beat as { character_name_display?: string; character_id: string }).character_name_display || (beat as { character_id: string }).character_id}
            onChange={(e) => updateBeat(beat.beat_id, { character_name_display: e.target.value } as Partial<Beat>)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleEsc(); }}
            style={{ ...editInputStyle, fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}
            placeholder="角色名"
          />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleEnter}
            autoFocus
            style={{ ...editInputStyle, width: '100%', minHeight: 40 }}
            placeholder="对白内容"
          />
        </div>
      ) : (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleEnter}
          autoFocus
          style={{ ...editInputStyle, width: '100%', minHeight: 36 }}
          placeholder="编辑内容"
        />
      )}
      <div style={{ fontSize: 10, color: '#999', marginTop: 2 }}>
        Enter 保存 · Shift+Enter 换行 · Esc 取消
      </div>
    </div>
  );
};

function getEditableText(beat: Beat): string {
  switch (beat.beat_type) {
    case 'action': case 'montage_start': case 'montage_end': case 'flashback_end':
      return (beat as { action_text?: string }).action_text || '';
    case 'dialogue': case 'voice_over': case 'off_screen':
      return (beat as { dialogue_text: string }).dialogue_text || '';
    case 'parenthetical':
      return (beat as { parenthetical_text: string }).parenthetical_text || '';
    case 'transition':
      return (beat as { transition_type: string }).transition_type || '';
    case 'title_card':
      return (beat as { title_card_text: string }).title_card_text || '';
    case 'flashback_start':
      return (beat as { flashback_label: string }).flashback_label || '';
    case 'insert':
      return (beat as { insert_description: string }).insert_description || '';
    default:
      return '';
  }
}

function getPatch(beat: Beat, text: string): Partial<Beat> {
  switch (beat.beat_type) {
    case 'action': case 'montage_start': case 'montage_end': case 'flashback_end':
      return { action_text: text } as Partial<Beat>;
    case 'dialogue': case 'voice_over': case 'off_screen':
      return { dialogue_text: text } as Partial<Beat>;
    case 'parenthetical':
      return { parenthetical_text: text } as Partial<Beat>;
    case 'transition':
      return { transition_type: text } as Partial<Beat>;
    case 'title_card':
      return { title_card_text: text } as Partial<Beat>;
    case 'flashback_start':
      return { flashback_label: text } as Partial<Beat>;
    case 'insert':
      return { insert_description: text } as Partial<Beat>;
    default:
      return {};
  }
}

const editInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '4px 6px',
  border: '1px solid #1976d2',
  borderRadius: 3,
  fontSize: 13,
  fontFamily: 'inherit',
  background: '#fff',
  boxSizing: 'border-box',
};

const miniBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  fontSize: 10,
  padding: '0 2px',
};
