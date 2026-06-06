// ============================================================================
// planExport — 改编规划导出 (PDF + HTML)
// 仅导出 AdaptationPlan 的内容，不包含其他阶段数据
// ============================================================================

import type { AdaptationPlan } from '@/schema/types';

export function exportPlanPdf(): void {
  if (!document.getElementById('plan-print-style')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'plan-print-style';
    styleEl.textContent = getPlanPrintCss();
    document.head.appendChild(styleEl);
  }
  addPlanWatermark();
  window.print();
  setTimeout(removePlanWatermark, 1000);
}

export function exportPlanHtml(plan: AdaptationPlan, title: string): void {
  const html = buildPlanHtml(plan, title);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = title + '-改编规划.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function addPlanWatermark(): void {
  removePlanWatermark();
  const wm = document.createElement('div');
  wm.id = 'plan-watermark';
  wm.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;display:flex;align-items:center;justify-content:center;opacity:0.04;font-size:72px;font-weight:bold;transform:rotate(-30deg);color:#000;font-family:sans-serif';
  wm.textContent = 'AI 辅助生成 / 初稿';
  document.body.appendChild(wm);
}

function removePlanWatermark(): void {
  const el = document.getElementById('plan-watermark');
  if (el) el.remove();
}

function getPlanPrintCss(): string {
  return '@media print { @page { size: A4; margin: 2cm 2cm 2cm 2cm; } @page :first { margin-top: 3cm; } @page { @top-right { content: counter(page); font-family: "Microsoft YaHei", sans-serif; font-size: 10pt; color: #999; } } @page :first { @top-right { content: none; } } body > * { visibility: hidden !important; } #plan-print-view, #plan-print-view * { visibility: visible !important; } #plan-print-view { position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; display: block !important; font-family: "Microsoft YaHei", "PingFang SC", sans-serif; font-size: 11pt; line-height: 1.7; color: #333; background: #fff !important; } #plan-print-view h1 { font-size: 20pt; text-align: center; margin-bottom: 8pt; } #plan-print-view h2 { font-size: 14pt; margin-top: 18pt; margin-bottom: 8pt; border-bottom: 1pt solid #ccc; padding-bottom: 4pt; } #plan-print-view h3 { font-size: 12pt; margin-top: 12pt; margin-bottom: 4pt; } .page-break-before { page-break-before: always; } #plan-watermark { position: fixed !important; visibility: visible !important; opacity: 0.04 !important; z-index: 9999; } } @media screen { #plan-watermark { display: none; } }';
}

function buildPlanHtml(plan: AdaptationPlan, title: string): string {
  const strategy = plan.adaptation_strategy;
  const acts = plan.episode_plan.acts;
  const scenePlan = plan.scene_plan;
  const chars = plan.characters_draft ?? [];
  const dateStr = new Date().toLocaleDateString('zh-CN');

  const css = '<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:"Microsoft YaHei","PingFang SC",sans-serif;font-size:14px;line-height:1.7;color:#333;max-width:900px;margin:0 auto;padding:40px 24px;background:#fff}h1{font-size:24px;text-align:center;margin-bottom:4px}.subtitle{text-align:center;color:#888;font-size:13px;margin-bottom:32px}h2{font-size:16px;margin:28px 0 12px;border-bottom:1px solid #e0e0e0;padding-bottom:6px}h3{font-size:14px;margin:16px 0 8px}.stat-row{display:flex;gap:24px;justify-content:center;padding:16px;background:#f9f9f9;border-radius:6px;margin-bottom:24px}.stat-item{text-align:center}.stat-value{font-size:22px;font-weight:700;color:#1976d2}.stat-label{font-size:12px;color:#888}.strategy-card{padding:10px 14px;border-left:3px solid #1976d2;background:#fafafa;margin-bottom:8px}.decision-card{padding:8px 12px;margin-bottom:6px;border-left:3px solid #2196f3;background:#fafafa}.impact-high{background:#f44336;color:#fff;padding:1px 6px;border-radius:3px;font-size:10px;margin-left:8px}.impact-medium{background:#ff9800;color:#fff;padding:1px 6px;border-radius:3px;font-size:10px;margin-left:8px}.impact-low{background:#4caf50;color:#fff;padding:1px 6px;border-radius:3px;font-size:10px;margin-left:8px}.action-keep{background:#4caf50;color:#fff;padding:1px 6px;border-radius:3px;font-size:10px;margin-left:8px}.action-cut{background:#f44336;color:#fff;padding:1px 6px;border-radius:3px;font-size:10px;margin-left:8px}.action-merge{background:#ff9800;color:#fff;padding:1px 6px;border-radius:3px;font-size:10px;margin-left:8px}.action-other{background:#2196f3;color:#fff;padding:1px 6px;border-radius:3px;font-size:10px;margin-left:8px}.act-card{padding:10px 14px;margin-bottom:10px;background:#fafafa;border-radius:4px;border-left:3px solid #673ab7}.scene-card{padding:10px 14px;margin-bottom:8px;background:#fafafa;border-radius:4px;border-left:3px solid #4caf50}.func-badge{display:inline-block;padding:1px 6px;border-radius:3px;color:#fff;font-size:10px;background:#2196f3}.footer{margin-top:40px;text-align:center;font-size:12px;color:#bbb;border-top:1px solid #eee;padding-top:16px}</style>';

  const dfLabels: Record<string, string> = {
    exposition: '说明', inciting_incident: '激励事件', rising_action: '上升', midpoint: '中点', climax: '高潮', falling_action: '下落', resolution: '结局', other: '其他',
  };
  const actLabels: Record<string, string> = { setup: '建置', confrontation: '对抗', resolution: '解决', other: '其他' };

  let html = '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>' + title + ' - 改编规划</title>' + css + '</head><body><h1>🎬 ' + title + '</h1><p class="subtitle">改编规划 · ' + dateStr + '</p>';

  // 统计条
  html += '<div class="stat-row"><div class="stat-item"><div class="stat-value">' + acts.length + '</div><div class="stat-label">幕</div></div><div class="stat-item"><div class="stat-value">' + scenePlan.length + '</div><div class="stat-label">场景</div></div><div class="stat-item"><div class="stat-value">' + chars.length + '</div><div class="stat-label">人物</div></div><div class="stat-item"><div class="stat-value">' + strategy.target_medium + '</div><div class="stat-label">目标媒介</div></div></div>';

  // 改编策略
  html += '<h2>改编策略</h2>';
  html += '<div class="strategy-card"><strong>基调映射：</strong>' + strategy.tone_adaptation.source_tone + ' → ' + strategy.tone_adaptation.target_tone + (strategy.tone_adaptation.notes ? '（' + strategy.tone_adaptation.notes + '）' : '') + '</div>';
  if (strategy.externalization_strategy) {
    html += '<div class="strategy-card" style="border-left-color:#ff9800"><strong>外化策略：</strong>' + strategy.externalization_strategy + '</div>';
  }
  if (strategy.pacing_strategy) {
    html += '<div class="strategy-card" style="border-left-color:#4caf50"><strong>节奏：</strong>' + strategy.pacing_strategy.overall_pacing + ' · 高张力比 ' + strategy.pacing_strategy.high_tension_ratio + '</div>';
  }

  // 结构决策
  if (strategy.structural_decisions.length > 0) {
    html += '<h2>结构改编决策</h2>';
    for (const d of strategy.structural_decisions) {
      html += '<div class="decision-card"><strong>' + d.decision + '</strong><span class="impact-' + d.impact + '">' + d.impact + '</span><div style="font-size:12px;color:#555;margin-top:4px">' + d.rationale + '</div></div>';
    }
  }

  // 人物决策
  if ((strategy.character_adaptations?.length ?? 0) > 0) {
    html += '<h2>人物改编决策</h2>';
    for (const ca of (strategy.character_adaptations ?? [])) {
      const actionClass = ca.action === 'keep' ? 'action-keep' : ca.action === 'cut' ? 'action-cut' : ca.action === 'merge' ? 'action-merge' : 'action-other';
      html += '<div style="padding:6px 10px;margin-bottom:4px;background:#fafafa;border-radius:4px"><strong>' + ca.character_id + '</strong><span class="' + actionClass + '">' + ca.action + '</span>' + (ca.notes ? '<span style="font-size:11px;color:#888;margin-left:8px">' + ca.notes + '</span>' : '') + '</div>';
    }
  }

  // 幕结构
  html += '<h2>幕结构</h2>';
  for (const act of acts) {
    const actScenes = scenePlan.filter(sp => sp.act_number === act.act_number);
    html += '<div class="act-card"><h3>第 ' + act.act_number + ' 幕：' + (act.act_title ?? '') + ' <span style="font-size:10px;color:#888;font-weight:400">(' + (actLabels[act.act_type] ?? act.act_type) + ' · ' + (act.estimated_scene_count ?? actScenes.length) + ' 场景 · ~' + (act.estimated_duration_minutes ?? '?') + ' 分钟)</span></h3><p style="font-size:12px;color:#555">' + (act.synopsis ?? '') + '</p>' + (act.source_chapters?.length ? '<div style="font-size:10px;color:#999">改编自第 ' + act.source_chapters.join(', ') + ' 章</div>' : '') + '</div>';
  }

  // 场景大纲
  html += '<h2>场景大纲（' + scenePlan.length + ' 场）</h2>';
  for (const sp of scenePlan) {
    html += '<div class="scene-card"><div style="display:flex;justify-content:space-between"><strong>场景 ' + sp.scene_global_number + '</strong><span style="font-size:10px">第 ' + sp.act_number + ' 幕 <span class="func-badge">' + (dfLabels[sp.dramatic_function ?? 'other'] ?? sp.dramatic_function) + '</span></span></div><div style="font-size:11px;color:#888">' + sp.location.interior_exterior + '. ' + sp.location.name + ' — ' + sp.time_of_day + '</div><p style="font-size:12px;color:#555">' + (sp.synopsis ?? '') + '</p><div style="font-size:10px;color:#999">张力: ' + '⭐'.repeat(sp.tension_level ?? 0) + ' · ' + (sp.characters_present?.join(', ') ?? '') + (sp.beat_plan?.estimated_beat_count ? ' · ~' + sp.beat_plan.estimated_beat_count + ' beats' : '') + '</div></div>';
  }

  html += '<div class="footer">本规划由 AI 辅助生成 · 初稿</div></body></html>';
  return html;
}
