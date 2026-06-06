// ============================================================================
// 编辑器布局 — 两栏：大纲 | 剧本
// v0.3.0: 移除右侧 ConfigPanel，修复 AppShell 内 height
// ============================================================================

import React from 'react';
import { useScriptStore, useEditorStore, useProjectStore } from '../store';
import { saveScreenplay } from '../api/endpoints';
import { ScriptView } from './views/ScriptView';
import { OutlineView } from './views/OutlineView';
import { PdfExporter } from '../renderer/pdf';
import './styles/editor-theme.css';

export const EditorLayout: React.FC = () => {
  const screenplay = useScriptStore((s) => s.screenplay);
  const isDirty = useScriptStore((s) => s.isDirty);
  const markClean = useScriptStore((s) => s.markClean);
  const updateScreenplay = useScriptStore((s) => s.updateScreenplay);
  const viewMode = useEditorStore((s) => s.viewMode);
  const setViewMode = useEditorStore((s) => s.setViewMode);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const [editingTitle, setEditingTitle] = React.useState(false);
  const [titleDraft, setTitleDraft] = React.useState(screenplay?.metadata.title || '');
  const titleInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (editingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [editingTitle]);

  const handleSave = () => {
    if (!screenplay || !activeProjectId) return;
    saveScreenplay(activeProjectId, screenplay);
    markClean();
  };

  // Ctrl+S 快捷键
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [screenplay, activeProjectId]);

  const commitTitle = () => {
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== screenplay?.metadata.title) {
      updateScreenplay({ metadata: { ...screenplay!.metadata, title: trimmed } });
    }
    setEditingTitle(false);
  };

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
          {editingTitle ? (
            <input
              ref={titleInputRef}
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); commitTitle(); }
                if (e.key === 'Escape') { setTitleDraft(screenplay.metadata.title); setEditingTitle(false); }
              }}
              style={{
                fontSize: 16, fontWeight: 700, margin: 0, flex: 1,
                padding: '2px 8px', border: '1px solid #1976d2', borderRadius: 4,
                outline: 'none', background: '#fff',
              }}
            />
          ) : (
            <h2
              style={{ margin: 0, fontSize: 16, flex: 1, cursor: 'pointer', borderBottom: '1px dashed transparent' }}
              onMouseEnter={(e) => { (e.target as HTMLElement).style.borderBottomColor = '#1976d2'; }}
              onMouseLeave={(e) => { (e.target as HTMLElement).style.borderBottomColor = 'transparent'; }}
              onDoubleClick={() => { setTitleDraft(screenplay.metadata.title); setEditingTitle(true); }}
              title="双击编辑剧本名称"
            >
              {screenplay.metadata.title}
            </h2>
          )}
          <span style={{ fontSize: 12, color: isDirty ? '#e65100' : '#4caf50' }}>
            {isDirty ? '● 未保存' : '✓ 已保存'}
          </span>
          <button
            onClick={handleSave}
            style={{
              ...toolbarBtnStyle,
              background: isDirty ? '#1976d2' : '#fff',
              color: isDirty ? '#fff' : '#999',
              borderColor: isDirty ? '#1976d2' : '#ccc',
            }}
            title="保存到本地 (Ctrl+S)"
          >
            {isDirty ? '💾 保存' : '✓ 已同步'}
          </button>
          <button
            onClick={() => setViewMode(viewMode === 'source_compare' ? 'edit' : 'source_compare')}
            style={toolbarBtnStyle}
          >
            {viewMode === 'source_compare' ? '📝 编辑模式' : '📄 原文对照'}
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
