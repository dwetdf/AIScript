// ============================================================================
// 剧本编辑主视图 — Act → Scene → Beat 列表
// ============================================================================

import React from 'react';
import { useScriptStore, useEditorStore } from '@/store';
import { ActPanel } from '../components/ActPanel';
import { AiBadge } from '../components/AiBadge';
import type { Beat, Scene, Act } from '../../schema/types';

export const ScriptView: React.FC = () => {
  const screenplay = useScriptStore((s) => s.screenplay);
  const viewMode = useEditorStore((s) => s.viewMode);

  if (!screenplay) return null;

  return (
    <div style={{ padding: '16px 24px' }}>
      {/* 标题页 */}
      <div style={{ textAlign: 'center', marginBottom: 32, marginTop: 16 }}>
        <h1 style={{ fontSize: 28, margin: 0 }}>{screenplay.metadata.title}</h1>
        {screenplay.metadata.author && (
          <p style={{ color: '#666', marginTop: 8 }}>原著：{screenplay.metadata.author}</p>
        )}
        <p style={{ color: '#999', fontSize: 12 }}>
          {screenplay.metadata.generated_at
            ? `生成于 ${new Date(screenplay.metadata.generated_at).toLocaleString('zh-CN')}`
            : ''}
        </p>
      </div>

      {/* 幕 → 场景 → Beat */}
      {screenplay.acts.map((act) => (
        <ActPanel key={act.act_number} act={act} viewMode={viewMode} />
      ))}
    </div>
  );
};
