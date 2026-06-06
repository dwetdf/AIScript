// ============================================================================
// ImportPreviewDialog — 项目导入预览弹窗
// 展示 bundle 内容清单 + 完整性警告 + 确认/取消操作
// ============================================================================

import React from 'react';
import type { BundlePreview } from '@/shared/project-io';

interface Props {
  preview: BundlePreview;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ImportPreviewDialog: React.FC<Props> = ({ preview, onConfirm, onCancel }) => (
  <div style={backdropStyle} onClick={onCancel}>
    <div style={cardStyle} onClick={(e) => e.stopPropagation()}>
      {/* 标题 */}
      <h2 style={{ margin: '0 0 20px', fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
        📦 导入项目数据
      </h2>

      {/* 错误状态 */}
      {!preview.valid && (
        <div style={errorBanner}>
          <strong>无法导入：</strong>{preview.error || '未知错误'}
        </div>
      )}

      {preview.valid && (
        <>
          {/* 项目信息 */}
          <div style={sectionStyle}>
            <div style={sectionTitle}>项目信息</div>
            <InfoRow label="标题" value={preview.title} />
            <InfoRow label="导出时间" value={preview.exportedAt} />
            <InfoRow label="项目 ID" value={preview.projectId} />
          </div>

          {/* 包含的数据 */}
          <div style={sectionStyle}>
            <div style={sectionTitle}>包含的数据</div>
            <StageRow present={preview.stages.meta} label="项目元数据" />
            <StageRow
              present={preview.stages.analysis}
              label="阶段 1: 小说分析"
              detail={preview.stageDetails.analysisDetail}
            />
            <StageRow
              present={preview.stages.plan}
              label="阶段 2: 改编规划"
              detail={preview.stageDetails.planDetail}
            />
            <StageRow
              present={preview.stages.screenplay}
              label="阶段 3: 剧本"
              detail={preview.stageDetails.screenplayDetail}
            />
          </div>

          {/* 完整性警告 */}
          {preview.completeness === 'partial' && (
            <div style={warnBanner}>
              ⚠️ 导入数据不完整。
              {!preview.stages.analysis && '缺少阶段1分析数据，将无法进行后续规划。'}
              {!preview.stages.plan && '缺少阶段2规划数据，将无法展开 Beat。'}
              {!preview.stages.screenplay && '缺少剧本数据，需要重新执行阶段3展开。'}
            </div>
          )}

          {preview.completeness === 'empty' && (
            <div style={errorBanner}>没有任何可导入的数据。</div>
          )}
        </>
      )}

      {/* 按钮 */}
      <div style={btnRow}>
        <button onClick={onCancel} style={cancelBtn}>取消</button>
        <button
          onClick={onConfirm}
          style={confirmBtn}
          disabled={!preview.valid || preview.completeness === 'empty'}
        >
          确认导入 ✅
        </button>
      </div>
    </div>
  </div>
);

// ====== Sub-components ======

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0' }}>
    <span style={{ color: '#888' }}>{label}</span>
    <span style={{ fontWeight: 500 }}>{value}</span>
  </div>
);

const StageRow: React.FC<{ present: boolean; label: string; detail?: string }> = ({
  present,
  label,
  detail,
}) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
    <span style={{ fontSize: 16 }}>{present ? '✅' : '❌'}</span>
    <span style={{ flex: 1, fontSize: 13 }}>{label}</span>
    {detail && <span style={{ fontSize: 11, color: '#999' }}>{detail}</span>}
  </div>
);

// ====== Styles ======

const backdropStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const cardStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 12,
  padding: 32,
  maxWidth: 520,
  width: '90%',
  boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
  maxHeight: '90vh',
  overflow: 'auto',
};

const sectionStyle: React.CSSProperties = {
  marginBottom: 16,
  padding: '12px 16px',
  background: '#fafafa',
  borderRadius: 8,
  border: '1px solid #f0f0f0',
};

const sectionTitle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: 13,
  color: '#666',
  marginBottom: 8,
  paddingBottom: 6,
  borderBottom: '1px solid #eee',
};

const errorBanner: React.CSSProperties = {
  padding: '10px 14px',
  background: '#ffebee',
  border: '1px solid #ef9a9a',
  borderRadius: 6,
  color: '#c62828',
  fontSize: 13,
  marginBottom: 16,
  lineHeight: 1.5,
};

const warnBanner: React.CSSProperties = {
  padding: '10px 14px',
  background: '#fff3e0',
  border: '1px solid #ffe0b2',
  borderRadius: 6,
  color: '#e65100',
  fontSize: 12,
  lineHeight: 1.6,
};

const btnRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 10,
  marginTop: 20,
};

const cancelBtn: React.CSSProperties = {
  padding: '8px 20px',
  border: '1px solid #d0d0d0',
  borderRadius: 6,
  background: '#fff',
  cursor: 'pointer',
  fontSize: 13,
};

const confirmBtn: React.CSSProperties = {
  padding: '8px 20px',
  border: 'none',
  borderRadius: 6,
  background: '#1976d2',
  color: '#fff',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 600,
};
