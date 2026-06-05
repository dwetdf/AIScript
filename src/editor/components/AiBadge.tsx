// ============================================================================
// AiBadge — AI 内容高亮标记 (F72)
// ============================================================================

import React from 'react';

interface Props {
  isAiGenerated: boolean;
}

export const AiBadge: React.FC<Props> = ({ isAiGenerated }) => {
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
