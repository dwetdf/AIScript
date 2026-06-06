// ============================================================================
// AppShell — 全局布局壳
// 面包屑 + 侧边栏 + 内容区 + 底部状态栏
// ============================================================================

import React from 'react';

// ---- 导航类型 ----

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

// ---- 面包屑 ----

export interface BreadcrumbItem {
  label: string;
  target: AppSection | null;
}

export function deriveBreadcrumb(section: AppSection, projectTitle: string): BreadcrumbItem[] {
  const title = projectTitle || '未命名项目';

  const subLabels: Partial<Record<AppSection, string>> = {
    analysis_overview: '概览',
    analysis_theme: '主题',
    analysis_characters: '人物',
    analysis_plot: '剧情',
    analysis_chapters: '章节',
    plan_overview: '概览',
    plan_strategy: '改编策略',
    plan_acts: '幕结构',
    plan_scenes: '场景大纲',
    script_edit: '剧本编辑',
    script_characters: '人物表',
  };

  if (section === 'import') {
    return [{ label: '📖 导入小说', target: null }];
  }
  if (section === 'settings') {
    return [{ label: '⚙️ 设置', target: null }];
  }

  if (section.startsWith('analysis_')) {
    const items: BreadcrumbItem[] = [
      { label: `📖 ${title}`, target: 'analysis_overview' },
      { label: '📊 阶段1: 小说分析', target: 'analysis_overview' },
    ];
    const sub = subLabels[section];
    if (sub && section !== 'analysis_overview') {
      items.push({ label: sub, target: null });
    }
    return items;
  }

  if (section.startsWith('plan_')) {
    const items: BreadcrumbItem[] = [
      { label: `📖 ${title}`, target: 'analysis_overview' },
      { label: '🎬 阶段2: 改编规划', target: 'plan_overview' },
    ];
    const sub = subLabels[section];
    if (sub && section !== 'plan_overview') {
      items.push({ label: sub, target: null });
    }
    return items;
  }

  if (section.startsWith('script_')) {
    const items: BreadcrumbItem[] = [
      { label: `📖 ${title}`, target: 'analysis_overview' },
      { label: '📝 阶段3: 剧本编辑', target: 'script_edit' },
    ];
    const sub = subLabels[section];
    if (sub && section !== 'script_edit') {
      items.push({ label: sub, target: null });
    }
    return items;
  }

  return [{ label: `📖 ${title}`, target: null }];
}

// ---- Shell Props ----

interface ShellProps {
  breadcrumb: BreadcrumbItem[];
  sidebar: React.ReactNode;
  children: React.ReactNode;
  processing?: { step: string };
  statusBar?: { left: string; right: string };
  headerActions?: React.ReactNode;
  onNavigate: (section: AppSection) => void;
}

export const AppShell: React.FC<ShellProps> = ({
  breadcrumb,
  sidebar,
  children,
  processing,
  statusBar,
  headerActions,
  onNavigate,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'system-ui' }}>
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
          {breadcrumb.map((item, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span style={{ color: '#ccc' }}>›</span>}
              <span
                style={{
                  fontSize: 13,
                  color: item.target ? '#1976d2' : '#333',
                  cursor: item.target ? 'pointer' : 'default',
                  fontWeight: i === breadcrumb.length - 1 ? 600 : 400,
                }}
                onClick={() => item.target && onNavigate(item.target)}
              >
                {item.label}
              </span>
            </React.Fragment>
          ))}
          {processing && (
            <span style={{ marginLeft: 16, fontSize: 12, color: '#e65100', animation: 'pulse 1.5s infinite' }}>
              ⏳ {processing.step}
            </span>
          )}
        </div>
        {headerActions && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {headerActions}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <nav style={sidebarStyle}>
          {sidebar}
        </nav>
        <main style={{ flex: 1, overflow: 'auto', background: '#fafafa' }}>
          {children}
        </main>
      </div>

      <footer style={footerStyle}>
        <span>{statusBar?.left || ''}</span>
        <span style={{ color: '#bbb' }}>{statusBar?.right || ''}</span>
      </footer>
    </div>
  );
};

const headerStyle: React.CSSProperties = {
  height: 48, display: 'flex', alignItems: 'center', padding: '0 20px',
  borderBottom: '1px solid #e0e0e0', background: '#fff', flexShrink: 0,
};

const sidebarStyle: React.CSSProperties = {
  width: 240, borderRight: '1px solid #e8e8e8', overflow: 'auto',
  background: '#fafafa', flexShrink: 0,
};

const footerStyle: React.CSSProperties = {
  height: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '0 20px', borderTop: '1px solid #e8e8e8', background: '#fff',
  fontSize: 11, color: '#888', flexShrink: 0,
};