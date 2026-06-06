// ============================================================================
// ImportPage — 小说导入页面
// 拖拽/选择文件 → 解析 → 阶段1 分析
// v0.4.0: 连接分块进度回调 + 取消按钮
// ============================================================================

import React, { useState, useCallback, useRef } from 'react';
import { useProjectStore, useAnalysisStore, useConfigStore } from '../store';
import { parseNovel } from '../parser';
import { analyzeNovel } from '../analyzer';
import { validate } from '../schema/validator';
import { saveAnalysis, saveProjectMeta as saveMeta } from '../api/endpoints';
import { LoadingStage } from '../components/LoadingStage';
import type { ParsedNovel } from '../parser';
import type { AppSection } from '../components/AppShell';

interface Props {
  onSectionChange: (section: AppSection) => void;
}

export const ImportPage: React.FC<Props> = ({ onSectionChange }) => {
  const [error, setError] = useState<string | null>(null);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState<{
    current: number; total: number; label: string;
  } | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const aiConfig = useConfigStore((s) => s.aiConfig);
  const setAnalysis = useAnalysisStore((s) => s.setAnalysis);
  const addProject = useProjectStore((s) => s.addProject);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
    setIsProcessing(false);
    setLoadingMsg('');
    setAnalyzeProgress(null);
  }, []);

  const handleImport = useCallback(async (file: File) => {
    setError(null);
    setIsProcessing(true);
    setLoadingMsg('正在解析小说文件...');
    await new Promise((r) => setTimeout(r, 0));

    // 创建 AbortController
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const novel: ParsedNovel = await parseNovel(file);
      setLoadingMsg(`已解析 ${novel.chapters.length} 个章节，开始 AI 分析...`);
      await new Promise((r) => setTimeout(r, 0));

      const projectId = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const novelAnalysis = await analyzeNovel(novel, aiConfig, {
        onProgress: (chunk, totalChunks, label) => {
          setAnalyzeProgress({ current: chunk, total: totalChunks, label });
          setLoadingMsg(`正在分析第 ${chunk}/${totalChunks} 块...`);
        },
        signal: controller.signal,
      });
      const vr = validate(novelAnalysis, 'novel-analysis');
      if (!vr.valid) console.warn('NovelAnalysis 校验警告:', vr.errors);

      setAnalysis(novelAnalysis);
      saveAnalysis(projectId, novelAnalysis);
      saveMeta({
        id: projectId,
        title: novel.title,
        author: novel.author || '未知',
        targetMedium: aiConfig.ai_provider,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      addProject({
        id: projectId,
        title: novel.title,
        author: novel.author || '未知',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        phase: 'analyzed',
      });

      setIsProcessing(false);
      setLoadingMsg('');
      setAnalyzeProgress(null);
      abortRef.current = null;
      onSectionChange('analysis_overview');
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        // 用户取消，不显示错误
        setIsProcessing(false);
        setLoadingMsg('');
        setAnalyzeProgress(null);
        abortRef.current = null;
        return;
      }
      setError((e as Error).message);
      setIsProcessing(false);
      setLoadingMsg('');
      setAnalyzeProgress(null);
      abortRef.current = null;
    }
  }, [aiConfig, setAnalysis, addProject, onSectionChange]);

  if (isProcessing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <LoadingStage
          stage="analyzing"
          message={loadingMsg}
          progress={analyzeProgress || undefined}
          onCancel={handleCancel}
        />
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