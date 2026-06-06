// ============================================================================
// analysisExport — 分析报告导出 (PDF + HTML)
// ============================================================================

import type { NovelAnalysis } from '@/schema/types';

/** 清除指定ID的print style */
function removePrintStyleById(id: string): void {
  const el = document.getElementById(id);
  if (el) el.remove();
}

export function exportAnalysisPdf(): void {
  // 清除其他阶段的 print style，确保只有分析报告可见
  removePrintStyleById('screenplay-print-style');
  removePrintStyleById('plan-print-style');
  removePrintStyleById('full-project-print-style');

  if (!document.getElementById('analysis-print-style')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'analysis-print-style';
    styleEl.textContent = getAnalysisPrintCss();
    document.head.appendChild(styleEl);
  }
  addAnalysisWatermark();
  window.print();
  setTimeout(removeAnalysisWatermark, 1000);
}

export function exportAnalysisHtml(analysis: NovelAnalysis, title: string): void {
  const html = buildAnalysisHtml(analysis, title);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = title + '-分析报告.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function addAnalysisWatermark(): void {
  removeAnalysisWatermark();
  const wm = document.createElement('div');
  wm.id = 'analysis-watermark';
  wm.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;display:flex;align-items:center;justify-content:center;opacity:0.04;font-size:72px;font-weight:bold;transform:rotate(-30deg);color:#000;font-family:sans-serif';
  wm.textContent = 'AI 辅助生成 / 初稿';
  document.body.appendChild(wm);
}

function removeAnalysisWatermark(): void {
  const el = document.getElementById('analysis-watermark');
  if (el) el.remove();
}

function getAnalysisPrintCss(): string {
  return '@media print { @page { size: A4; margin: 2cm 2cm 2cm 2cm; } @page :first { margin-top: 3cm; } @page { @top-right { content: counter(page); font-family: "Microsoft YaHei", sans-serif; font-size: 10pt; color: #999; } } @page :first { @top-right { content: none; } } body > * { visibility: hidden !important; } #analysis-print-view, #analysis-print-view * { visibility: visible !important; } #analysis-print-view { position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; display: block !important; font-family: "Microsoft YaHei", "PingFang SC", sans-serif; font-size: 11pt; line-height: 1.7; color: #333; background: #fff !important; } #analysis-print-view h1 { font-size: 20pt; text-align: center; margin-bottom: 8pt; } #analysis-print-view h2 { font-size: 14pt; margin-top: 18pt; margin-bottom: 8pt; border-bottom: 1pt solid #ccc; padding-bottom: 4pt; } #analysis-print-view h3 { font-size: 12pt; margin-top: 12pt; margin-bottom: 4pt; } .ap-stat-row { display: flex; gap: 16pt; justify-content: center; margin-bottom: 16pt; } .ap-stat-item { text-align: center; } .ap-stat-value { font-size: 18pt; font-weight: 700; color: #1976d2; } .ap-stat-label { font-size: 9pt; color: #888; } .ap-theme-card { padding: 8pt 12pt; margin-bottom: 8pt; border-left: 3pt solid #1976d2; background: #fafafa; } .ap-theme-name { font-weight: 700; font-size: 12pt; } .ap-theme-desc { font-size: 10pt; color: #555; margin-top: 2pt; } .ap-char-card { padding: 6pt 10pt; margin-bottom: 6pt; background: #fafafa; border-radius: 4pt; } .ap-char-name { font-weight: 700; } .ap-char-role { font-size: 9pt; color: #888; } .ap-conflict-type { display: inline-block; padding: 2pt 8pt; background: #f44336; color: #fff; font-size: 9pt; border-radius: 3pt; } .ap-event-card { padding: 6pt 10pt; margin-bottom: 6pt; border-left: 3pt solid #4caf50; } .ap-chapter-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8pt; } .ap-chapter-card { padding: 8pt 10pt; background: #fafafa; border-radius: 4pt; } .ap-chapter-num { font-weight: 700; display: inline-block; width: 24pt; height: 24pt; border-radius: 50%; background: #1976d2; color: #fff; text-align: center; line-height: 24pt; font-size: 9pt; margin-right: 6pt; } .ap-func-badge { display: inline-block; padding: 1pt 6pt; border-radius: 3pt; color: #fff; font-size: 8pt; margin-top: 2pt; } .page-break-before { page-break-before: always; } #analysis-watermark { position: fixed !important; visibility: visible !important; opacity: 0.04 !important; z-index: 9999; } } @media screen { #analysis-watermark { display: none; } }';
}

function buildAnalysisHtml(analysis: NovelAnalysis, title: string): string {
  const chars = analysis.character_analysis;
  const chapters = analysis.chapter_summaries;
  const events = analysis.plot_analysis.key_events;
  const themes = analysis.theme_analysis?.core_themes || [];
  const tonal = analysis.theme_analysis?.tonal_characteristics || [];
  const cc = analysis.plot_analysis.core_conflict;
  const mp = analysis.plot_analysis.main_plot;

  const roleLabel = (r: string): string => {
    const m: Record<string, string> = { protagonist: '主角', antagonist: '反派', supporting: '配角', minor: '次要', narrator: '旁白', ensemble: '群像' };
    return m[r] || r;
  };
  const funcLabel = (df: string): string => {
    const m: Record<string, string> = { inciting_incident: '激励事件', climax: '高潮', resolution: '结局', midpoint: '中点', exposition: '说明', plot_point_1: '情节一', plot_point_2: '情节二', other: '其他' };
    return m[df] || df;
  };
  const funcColor = (df: string): string => {
    const m: Record<string, string> = { inciting_incident: '#e91e63', climax: '#f44336', resolution: '#4caf50', midpoint: '#ff9800', exposition: '#2196f3', plot_point_1: '#9c27b0', plot_point_2: '#9c27b0', other: '#607d8b' };
    return m[df] || '#607d8b';
  };
  const avatarColor = (id: string): string => {
    const colors = ['#4caf50', '#2196f3', '#ff9800', '#9c27b0', '#e91e63', '#00bcd4', '#795548', '#607d8b'];
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
    return colors[Math.abs(hash) % colors.length];
  };

  const wc = (analysis.source_info.word_count || 0).toLocaleString();
  const dateStr = new Date().toLocaleDateString('zh-CN');
  const css = '<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:"Microsoft YaHei","PingFang SC",sans-serif;font-size:14px;line-height:1.7;color:#333;max-width:900px;margin:0 auto;padding:40px 24px;background:#fff}h1{font-size:24px;text-align:center;margin-bottom:4px}.subtitle{text-align:center;color:#888;font-size:13px;margin-bottom:32px}h2{font-size:16px;margin:28px 0 12px;border-bottom:1px solid #e0e0e0;padding-bottom:6px}h3{font-size:14px;margin:16px 0 8px}.stat-row{display:flex;gap:24px;justify-content:center;padding:16px;background:#f9f9f9;border-radius:6px;margin-bottom:24px}.stat-item{text-align:center}.stat-value{font-size:22px;font-weight:700;color:#1976d2}.stat-label{font-size:12px;color:#888;margin-top:2px}.theme-card{padding:10px 14px;margin-bottom:8px;border-left:3px solid #1976d2;background:#fafafa}.theme-name{font-weight:700}.theme-desc{font-size:13px;color:#555;margin-top:4px}.tone-tag{display:inline-block;padding:2px 8px;background:#e8eaf6;color:#3949ab;border-radius:10px;font-size:11px;margin:2px}.char-card{padding:8px 12px;margin-bottom:6px;background:#fafafa;border-radius:4px;display:flex;gap:10px;align-items:flex-start}.char-avatar{width:32px;height:32px;border-radius:50%;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0}.char-name{font-weight:700}.char-role{font-size:10px;padding:1px 6px;border-radius:8px;color:#fff;margin-left:4px}.conflict-type{display:inline-block;padding:3px 10px;background:#f44336;color:#fff;font-size:12px;border-radius:4px;margin-bottom:8px}.event-card{padding:8px 12px;margin-bottom:8px;border-left:3px solid #4caf50;background:#fafafa}.event-chapter{font-size:11px;color:#999}.event-name{font-weight:700}.func-badge{display:inline-block;padding:1px 6px;border-radius:3px;color:#fff;font-size:10px;margin-top:4px}.chapter-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.chapter-card{padding:10px 12px;background:#fafafa;border-radius:4px}.chapter-num{display:inline-block;width:24px;height:24px;border-radius:50%;background:#1976d2;color:#fff;text-align:center;line-height:24px;font-size:11px;margin-right:6px}.stakes-box{padding:8px 12px;background:#fff3e0;border-radius:4px;color:#e65100;font-weight:500}.footer{margin-top:40px;text-align:center;font-size:12px;color:#bbb;border-top:1px solid #eee;padding-top:16px}</style>';

  let html = '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>' + title + ' - 小说分析报告</title>' + css + '</head><body><h1>📊 ' + title + '</h1><p class="subtitle">小说分析报告 · ' + dateStr + '</p><div class="stat-row"><div class="stat-item"><div class="stat-value">' + chapters.length + '</div><div class="stat-label">章节</div></div><div class="stat-item"><div class="stat-value">' + chars.length + '</div><div class="stat-label">人物</div></div><div class="stat-item"><div class="stat-value">' + events.length + '</div><div class="stat-label">关键事件</div></div><div class="stat-item"><div class="stat-value">' + wc + '</div><div class="stat-label">总字数</div></div></div>';

  if (themes.length > 0) {
    html += '<h2>🏷️ 核心主题</h2>';
    for (const t of themes) {
      html += '<div class="theme-card"><div class="theme-name">' + t.theme + '</div><div class="theme-desc">' + t.description + '</div>';
      if (t.embodied_by && t.embodied_by.length > 0) {
        html += '<div style="margin-top:4px;font-size:12px;color:#888">体现于: ' + t.embodied_by.join(' · ') + '</div>';
      }
      html += '</div>';
    }
    if (tonal.length > 0) {
      html += '<div style="margin-top:8px">' + tonal.map(function(tc) { return '<span class="tone-tag">' + tc + '</span>'; }).join(' ') + '</div>';
    }
  }

  html += '<h2>👥 人物图谱</h2>';
  for (const c of chars) {
    const bg = c.role === 'protagonist' ? '#4caf50' : c.role === 'antagonist' ? '#f44336' : '#90a4ae';
    html += '<div class="char-card"><div class="char-avatar" style="background:' + avatarColor(c.character_id) + '">' + c.name.charAt(0) + '</div><div><span class="char-name">' + c.name + '</span><span class="char-role" style="background:' + bg + '">' + roleLabel(c.role) + '</span>';
    if (c.identity) html += '<div style="font-size:12px;color:#555;margin-top:2px">' + c.identity + '</div>';
    if (c.character_arc) html += '<div style="font-size:11px;color:#888;font-style:italic;margin-top:2px">↪ ' + c.character_arc + '</div>';
    html += '</div></div>';
  }

  html += '<h2>⚔️ 核心冲突</h2><div class="conflict-type">' + cc.type + '</div><p>' + cc.description + '</p>';
  if (cc.conflict_layers) {
    for (const l of cc.conflict_layers) {
      html += '<div style="margin-top:6px"><strong>' + l.layer + ':</strong> ' + l.description + '</div>';
    }
  }
  html += '<h3>主线</h3><p>' + mp.description + '</p><div class="stakes-box">⚠️ 赌注: ' + mp.stakes + '</div>';

  if (events.length > 0) {
    html += '<h2>📈 关键事件</h2>';
    for (const evt of events) {
      html += '<div class="event-card"><div class="event-chapter">第 ' + evt.chapter + ' 章</div><div class="event-name">' + evt.event + '</div><div style="font-size:12px;color:#666;margin-top:2px">' + evt.description + '</div>';
      if (evt.dramatic_function) {
        html += '<span class="func-badge" style="background:' + funcColor(evt.dramatic_function) + '">' + funcLabel(evt.dramatic_function) + '</span>';
      }
      html += '</div>';
    }
  }

  html += '<h2>📑 章节摘要</h2><div class="chapter-grid">';
  for (const ch of chapters) {
    html += '<div class="chapter-card"><span class="chapter-num">' + ch.chapter_number + '</span><strong>' + (ch.chapter_title || '第 ' + ch.chapter_number + ' 章') + '</strong><div style="font-size:11px;color:#999">' + ch.paragraph_count + ' 段</div><div style="font-size:12px;color:#555;margin-top:4px">' + ch.summary + '</div>';
    if (ch.characters_appeared && ch.characters_appeared.length > 0) {
      html += '<div style="font-size:11px;color:#999;margin-top:4px">出场: ' + ch.characters_appeared.join(', ') + '</div>';
    }
    html += '</div>';
  }
  html += '</div><div class="footer">本报告由 AI 辅助生成 · 初稿</div></body></html>';

  return html;
}
