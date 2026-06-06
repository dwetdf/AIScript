// ============================================================================
// AiBadge — AI 内容高亮标记 (F72)
// ============================================================================

import React from 'react';

interface Props {
  isAiGenerated: boolean;
  mode?: 'inline' | 'gutter';  // gutter = 左侧细线标记（默认）, inline = 旧版彩色 badge
  sourceRef?: { chapter?: number; paragraph?: number };
}

export const AiBadge: React.FC<Props> = ({ isAiGenerated, mode = 'gutter', sourceRef }) => {
  if (mode === 'gutter') {
    if (!isAiGenerated) {
      const hint = sourceRef?.chapter
        ? `原著内容 — Ch.${sourceRef.chapter} ¶${sourceRef.paragraph || '?'}`
        : '原著内容';
      return (
        <span
          style={{
            display: 'inline-block',
            width: 2,
            minWidth: 2,
            height: 14,
            background: '#4caf50',
            borderRadius: 1,
            marginTop: 2,
            flexShrink: 0,
            cursor: 'help',
          }}
          title={hint}
        />
      );
    }
    return null; // AI 生成的 beat 无标记
  }

  // inline mode (legacy)
  if (isAiGenerated) {
    return (
      <span
        style={{
          display: 'inline-block',
          background: '#fff3e0',
          border: '1px solid #ff9800',
          borderRadius: 3,
          padding: '0 3px',
          fontSize: 9,
          color: '#e65100',
          fontWeight: 600,
          flexShrink: 0,
          marginTop: 2,
        }}
        title="AI 生成内容"
      >
        AI
      </span>
    );
  }

  return (
    <span
      style={{
        display: 'inline-block',
        background: '#e8f5e9',
        border: '1px solid #4caf50',
        borderRadius: 3,
        padding: '0 3px',
        fontSize: 9,
        color: '#2e7d32',
        fontWeight: 600,
        flexShrink: 0,
        marginTop: 2,
      }}
      title="原著内容"
    >
      ORI
    </span>
  );
};
