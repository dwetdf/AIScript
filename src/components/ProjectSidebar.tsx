// ============================================================================
// ProjectSidebar — 项目管理侧边栏
// 列出所有小说项目，每项展开 3 个阶段
// ============================================================================

import React from 'react';
import { useProjectStore } from '../store';
import { type AppSection } from './AppShell';

interface Props {
  currentSection: AppSection;
  onNavigate: (section: AppSection) => void;
  onExport?: () => void;
  onImport?: () => void;
  hasProjectData?: boolean;
}

const PHASE_LABELS: Array<{ phase: AppSection; icon: string; label: string }> = [
  { phase: 'analysis_overview', icon: '📊', label: '阶段1: 分析' },
  { phase: 'plan_overview', icon: '🎬', label: '阶段2: 规划' },
  { phase: 'script_edit', icon: '📝', label: '阶段3: 剧本' },
];

export const ProjectSidebar: React.FC<Props> = ({
  currentSection,
  onNavigate,
  onExport,
  onImport,
  hasProjectData,
}) => {
  const projects = useProjectStore((s) => s.projects);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const setActiveProject = useProjectStore((s) => s.setActiveProject);

  const phaseForProject = (projectId: string): string => {
    const p = projects.find((pr) => pr.id === projectId);
    return p?.phase || 'imported';
  };

  const isPhaseActive = (phase: AppSection): boolean => {
    if (phase === 'analysis_overview') return currentSection.startsWith('analysis_');
    if (phase === 'plan_overview') return currentSection.startsWith('plan_');
    if (phase === 'script_edit') return currentSection.startsWith('script_');
    return false;
  };

  const handleProjectClick = (projectId: string) => {
    setActiveProject(projectId);
  };

  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ padding: '8px 14px', fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: 1 }}>
        📖 我的项目
      </div>

      {projects.map((proj) => {
        const isActive = proj.id === activeProjectId;
        const phaseLevel = phaseForProject(proj.id);
        const canShowPhase2 = phaseLevel === 'analyzed' || phaseLevel === 'planned' || phaseLevel === 'scripted';
        const canShowPhase3 = phaseLevel === 'planned' || phaseLevel === 'scripted';

        return (
          <div key={proj.id}>
            {/* 项目名称 */}
            <div
              onClick={() => handleProjectClick(proj.id)}
              style={{
                ...treeItemStyle,
                background: isActive ? '#e3f2fd' : 'transparent',
                color: isActive ? '#1565c0' : '#444',
                fontWeight: isActive ? 600 : 400,
                borderLeft: isActive ? '3px solid #1976d2' : '3px solid transparent',
              }}
              title={proj.author ? `${proj.title} — ${proj.author}` : proj.title}
            >
              <span style={{ marginRight: 6 }}>📖</span>
              <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {proj.title}
              </span>
            </div>

            {/* 阶段子项 */}
            <div style={{ marginLeft: 0 }}>
              {PHASE_LABELS.map((pl) => {
                // 根据项目进度决定是否启用
                let enabled = false;
                if (pl.phase === 'analysis_overview') enabled = true; // 阶段1 始终可用
                else if (pl.phase === 'plan_overview') enabled = canShowPhase2;
                else if (pl.phase === 'script_edit') enabled = canShowPhase3;

                const active = isActive && isPhaseActive(pl.phase);

                return (
                  <div
                    key={pl.phase}
                    onClick={() => {
                      if (!enabled) return;
                      handleProjectClick(proj.id);
                      onNavigate(pl.phase);
                    }}
                    style={{
                      ...treeItemStyle,
                      paddingLeft: 36,
                      fontSize: 12,
                      background: active ? '#e8f5e9' : 'transparent',
                      color: enabled ? (active ? '#2e7d32' : '#555') : '#ccc',
                      fontWeight: active ? 500 : 400,
                      cursor: enabled ? 'pointer' : 'default',
                      opacity: enabled ? 1 : 0.5,
                    }}
                  >
                    <span style={{ marginRight: 6 }}>{pl.icon}</span>
                    {pl.label}
                    {enabled && active && (
                      <span style={{ marginLeft: 'auto', fontSize: 10, color: '#4caf50' }}>●</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <hr style={{ border: 'none', borderTop: '1px solid #e8e8e8', margin: '8px 14px' }} />

      {/* 导入新小说 */}
      <div
        onClick={() => onNavigate('import')}
        style={{
          ...treeItemStyle,
          color: currentSection === 'import' ? '#1565c0' : '#1976d2',
          fontWeight: currentSection === 'import' ? 600 : 400,
          borderLeft: currentSection === 'import' ? '3px solid #1976d2' : '3px solid transparent',
          background: currentSection === 'import' ? '#e3f2fd' : 'transparent',
        }}
      >
        <span style={{ marginRight: 6 }}>＋</span>
        <span style={{ fontSize: 13 }}>导入新小说</span>
      </div>

      {/* 设置 */}
      <div
        onClick={() => onNavigate('settings')}
        style={{
          ...treeItemStyle,
          color: currentSection === 'settings' ? '#1565c0' : '#666',
          fontWeight: currentSection === 'settings' ? 600 : 400,
          borderLeft: currentSection === 'settings' ? '3px solid #1976d2' : '3px solid transparent',
          background: currentSection === 'settings' ? '#e3f2fd' : 'transparent',
        }}
      >
        <span style={{ marginRight: 6 }}>⚙️</span>
        <span style={{ fontSize: 13 }}>设置</span>
      </div>

      {/* 导入/导出操作 */}
      {hasProjectData && (
        <div style={{ padding: '8px 14px 0' }}>
          {onImport && (
            <button onClick={onImport} style={actionBtn}>📥 导入项目</button>
          )}
          {onExport && (
            <button onClick={onExport} style={{ ...actionBtn, marginTop: 4 }}>📤 导出项目</button>
          )}
        </div>
      )}
    </div>
  );
};

const treeItemStyle: React.CSSProperties = {
  padding: '8px 14px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  transition: 'background 0.15s',
};

const actionBtn: React.CSSProperties = {
  width: '100%',
  background: 'transparent',
  border: '1px solid #d0d0d0',
  borderRadius: 6,
  fontSize: 12,
  cursor: 'pointer',
  padding: '5px 10px',
  color: '#555',
};