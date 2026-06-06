// ============================================================================
// 编辑器布局 — 两栏：大纲 | 剧本
// v0.3.0: 移除右侧 ConfigPanel，修复 AppShell 内 height
// ============================================================================

import React from 'react';
import { useScriptStore, useEditorStore } from '../store';
import { ScriptView } from './views/ScriptView';
import { OutlineView } from './views/OutlineView';
import { PdfExporter } from '../renderer/pdf';
import './styles/editor-theme.css';

export const EditorLayout: React.FC = () => {
  const screenplay = useScriptStore((s) => s.screenplay);
  const isDirty = useScriptStore((s) => s.isDirty);
  const viewMode = useEditorStore((s) => s.viewMode);
  const setViewMode = useEditorStore((s) => s.setViewMode);
  const showAiMarkers = useEditorStore((s) => s.showAiMarkers);
  const setShowAiMarkers = useEditorStore((s) => s.setShowAiMarkers);

  if (!screenplay) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: '#888' }}>
        <h2>暂无剧本</h2>
        <p>请先导入小说并完成分析→规划→展开流程</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* 左侧：大纲树 */}
      <div style={{ width: 220, borderRight: '1px solid #e0e0e0', overflow: 'auto', flexShrink: 0, background: '#fafafa' }}>
        <OutlineView />
      </div>

      {/* 中间：剧本编辑 */}
      <div style={{ flex: 1, overflow: 'auto', padding: 0 }}>
        <div style={{ padding: '8px 16px', borderBottom: '1px solid #ddd', display: 'flex', gap: 8, alignItems: 'center', background: '#f5f5f5' }}>
          <h2 style={{ margin: 0, fontSize: 16, flex: 1 }}>
            {screenplay.metadata.title}
          </h2>
          <span style={{ fontSize: 12, color: isDirty ? '#e65100' : '#4caf50' }}>
            {isDirty ? '● 未保存' : '已保存'}
          </span>
          <button
            onClick={() => setViewMode(viewMode === 'source_compare' ? 'edit' : 'source_compare')}
            style={toolbarBtnStyle}
          >
            {viewMode === 'source_compare' ? '📝 编辑模式' : '📄 原文对照'}
          </button>
          <button
            onClick={() => setShowAiMarkers(!showAiMarkers)}
            style={{
              ...toolbarBtnStyle,
              background: showAiMarkers ? '#fff3e0' : '#fff',
            }}
            title="切换 AI / 原著标记"
          >
            {showAiMarkers ? '👁 AI 标记' : '👁‍🗨 隐藏标记'}
          </button>
          <PdfExporter />
        </div>
        <ScriptView />
      </div>
    </div>
  );
};

const toolbarBtnStyle: React.CSSProperties = {
  padding: '4px 12px',
  border: '1px solid #ccc',
  borderRadius: 4,
  background: '#fff',
  cursor: 'pointer',
  fontSize: 13,
};
