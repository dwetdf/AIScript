// ============================================================================
// PDF 导出 — F93 导出 PDF
// 使用 CSS @page + 静默 PDF 导出
// Electron 环境：通过 IPC 静默打印到 PDF 文件
// 浏览器环境：通过 window.print() 弹打印对话框
// 导出剧本 PDF（仅阶段 3） / 全项目 PDF（阶段 1+2+3）
// ============================================================================

import React from 'react';

/** 判断是否在 Electron 环境中 */
function isElectron(): boolean {
  return typeof (window as any).electronAPI?.printToPdf === 'function';
}

/** 获取 Electron API */
function getElectronAPI() {
  return (window as any).electronAPI as {
    printToPdf: () => Promise<ArrayBuffer>;
    saveFile: (options: { defaultName: string; data: ArrayBuffer }) => Promise<string | null>;
  } | null;
}

/** 清除指定ID的print style */
function removePrintStyleById(id: string): void {
  const el = document.getElementById(id);
  if (el) el.remove();
}

/**
 * 导出剧本为 PDF（仅阶段 3 剧本内容）
 * Electron：静默导出为 PDF 文件
 * 浏览器：弹打印对话框
 */
export async function exportPdf(): Promise<void> {
  removePrintStyleById('analysis-print-style');
  removePrintStyleById('plan-print-style');
  removePrintStyleById('full-project-print-style');

  if (!document.getElementById('screenplay-print-style')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'screenplay-print-style';
    styleEl.textContent = getPrintCss();
    document.head.appendChild(styleEl);
  }

  addWatermark();

  if (isElectron()) {
    await electronPrintPdf('剧本.pdf');
  } else {
    window.print();
  }

  setTimeout(removeWatermark, 1000);
}

/**
 * 导出全项目 PDF（阶段 1 分析报告 + 阶段 2 改编规划 + 阶段 3 剧本）
 */
export async function exportFullProjectPdf(): Promise<void> {
  removePrintStyleById('analysis-print-style');
  removePrintStyleById('plan-print-style');
  removePrintStyleById('screenplay-print-style');

  if (!document.getElementById('full-project-print-style')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'full-project-print-style';
    styleEl.textContent = getFullProjectPrintCss();
    document.head.appendChild(styleEl);
  }

  addWatermark();

  if (isElectron()) {
    await electronPrintPdf('全项目报告.pdf');
  } else {
    window.print();
  }

  setTimeout(removeWatermark, 1000);
}

/**
 * Electron 静默 PDF 导出流程
 * printToPdf → saveFile 对话框 → 完成
 */
async function electronPrintPdf(defaultName: string): Promise<void> {
  const api = getElectronAPI();
  if (!api) return;

  try {
    const pdfData = await api.printToPdf();
    await api.saveFile({ defaultName, data: pdfData });
  } catch (err) {
    console.error('静默 PDF 导出失败，回退到打印对话框:', err);
    window.print();
  }
}

// ============================================================================
// 水印
// ============================================================================

function addWatermark(): void {
  removeWatermark();
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

// ============================================================================
// 打印 CSS
// ============================================================================

function getPrintCss(): string {
  return `
    @media print {
      @page {
        size: A4;
        margin: 2.5cm 2.5cm 2.5cm 3.8cm;
      }
      @page :first {
        margin-top: 4cm;
      }
      @page {
        @top-right {
          content: counter(page);
          font-family: "Courier New", Courier, monospace;
          font-size: 11pt;
        }
      }
      @page :first {
        @top-right {
          content: none;
        }
      }

      body > * {
        visibility: hidden !important;
      }
      #screenplay-print-view,
      #screenplay-print-view * {
        visibility: visible !important;
      }
      #screenplay-print-view {
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        display: block !important;
      }
      #screenplay-print-view {
        font-family: "Courier New", Courier, monospace;
        font-size: 12pt;
        line-height: 1.5;
        color: #000;
        background: #fff !important;
      }
      .scene-heading {
        margin: 18pt 0 6pt 0;
        font-weight: bold;
        text-transform: uppercase;
        text-align: left;
      }
      .scene-number {
        float: right;
        font-weight: bold;
      }
      .beat-action {
        margin: 0 0 6pt 0;
        text-align: left;
        width: 100%;
      }
      .beat-character {
        margin: 12pt 0 0 5.6cm;
        text-transform: uppercase;
        font-weight: bold;
        text-align: left;
      }
      .beat-dialogue {
        margin: 0 0 0 2.5cm;
        max-width: 9cm;
        text-align: left;
      }
      .beat-parenthetical {
        margin: 0 0 0 4.1cm;
        max-width: 7.5cm;
        font-style: italic;
      }
      .beat-transition {
        text-align: right;
        margin: 6pt 0;
        text-transform: uppercase;
      }
      .title-page {
        text-align: center;
        margin-top: 30%;
        margin-bottom: 2cm;
      }
      .title-page h1 {
        font-size: 24pt;
        margin-bottom: 1cm;
        text-decoration: underline;
      }
      .title-page .author {
        font-size: 14pt;
        margin-bottom: 2cm;
      }
      .title-page .meta {
        font-size: 10pt;
        color: #666;
      }
      .character-list h2 {
        text-align: center;
        text-transform: uppercase;
        font-size: 14pt;
        margin-bottom: 12pt;
      }
      .character-entry {
        margin: 2pt 0;
      }
      .page-break-before {
        page-break-before: always;
      }
      #screenplay-watermark {
        position: fixed !important;
        visibility: visible !important;
        opacity: 0.04 !important;
        z-index: 9999;
      }
    }
    @media screen {
      #screenplay-watermark {
        display: none;
      }
    }
  `;
}

function getFullProjectPrintCss(): string {
  return `
    @media print {
      @page {
        size: A4;
        margin: 2cm 2cm 2cm 2cm;
      }
      @page :first {
        margin-top: 3cm;
      }
      @page {
        @top-right {
          content: counter(page);
          font-family: "Microsoft YaHei", sans-serif;
          font-size: 10pt;
          color: #999;
        }
      }
      @page :first {
        @top-right {
          content: none;
        }
      }
      body > * {
        visibility: hidden !important;
      }
      #analysis-print-view,
      #analysis-print-view * {
        visibility: visible !important;
        font-family: "Microsoft YaHei", "PingFang SC", sans-serif;
        font-size: 11pt;
        line-height: 1.7;
        color: #333;
      }
      #analysis-print-view {
        position: static !important;
        display: block !important;
      }
      #analysis-print-view h1 { font-size: 18pt; text-align: center; }
      #analysis-print-view h2 { font-size: 13pt; margin-top: 14pt; border-bottom: 1pt solid #ccc; }
      #plan-print-view,
      #plan-print-view * {
        visibility: visible !important;
        font-family: "Microsoft YaHei", "PingFang SC", sans-serif;
        font-size: 11pt;
        line-height: 1.7;
        color: #333;
      }
      #plan-print-view {
        position: static !important;
        display: block !important;
      }
      #plan-print-view h1 { font-size: 18pt; text-align: center; }
      #plan-print-view h2 { font-size: 13pt; margin-top: 14pt; border-bottom: 1pt solid #ccc; }
      #screenplay-print-view,
      #screenplay-print-view * {
        visibility: visible !important;
        font-family: "Courier New", Courier, monospace;
        font-size: 12pt;
        line-height: 1.5;
        color: #000;
      }
      #screenplay-print-view {
        position: static !important;
        display: block !important;
      }
      #screenplay-print-view .scene-heading { font-weight: bold; text-transform: uppercase; margin: 18pt 0 6pt; }
      #screenplay-print-view .beat-action { margin: 0 0 6pt; }
      #screenplay-print-view .beat-character { margin: 12pt 0 0 5.6cm; text-transform: uppercase; font-weight: bold; }
      #screenplay-print-view .beat-dialogue { margin: 0 0 0 2.5cm; max-width: 9cm; }
      #screenplay-print-view .beat-parenthetical { margin: 0 0 0 4.1cm; font-style: italic; }
      #screenplay-print-view .beat-transition { text-align: right; margin: 6pt 0; }
      #screenplay-print-view .title-page { text-align: center; margin-top: 30%; }
      #screenplay-print-view .title-page h1 { font-size: 24pt; }
      .page-break-before {
        page-break-before: always;
      }
      #screenplay-watermark {
        position: fixed !important;
        visibility: visible !important;
        opacity: 0.04 !important;
        z-index: 9999;
      }
    }
    @media screen {
      #screenplay-watermark { display: none; }
    }
  `;
}

/** React 组件版本的导出按钮 */
export const PdfExporter: React.FC = () => {
  return (
    <button
      onClick={() => exportPdf()}
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
