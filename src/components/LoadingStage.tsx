// ============================================================================
// LoadingStage — AI 处理中的生动加载动画
// 解决: 页面卡死 + 用户体验差
// ============================================================================

import React, { useEffect, useState, useMemo } from 'react';

interface Props {
  stage: 'analyzing' | 'planning' | 'expanding';
  message: string;
  /** 场景名（展开阶段，单场景或向后兼容） */
  sceneName?: string;
  /** 并行场景名列表（展开阶段，并发时使用） */
  sceneNames?: string[];
  /** 当前/总数 + 可选标签 */
  progress?: { current: number; total: number; label?: string };
  /** 并发数（用于预估剩余时间） */
  concurrency?: number;
  /** 阶段 2 子步骤 */
  planningStep?: 'strategy' | 'episode';
  /** 取消按钮回调 */
  onCancel?: () => void;
}

/** 每个阶段的趣味提示 */
const FUN_TIPS: Record<string, string[]> = {
  analyzing: [
    '🔍 正在扫描小说结构...',
    '👥 识别关键人物中...',
    '📖 分析叙事节奏和冲突...',
    '🎭 提取人物关系和对话风格...',
    '📝 AI 正在“阅读”你的小说...',
  ],
  planning: [
    '🎬 设计三幕结构骨架...',
    '🗺️ 规划场景分布...',
    '🎯 确定高潮位置和节奏峰值...',
    '✂️ 决定哪些情节保留、哪些压缩...',
    '🔄 将内心独白转化为可拍摄的动作...',
  ],
  expanding: [
    '✍️ AI 正在逐场景写作...',
    '💬 改写对话为剧本格式...',
    '🎥 生成场景头和转场指示...',
    '📏 压缩叙述为简练动作描写...',
    '🔗 标注原文溯源...',
    '🧩 补全过渡内容...',
  ],
};

export const LoadingStage: React.FC<Props> = ({ stage, message, sceneName, sceneNames, progress, concurrency, planningStep, onCancel }) => {
  const [tipIndex, setTipIndex] = useState(0);
  const tips = FUN_TIPS[stage] || ['处理中...'];

  // 每 2.5 秒切换趣味提示
  useEffect(() => {
    const timer = setInterval(() => {
      setTipIndex((i) => (i + 1) % tips.length);
    }, 2500);
    return () => clearInterval(timer);
  }, [tips]);

  // 根据阶段选择动画字符
  const spinner = useMemo(() => {
    const chars: Record<string, string[]> = {
      analyzing: ['📖', '📚', '🔍', '📝'],
      planning: ['🎬', '📐', '🎯', '🗺️'],
      expanding: ['✍️', '🎥', '💬', '📄'],
    };
    return chars[stage] || ['⏳', '⌛'];
  }, [stage]);

  const percent = progress ? Math.round((progress.current / progress.total) * 100) : null;

  return (
    <div style={containerStyle}>
      {/* 主动画区 */}
      <div style={spinnerArea}>
        <div style={spinnerRing}>
          <span style={spinnerIcon}>{spinner[tipIndex % spinner.length]}</span>
        </div>
      </div>

      {/* 状态文字 */}
      <h3 style={{ margin: '16px 0 8px', fontSize: 18, color: '#333' }}>
        {stage === 'analyzing' && '🔬 AI 正在分析小说'}
        {stage === 'planning' && (
          planningStep === 'strategy' ? '🎯 AI 正在生成改编策略' :
          planningStep === 'episode' ? '🎬 AI 正在规划幕结构与场景' :
          '🎬 AI 正在设计改编方案'
        )}
        {stage === 'expanding' && '✍️ AI 正在展开剧情节拍'}
      </h3>

      <p style={msgStyle}>{message}</p>

      {/* 场景级进度（展开阶段） */}
      {progress && (
        <div style={progressArea}>
          <div style={progressBarOuter}>
            <div
              style={{
                ...progressBarInner,
                width: `${percent}%`,
                transition: 'width 0.6s ease',
              }}
            />
          </div>
          <span style={progressText}>
            {progress.current} / {progress.total}
            {progress.label ? ` ${progress.label}` : ''}
            {percent !== null && ` · ${percent}%`}
          </span>
        </div>
      )}

      {/* 当前场景名（向后兼容，分析阶段） */}
      {sceneName && !sceneNames?.length && stage === 'expanding' && (
        <div style={sceneBadge}>
          🎞️ 正在处理: <strong>{sceneName}</strong>
        </div>
      )}

      {/* 并行场景名列表 */}
      {sceneNames && sceneNames.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 16, maxWidth: 400 }}>
          {sceneNames.map((name, i) => (
            <span key={i} style={runningBadge}>🎞️ {name}</span>
          ))}
        </div>
      )}

      {/* 趣味提示 */}
      <div style={tipBubble} key={tipIndex}>
        <span style={{ marginRight: 6 }}>
          {planningStep && stage === 'planning'
            ? (planningStep === 'strategy' ? tips[tipIndex] : '🗺️ 规划场景分布...')
            : tips[tipIndex]}
        </span>
      </div>

      {/* 时长提示 + 取消按钮 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 16 }}>
        <p style={{ fontSize: 12, color: '#bbb', margin: 0 }}>
          {stage === 'analyzing' && (progress
            ? `分块分析中（${progress.total} 块）`
            : '预计 30-60 秒，取决于小说长度')}
          {stage === 'planning' && (planningStep
            ? `预计 20-40 秒`
            : '预计 20-40 秒')}
          {stage === 'expanding' && progress && (() => {
            const c = concurrency || 1;
            const remaining = Math.max(1, Math.round((progress.total - progress.current) * 0.5 / c));
            return `预计 ${remaining} 分钟（${c} 场景并行）`;
          })()}
        </p>
        {onCancel && (
          <button
            onClick={onCancel}
            style={{
              padding: '6px 16px',
              background: '#fff',
              border: '1px solid #f44336',
              borderRadius: 6,
              color: '#f44336',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            ✕ 取消
          </button>
        )}
      </div>
    </div>
  );
};

// ============================== Styles ==============================

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '48px 24px',
  background: '#fff',
  borderRadius: 12,
  border: '1px solid #e8e8e8',
};

const spinnerArea: React.CSSProperties = {
  position: 'relative',
  width: 96,
  height: 96,
};

const spinnerRing: React.CSSProperties = {
  width: 96,
  height: 96,
  borderRadius: '50%',
  border: '4px solid #e8e8e8',
  borderTopColor: '#1976d2',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  animation: 'spin 1.5s linear infinite',
};

const spinnerIcon: React.CSSProperties = {
  fontSize: 36,
  animation: 'counterSpin 1.5s linear infinite',
  display: 'inline-block',
};

const msgStyle: React.CSSProperties = {
  fontSize: 14,
  color: '#666',
  margin: '0 0 16px',
};

const progressArea: React.CSSProperties = {
  width: '100%',
  maxWidth: 360,
  marginBottom: 16,
};

const progressBarOuter: React.CSSProperties = {
  width: '100%',
  height: 8,
  background: '#f0f0f0',
  borderRadius: 4,
  overflow: 'hidden',
  marginBottom: 6,
};

const progressBarInner: React.CSSProperties = {
  height: '100%',
  background: 'linear-gradient(90deg, #1976d2, #42a5f5, #1976d2)',
  borderRadius: 4,
  backgroundSize: '200% 100%',
  animation: 'shimmer 2s linear infinite',
};

const progressText: React.CSSProperties = {
  fontSize: 13,
  color: '#1976d2',
  fontWeight: 600,
};

const sceneBadge: React.CSSProperties = {
  padding: '6px 16px',
  background: '#e3f2fd',
  borderRadius: 16,
  fontSize: 13,
  color: '#1565c0',
  marginBottom: 16,
};

const runningBadge: React.CSSProperties = {
  padding: '4px 12px',
  background: '#fff3e0',
  borderRadius: 12,
  fontSize: 12,
  color: '#e65100',
  whiteSpace: 'nowrap',
};

const tipBubble: React.CSSProperties = {
  padding: '10px 20px',
  background: '#fafafa',
  borderRadius: 20,
  fontSize: 13,
  color: '#555',
  maxWidth: 400,
  textAlign: 'center' as const,
  animation: 'fadeIn 0.4s ease',
};

// --- 注入全局 keyframes ---
if (typeof document !== 'undefined' && !document.getElementById('loading-stage-styles')) {
  const style = document.createElement('style');
  style.id = 'loading-stage-styles';
  style.textContent = `
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes counterSpin { to { transform: rotate(-360deg); } }
    @keyframes shimmer { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  `;
  document.head.appendChild(style);
}
