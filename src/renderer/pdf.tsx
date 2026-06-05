// ============================================================================
// PDF 导出 — F93 导出 PDF
// 使用 CSS @page + window.print() 纯前端方案
// ============================================================================

import React from 'react';

/**
 * 导出剧本为 PDF
 * 触发浏览器打印对话框，用户可选择"另存为 PDF"
 */
export function exportPdf(): void {
  // 添加打印样式
  if (!document.getElementById('screenplay-print-style')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'screenplay-print-style';
    styleEl.textContent = getPrintCss();
    document.head.appendChild(styleEl);
  }

  // 添加水印
  addWatermark();

  // 触发打印
  window.print();

  // 打印后清理水印
  setTimeout(removeWatermark, 1000);
}

function addWatermark(): void {
  removeWatermark(); // 先清除旧的
  const wm = document.createElement('div');
  wm.id = 'screenplay-watermark';
  wm.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    pointer-events: none; z-index: 9999;
    display: flex; align-items: center; justify-content: center;
    opacity: 0.06; font-size: 72px; font-weight: bold;
    transform: rotate(-30deg); color: #000;
    font-family: sans-serif;
  `;
  wm.textContent = 'AI 辅助生成 / 初稿';
  document.body.appendChild(wm);
}

function removeWatermark(): void {
  const el = document.getElementById('screenplay-watermark');
  if (el) el.remove();
}

function getPrintCss(): string {
  return `
    @media print {
      @page {
        size: A4;
        margin: 2.5cm 2cm 2.5cm 3.8cm;
      }
      @page :first {
        margin-top: 4cm;
      }

      body {
        font-family: "Courier New", Courier, monospace;
        font-size: 12pt;
        line-height: 1.5;
        color: #000;
        background: #fff !important;
      }

      /* 隐藏非剧本元素 */
      header, nav, .no-print, button, .toolbar {
        display: none !important;
      }

      /* 动作行 */
      .beat-action {
        margin: 0 0 6pt 0;
        text-align: left;
        width: 100%;
      }

      /* 角色名 */
      .beat-character {
        margin: 12pt 0 0 0;
        text-align: center;
        text-transform: uppercase;
        font-weight: bold;
        padding-left: 6cm;
      }

      /* 对白 */
      .beat-dialogue {
        margin: 0 0 0 4cm;
        max-width: 8cm;
        text-align: left;
      }

      /* 括注 */
      .beat-parenthetical {
        margin: 0 0 0 5.5cm;
        max-width: 7cm;
        font-style: italic;
        color: #333;
      }

      /* 转场 */
      .beat-transition {
        text-align: right;
        margin: 6pt 0;
        text-transform: uppercase;
      }

      /* 场景头 */
      .scene-heading {
        margin: 18pt 0 6pt 0;
        font-weight: bold;
        text-transform: uppercase;
      }

      /* 场景号 */
      .scene-number {
        float: right;
        font-weight: bold;
      }

      /* 页码 */
      .page-number {
        position: fixed;
        bottom: 1cm;
        right: 1cm;
        font-size: 11pt;
        color: #999;
      }

      /* 标题页 */
      .title-page {
        text-align: center;
        margin-top: 30%;
      }
      .title-page h1 {
        font-size: 24pt;
        margin-bottom: 1cm;
      }

      /* 水印 */
      #screenplay-watermark {
        position: fixed !important;
        opacity: 0.05 !important;
      }
    }

    @media screen {
      #screenplay-watermark {
        display: none;
      }
    }
  `;
}

/** React 组件版本的导出按钮 */
export const PdfExporter: React.FC = () => {
  return (
    <button
      onClick={exportPdf}
      style={{
        padding: '4px 12px',
        border: '1px solid #1976d2',
        borderRadius: 4,
        background: '#1976d2',
        color: '#fff',
        cursor: 'pointer',
        fontSize: 13,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
      }}
    >
      🖨 导出 PDF
    </button>
  );
};
