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
  totalBeats: number;
  onClick: () => void;
}

export const BeatLine: React.FC<Props> = ({ beat, index, sceneGlobalNumber, totalBeats, onClick }) => {
  const updateBeat = useScriptStore((s) => s.updateBeat);
  const deleteBeat = useScriptStore((s) => s.deleteBeat);
  const insertBeat = useScriptStore((s) => s.insertBeat);
  const screenplay = useScriptStore((s) => s.screenplay);
  const editingBeatId = useEditorStore((s) => s.editingBeatId);
  const setEditingBeatId = useEditorStore((s) => s.setEditingBeatId);
  const selectedBeatId = useEditorStore((s) => s.selectedBeatId);
  const setSelectedBeatId = useEditorStore((s) => s.setSelectedBeatId);
  const showAiMarkers = useEditorStore((s) => s.showAiMarkers);

  const isEditing = editingBeatId === beat.beat_id;
  const isSelected = selectedBeatId === beat.beat_id;
  const isAiGen = beat.is_ai_generated !== false;

  const handleDoubleClick = () => {
    setEditingBeatId(beat.beat_id);
  };

  // Keyboard shortcuts
  React.useEffect(() => {
    if (!isSelected) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editingBeatId) { setEditingBeatId(null); return; }
        setSelectedBeatId(null);
        return;
      }
      if (e.key === 'Enter' && !editingBeatId && !e.shiftKey) {
        e.preventDefault();
        setEditingBeatId(beat.beat_id);
        return;
      }
      if (e.key === 'Delete' && !editingBeatId) {
        e.preventDefault();
        if (confirm('删除此 beat？')) deleteBeat(beat.beat_id);
        return;
      }
      if (e.key === 'd' && (e.ctrlKey || e.metaKey) && !editingBeatId) {
        e.preventDefault();
        const copy = { ...beat, beat_id: `_copy_${Date.now()}` } as Beat;
        insertBeat(sceneGlobalNumber, index + 1, copy);
        return;
      }
      if (e.key === 'Tab' && !editingBeatId) {
        e.preventDefault();
        // find next/prev beat element
        const allBeats = document.querySelectorAll('[data-beat-id]');
        const currentIdx = Array.from(allBeats).findIndex(el => el.getAttribute('data-beat-id') === beat.beat_id);
        const nextIdx = e.shiftKey ? currentIdx - 1 : currentIdx + 1;
        if (nextIdx >= 0 && nextIdx < allBeats.length) {
          const nextId = allBeats[nextIdx].getAttribute('data-beat-id');
          if (nextId) setSelectedBeatId(nextId);
        }
        return;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isSelected, editingBeatId, beat.beat_id]);

  return (
    <div
      data-beat-id={beat.beat_id}
      id={`beat-${beat.beat_id}`}
      onClick={onClick}
      onDoubleClick={handleDoubleClick}
      style={{
        display: 'flex',
        padding: '4px 8px',
        margin: '1px 0',
        borderRadius: 3,
        cursor: 'pointer',
        background: isSelected ? '#e3f2fd' : 'transparent',
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

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {isEditing ? (
          <EditableContent
            beat={beat}
            characters={screenplay?.characters || []}
            onSave={() => setEditingBeatId(null)}
          />
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
const EditableContent: React.FC<{ beat: Beat; characters: Array<{ character_id: string; name: string; role_type?: string }>; onSave: () => void }> = ({ beat, characters, onSave }) => {
  const updateBeat = useScriptStore((s) => s.updateBeat);
  const setEditingBeatId = useEditorStore((s) => s.setEditingBeatId);
  const [beatType, setBeatType] = React.useState(beat.beat_type);
  const [text, setText] = React.useState(getEditableText(beat));
  const datalistId = `char-list-${beat.beat_id}`;
  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleTypeChange = (newType: Beat['beat_type']) => {
    if (newType === beatType) return;
    const patch = migrateFields(beat, beatType, newType, text);
    setBeatType(newType);
    updateBeat(beat.beat_id, patch);
    setText(getEditableTextForType(newType, patch));
  };

  const handleSave = () => {
    const patch = getPatch(beat, text);
    if (beatType !== beat.beat_type) {
      const migratePatch = migrateFields(beat, beat.beat_type, beatType, text);
      updateBeat(beat.beat_id, { ...migratePatch, ...patch });
    } else {
      updateBeat(beat.beat_id, patch);
    }
    onSave();
  };

  // Only save on blur if focus is leaving the entire editor container
  const handleBlur = (e: React.FocusEvent) => {
    // Use setTimeout so the next focused element is known
    setTimeout(() => {
      if (containerRef.current && !containerRef.current.contains(document.activeElement)) {
        handleSave();
      }
    }, 0);
  };

  const handleEsc = () => setEditingBeatId(null);
  const handleEnter = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  };

  const handleCharacterSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const match = characters.find(c => c.name === val);
    updateBeat(beat.beat_id, {
      character_name_display: val,
      character_id: match?.character_id || (beat as { character_id: string }).character_id,
    } as Partial<Beat>);
  };

  // Global click handler: if clicking outside the editor, save and close
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleSave();
      }
    };
    // Delay attaching to avoid the double-click event that opened the editor
    const timeout = setTimeout(() => {
      window.addEventListener('mousedown', handler);
    }, 100);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('mousedown', handler);
    };
  }, []);

  const needsCharacter = ['dialogue', 'voice_over', 'off_screen', 'parenthetical'].includes(beatType);

  return (
    <div ref={containerRef}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 4, alignItems: 'center' }}>
        {/* Beat type selector */}
        <select
          value={beatType}
          onChange={(e) => handleTypeChange(e.target.value as Beat['beat_type'])}
          style={selectStyle}
        >
          {BEAT_TYPES.map(bt => (
            <option key={bt} value={bt}>{bt}</option>
          ))}
        </select>

        {/* Character selector (only for dialogue etc.) */}
        {needsCharacter && (
          <>
            <input
              list={datalistId}
              value={(beat as { character_name_display?: string; character_id: string }).character_name_display || (beat as { character_id: string }).character_id}
              onChange={handleCharacterSelect}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleEsc(); }}
              style={{ ...selectStyle, flex: 1, fontWeight: 600, textTransform: 'uppercase' }}
              placeholder="角色名"
            />
            <datalist id={datalistId}>
              {characters.map(c => (
                <option key={c.character_id} value={c.name}>{c.name} ({c.role_type})</option>
              ))}
            </datalist>
          </>
        )}
      </div>

      {/* Content textarea */}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleEnter}
        autoFocus
        style={{ ...editInputStyle, width: '100%', minHeight: needsCharacter ? 40 : 36 }}
        placeholder={getPlaceholder(beatType)}
      />
      <div style={{ fontSize: 10, color: '#999', marginTop: 2 }}>
        Enter 保存 · Shift+Enter 换行 · Esc 取消
      </div>
    </div>
  );
};

const BEAT_TYPES: Beat['beat_type'][] = [
  'action', 'dialogue', 'parenthetical', 'transition',
  'voice_over', 'off_screen', 'title_card', 'insert',
  'flashback_start', 'flashback_end', 'montage_start', 'montage_end',
];

const selectStyle: React.CSSProperties = {
  padding: '2px 4px',
  border: '1px solid #ccc',
  borderRadius: 3,
  fontSize: 11,
  background: '#fff',
};

function getPlaceholder(beatType: Beat['beat_type']): string {
  switch (beatType) {
    case 'dialogue': case 'voice_over': case 'off_screen': return '对白内容';
    case 'action': case 'montage_start': case 'montage_end': case 'flashback_end': return '动作描写';
    case 'parenthetical': return '演出指示';
    case 'transition': return '转场类型';
    case 'title_card': return '字幕文本';
    case 'flashback_start': return '闪回标签';
    case 'insert': return '插入描述';
    default: return '';
  }
}

function getEditableTextForType(beatType: Beat['beat_type'], data: Record<string, unknown>): string {
  switch (beatType) {
    case 'action': case 'montage_start': case 'montage_end': case 'flashback_end':
      return (data.action_text as string) || '';
    case 'dialogue': case 'voice_over': case 'off_screen':
      return (data.dialogue_text as string) || '';
    case 'parenthetical':
      return (data.parenthetical_text as string) || '';
    case 'transition':
      return (data.transition_type as string) || '';
    case 'title_card':
      return (data.title_card_text as string) || '';
    case 'flashback_start':
      return (data.flashback_label as string) || '';
    case 'insert':
      return (data.insert_description as string) || '';
    default: return '';
  }
}

/** Migrate text fields when switching beat_type */
function migrateFields(beat: Beat, from: Beat['beat_type'], to: Beat['beat_type'], currentText: string): Partial<Beat> {
  const patch = { beat_type: to } as Record<string, unknown>;

  // Read all possible text values from the beat
  const fromText = getEditableText(beat);
  const textToUse = currentText || fromText;

  // Clear old type's primary field and set new one
  const fromField = primaryTextField(from);
  const toField = primaryTextField(to);

  if (fromField) patch[fromField] = undefined;
  if (toField) patch[toField] = textToUse;

  // Transition defaults
  if (to === 'transition' && !textToUse) patch.transition_type = 'CUT_TO';
  if (to === 'title_card' && !textToUse) patch.title_card_text = '';
  if (to === 'flashback_start' && !textToUse) patch.flashback_label = '';
  if (to === 'insert' && !textToUse) patch.insert_description = '';

  return patch as Partial<Beat>;
}

function primaryTextField(beatType: Beat['beat_type']): string | null {
  switch (beatType) {
    case 'action': case 'montage_start': case 'montage_end': case 'flashback_end': return 'action_text';
    case 'dialogue': case 'voice_over': case 'off_screen': return 'dialogue_text';
    case 'parenthetical': return 'parenthetical_text';
    case 'transition': return 'transition_type';
    case 'title_card': return 'title_card_text';
    case 'flashback_start': return 'flashback_label';
    case 'insert': return 'insert_description';
    default: return null;
  }
}

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
