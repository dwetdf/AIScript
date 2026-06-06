// ============================================================================
// ImportPage — 小说导入页面
// 拖拽/选择文件 → 解析 → 后台阶段1 分析
// v0.7.0: 阶段 1 分析后台化 — 解析后可自由切换项目/阶段
// ============================================================================

import React, { useState, useCallback } from 'react';
import { useProjectStore, useConfigStore } from '../store';
import { parseNovel } from '../parser';
import { startStage1Analysis } from '../background/taskManager';
import { saveNovel } from '../api/endpoints';
import { saveProjectMeta } from '../api/endpoints';
import type { AppSection } from '../components/AppShell';

interface Props {
  onSectionChange: (section: AppSection) => void;
}

export const ImportPage: React.FC<Props> = ({ onSectionChange }) => {
  const [error, setError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsingMsg, setParsingMsg] = useState('');

  const aiConfig = useConfigStore((s) => s.aiConfig);
  const addProject = useProjectStore((s) => s.addProject);
  const setActiveProject = useProjectStore((s) => s.setActiveProject);

  const handleImport = useCallback(async (file: File) => {
    setError(null);
    setParsing(true);
    setParsingMsg('正在解析小说文件...');
    await new Promise((r) => setTimeout(r, 0));

    try {
      // 文件解析（同步等待，通常很快）
      const novel = await parseNovel(file);

      // 立即创建项目（阶段标记为 imported，后台分析完成后再更新）
      const projectId = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      // 先持久化基础元数据
      saveProjectMeta({
        id: projectId,
        title: novel.title,
        author: novel.author || '未知',
        targetMedium: aiConfig.ai_provider,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // 添加到项目列表
      addProject({
        id: projectId,
        title: novel.title,
        author: novel.author || '未知',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        phase: 'imported',
      });

      // 切换到新项目
      setActiveProject(projectId);

      setParsing(false);
      setParsingMsg('');

      // 持久化原始小说（用于后续单章重新生成）
      saveNovel(projectId, novel);

      // 启动后台阶段 1 分析
      startStage1Analysis(projectId, novel, novel.title, novel.author || '未知', aiConfig);

      // 导航到分析页面（会显示进度条）
      onSectionChange('analysis_overview');
    } catch (e) {
      setError((e as Error).message);
      setParsing(false);
      setParsingMsg('');
    }
  }, [aiConfig, addProject, setActiveProject, onSectionChange]);

  // ---- 解析中（全屏 Loading — 解析很快，不需要后台化） ----
  if (parsing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📖</div>
          <p style={{ color: '#666' }}>{parsingMsg}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: '80px auto', padding: 24 }}>
      {error && (
        <div style={errorBar}>
          <strong>错误：</strong>{error}
          <button onClick={() => setError(null)} style={errorCloseBtn}>✕</button>
        </div>
      )}

      <div
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleImport(f); }}
        onDragOver={(e) => e.preventDefault()}
        style={dropZone}
      >
        <div style={{ fontSize: 56, marginBottom: 16 }}>📖</div>
        <h3 style={{ margin: '0 0 8px' }}>导入小说文件</h3>
        <p style={{ color: '#888', marginBottom: 28, fontSize: 14 }}>
          支持 .txt / .docx / .md 格式 · 至少 3 章 · 中文小说
        </p>
        <label style={fileBtn}>
          选择文件
          <input
            type="file"
            accept=".txt,.docx,.md"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImport(f); }}
            style={{ display: 'none' }}
          />
        </label>
        <p style={{ fontSize: 11, color: '#bbb', marginTop: 14 }}>或拖拽文件到此处</p>
      </div>
    </div>
  );
};

const dropZone: React.CSSProperties = {
  border: '2px dashed #bbb', borderRadius: 12, padding: 56,
  textAlign: 'center', background: '#fff', cursor: 'pointer',
};

const fileBtn: React.CSSProperties = {
  padding: '12px 28px', background: '#1976d2', color: '#fff',
  borderRadius: 8, cursor: 'pointer', fontSize: 15, display: 'inline-block',
};

const errorBar: React.CSSProperties = {
  padding: 12, background: '#ffebee', border: '1px solid #f44336', borderRadius: 8,
  marginBottom: 16, color: '#c62828', fontSize: 14, display: 'flex', alignItems: 'center',
};

const errorCloseBtn: React.CSSProperties = {
  marginLeft: 12, background: 'transparent', border: 'none',
  cursor: 'pointer', color: '#c62828', fontWeight: 600,
};
