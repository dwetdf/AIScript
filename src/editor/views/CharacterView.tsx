// ============================================================================
// 人物表视图 — F70 F71
// ============================================================================

import React from 'react';
import { useScriptStore } from '@/store';
import type { Character } from '../../schema/types';

export const CharacterView: React.FC = () => {
  const screenplay = useScriptStore((s) => s.screenplay);
  const updateCharacter = useScriptStore((s) => s.updateCharacter);
  const renameCharacter = useScriptStore((s) => s.renameCharacter);

  if (!screenplay) return null;

  return (
    <div style={{ padding: 16 }}>
      <h3>人物表</h3>
      {screenplay.characters.map((char) => (
        <CharacterCard key={char.character_id} character={char} />
      ))}
    </div>
  );
};

const CharacterCard: React.FC<{ character: Character }> = ({ character }) => {
  const renameCharacter = useScriptStore((s) => s.renameCharacter);
  const [editing, setEditing] = React.useState(false);
  const [newName, setNewName] = React.useState(character.name);
  const char = character;

  return (
    <div style={{
      border: '1px solid #e0e0e0',
      borderRadius: 8,
      padding: 12,
      marginBottom: 8,
      background: '#fff',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          {editing ? (
            <div style={{ display: 'flex', gap: 4 }}>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                style={{ padding: '2px 6px', border: '1px solid #ccc', borderRadius: 4 }}
              />
              <button
                onClick={() => {
                  renameCharacter(char.character_id, newName);
                  setEditing(false);
                }}
                style={{ padding: '2px 8px', cursor: 'pointer' }}
              >
                确认
              </button>
              <button onClick={() => { setEditing(false); setNewName(char.name); }} style={{ padding: '2px 8px' }}>
                取消
              </button>
            </div>
          ) : (
            <div>
              <strong style={{ fontSize: 15 }}>{char.name}</strong>
              <span style={{ fontSize: 11, color: '#999', marginLeft: 8 }}>{char.character_id}</span>
            </div>
          )}
        </div>
        <span style={{
          fontSize: 11,
          padding: '2px 8px',
          borderRadius: 10,
          background: char.role_type === 'protagonist' ? '#4caf50' : char.role_type === 'antagonist' ? '#f44336' : '#90a4ae',
          color: '#fff',
        }}>
          {char.role_type}
        </span>
      </div>

      <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
        {char.description && <span>{char.description}</span>}
        {char.gender && <span style={{ marginLeft: 8 }}>· {char.gender}</span>}
        {char.age_range && <span style={{ marginLeft: 4 }}>· {char.age_range}</span>}
      </div>

      {char.arc && (
        <div style={{ fontSize: 11, color: '#888', marginTop: 4, fontStyle: 'italic' }}>
          弧线：{char.arc}
        </div>
      )}

      {char.voice_notes && (
        <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
          配音：{char.voice_notes}
        </div>
      )}

      {char.relationships && char.relationships.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600 }}>关系：</span>
          {char.relationships.map((r, i) => (
            <span key={i} style={{ fontSize: 11, color: '#555', display: 'block', padding: '1px 0' }}>
              → {r.target_character_id} · {r.relationship_type}{r.relationship_description ? ` (${r.relationship_description})` : ''}
            </span>
          ))}
        </div>
      )}

      <button
        onClick={() => setEditing(true)}
        style={{ marginTop: 8, padding: '2px 8px', fontSize: 11, cursor: 'pointer', border: '1px solid #ccc', borderRadius: 4 }}
      >
        ✏️ 改名
      </button>
    </div>
  );
};
