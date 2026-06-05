// ============================================================================
// AppShell — 全局布局壳
// 面包屑导航 + 左侧树形导航 + 底部状态栏
// ============================================================================

import React from 'react';
import { useEditorStore, useAnalysisStore, usePlanStore, useScriptStore } from '@/store';

export type AppSection =
  | 'import'
  | 'settings'
  | 'analysis_overview'
  | 'analysis_theme'
  | 'analysis_characters'
  | 'analysis_plot'
  | 'analysis_chapters'
  | 'plan_overview'
  | 'plan_strategy'
  | 'plan_acts'
  | 'plan_scenes'
  | 'script_edit'
  | 'script_characters';

interface Props {
  currentSection: AppSection;
  onNavigate: (section: AppSection) => void;
  children: React.ReactNode;
}

/** 面包屑映射 */
const BREADCRUMB_MAP: Record<AppSection, string[]> = {
  import: ['📖 导入小说'],
  settings: ['⚙️ 设置'],
  analysis_overview: ['📖 棋王', '📊 阶段1: 小说分析'],
  analysis_theme: ['📖 棋王', '📊 阶段1: 小说分析', '主题'],
  analysis_characters: ['📖 棋王', '📊 阶段1: 小说分析', '人物'],
  analysis_plot: ['📖 棋王', '📊 阶段1: 小说分析', '剧情'],
  analysis_chapters: ['📖 棋王', '📊 阶段1: 小说分析', '章节'],
  plan_overview: ['📖 棋王', '🎬 阶段2: 改编规划'],
  plan_strategy: ['📖 棋王', '🎬 阶段2: 改编规划', '策略'],
  plan_acts: ['📖 棋王', '🎬 阶段2: 改编规划', '幕结构'],
  plan_scenes: ['📖 棋王', '🎬 阶段2: 改编规划', '场景大纲'],
  script_edit: ['📖 棋王', '📝 阶段3: 剧本编辑'],
  script_characters: ['📖 棋王', '📝 阶段3: 剧本编辑', '人物表'],
};

/** 侧边树节点 */
interface TreeNode {
  id: AppSection;
  label: string;
  icon: string;
  children?: TreeNode[];
}

export const AppShell: React.FC<Props> = ({ currentSection, onNavigate, children }) => {
  const analysis = useAnalysisStore((s) => s.analysis);
  const plan = usePlanStore((s) => s.plan);
  const screenplay = useScriptStore((s) => s.screenplay);
  const isProcessing = useEditorStore((s) => s.isProcessing);
  const processingStep = useEditorStore((s) => s.processingStep);

  const breadcrumb = BREADCRUMB_MAP[currentSection] || [];

  // 动态构建树
  const tree: TreeNode[] = [
    { id: 'import', label: '导入小说', icon: '📖' },
  ];

  if (analysis) {
    tree.push({
      id: 'analysis_overview', label: '阶段1: 小说分析', icon: '📊',
      children: [
        { id: 'analysis_overview', label: '概览', icon: '📋' },
        { id: 'analysis_theme', label: '主题', icon: '🏷️' },
        { id: 'analysis_characters', label: `人物 (${analysis.character_analysis.length})`, icon: '👥' },
        { id: 'analysis_plot', label: `剧情 (${analysis.plot_analysis.key_events.length} 事件)`, icon: '📈' },
        { id: 'analysis_chapters', label: `章节 (${analysis.chapter_summaries.length})`, icon: '📑' },
      ],
    });
  }

  if (plan) {
    tree.push({
      id: 'plan_overview', label: '阶段2: 改编规划', icon: '🎬',
      children: [
        { id: 'plan_overview', label: '概览', icon: '📋' },
        { id: 'plan_strategy', label: '改编策略', icon: '🎯' },
        { id: 'plan_acts', label: `幕结构 (${plan.episode_plan.total_acts} 幕)`, icon: '📐' },
        { id: 'plan_scenes', label: `场景大纲 (${plan.scene_plan.length})`, icon: '🎞️' },
      ],
    });
  }

  if (screenplay) {
    tree.push({
      id: 'script_edit', label: '阶段3: 剧本编辑', icon: '📝',
      children: [
        ...screenplay.acts.map((act) => ({
          id: 'script_edit' as AppSection,
          label: `${act.act_title || `第${act.act_number}幕`} (${act.scenes.length} 场)`,
          icon: '🎭',
        })),
        { id: 'script_characters' as AppSection, label: `人物表 (${screenplay.characters.length})`, icon: '👤' },
      ],
    });
  }

  const isActive = (id: AppSection) => currentSection === id;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'system-ui' }}>
      {/* ======== Header: 面包屑 + 齿轮 ======== */}
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
          {breadcrumb.map((crumb, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span style={{ color: '#ccc' }}>›</span>}
              <span
                style={{
                  fontSize: 13,
                  color: i === breadcrumb.length - 1 ? '#333' : '#1976d2',
                  cursor: i < breadcrumb.length - 1 ? 'pointer' : 'default',
                  fontWeight: i === breadcrumb.length - 1 ? 600 : 400,
                }}
                onClick={() => {
                  if (i === 0) onNavigate('import');
                  else if (i === 1 && analysis) onNavigate('analysis_overview');
                }}
              >
                {crumb}
              </span>
            </React.Fragment>
          ))}
          {isProcessing && (
            <span style={{ marginLeft: 16, fontSize: 12, color: '#e65100', animation: 'pulse 1.5s infinite' }}>
              ⏳ {processingStep}
            </span>
          )}
        </div>
        <button
          onClick={() => onNavigate('settings')}
          style={gearBtn}
          title="设置"
        >
          ⚙️
        </button>
      </div>

      {/* ======== Body: 左侧树 + 右侧内容 ======== */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* 左侧树 */}
        <nav style={sidebarStyle}>
          <div style={{ padding: '8px 12px', fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: 1 }}>
            项目结构
          </div>
          {tree.map((node) => (
            <div key={node.id}>
              <div
                onClick={() => onNavigate(node.id)}
                style={{
                  ...treeItemStyle,
                  background: isActive(node.id) ? '#e3f2fd' : 'transparent',
                  color: isActive(node.id) ? '#1565c0' : '#444',
                  fontWeight: isActive(node.id) ? 600 : 400,
                  borderLeft: isActive(node.id) ? '3px solid #1976d2' : '3px solid transparent',
                }}
              >
                <span style={{ marginRight: 6 }}>{node.icon}</span>
                <span style={{ fontSize: 13 }}>{node.label}</span>
              </div>
              {node.children && node.children.map((child, ci) => (
                <div
                  key={`${child.id}-${ci}`}
                  onClick={() => onNavigate(child.id)}
                  style={{
                    ...treeItemStyle,
                    paddingLeft: 36,
                    fontSize: 12,
                    background: isActive(child.id) ? '#e8f5e9' : 'transparent',
                    color: isActive(child.id) ? '#2e7d32' : '#666',
                    fontWeight: isActive(child.id) ? 500 : 400,
                  }}
                >
                  <span style={{ marginRight: 6 }}>{child.icon}</span>
                  {child.label}
                </div>
              ))}
            </div>
          ))}
        </nav>

        {/* 中间主内容 */}
        <main style={{ flex: 1, overflow: 'auto', background: '#fafafa' }}>
          {children}
        </main>
      </div>

      {/* ======== 底部状态栏 ======== */}
      <footer style={footerStyle}>
        <span>
          {screenplay ? `📝 ${screenplay.metadata.title} · ${screenplay.acts.reduce((s, a) => s + a.scenes.reduce((ss, sc) => ss + sc.beats.length, 0), 0)} beats` : '尚未生成剧本'}
        </span>
        <span style={{ color: '#bbb' }}>
          {isProcessing ? '⏳ 处理中' : '✅ 就绪'} · v0.2.0
        </span>
      </footer>
    </div>
  );
};

// ====== Styles ======

const headerStyle: React.CSSProperties = {
  height: 48,
  display: 'flex',
  alignItems: 'center',
  padding: '0 20px',
  borderBottom: '1px solid #e0e0e0',
  background: '#fff',
  flexShrink: 0,
};

const gearBtn: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  fontSize: 20,
  cursor: 'pointer',
  padding: '4px 8px',
  borderRadius: 6,
};

const sidebarStyle: React.CSSProperties = {
  width: 220,
  borderRight: '1px solid #e8e8e8',
  overflow: 'auto',
  background: '#fafafa',
  flexShrink: 0,
  paddingTop: 4,
};

const treeItemStyle: React.CSSProperties = {
  padding: '8px 14px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  transition: 'background 0.15s',
  borderRadius: 0,
};

const footerStyle: React.CSSProperties = {
  height: 28,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 20px',
  borderTop: '1px solid #e8e8e8',
  background: '#fff',
  fontSize: 11,
  color: '#888',
  flexShrink: 0,
};
