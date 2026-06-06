// ============================================================================
// ScriptPage — 阶段3 剧本编辑全页
// sub-tabs: 剧本编辑 / 人物表
// ============================================================================

import React from 'react';
import { useScriptStore } from '../store';
import { Editor } from '../editor';
import type { AppSection } from '../components/AppShell';

interface Props {
  section: AppSection;
  onSectionChange: (section: AppSection) => void;
}

const TABS: Array<{ id: AppSection; label: string; icon: string }> = [
  { id: 'script_edit', label: '剧本编辑', icon: '📝' },
  { id: 'script_characters', label: '人物表', icon: '👤' },
];

export const ScriptPage: React.FC<Props> = ({ section, onSectionChange }) => {
  const screenplay = useScriptStore((s) => s.screenplay);

  if (!screenplay) {
    return (
      <div style={{ textAlign: 'center', padding: 80, color: '#888' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
        <p>尚未生成剧本，请先完成阶段2 改编规划</p>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Sub-tab 导航 */}
      <div style={{
        display: 'flex', gap: 0, padding: '0 24px',
        borderBottom: '1px solid #e0e0e0', background: '#fff', flexShrink: 0,
      }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onSectionChange(tab.id)}
            style={{
              padding: '10px 18px',
              border: 'none',
              borderBottom: section === tab.id ? '2px solid #1976d2' : '2px solid transparent',
              background: 'transparent',
              cursor: 'pointer',
              fontWeight: section === tab.id ? 600 : 400,
              color: section === tab.id ? '#1976d2' : '#666',
              fontSize: 13,
              marginBottom: -1,
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: '#999', alignSelf: 'center', marginBottom: 8 }}>
          {screenplay.acts.reduce((s, a) => s + a.scenes.reduce((ss, sc) => ss + sc.beats.length, 0), 0)} beats
          · {screenplay.acts.length} 幕 · {' '}
          {screenplay.acts.reduce((s, a) => s + a.scenes.length, 0)} 场
        </span>
      </div>

      {/* 内容区 */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {section === 'script_characters' ? (
          <div style={{ padding: 24, overflow: 'auto', height: '100%' }}>
            <h3 style={{ marginTop: 0 }}>👤 人物表 ({screenplay.characters.length})</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
              {screenplay.characters.map((c) => (
                <div key={c.character_id} style={{
                  padding: '10px 14px', border: '1px solid #e8e8e8',
                  borderRadius: 6, background: '#fff', fontSize: 13,
                }}>
                  <div style={{ fontWeight: 600 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>{c.character_id}</div>
                  {c.description && <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>{c.description}</div>}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <Editor />
        )}
      </div>
    </div>
  );
};
