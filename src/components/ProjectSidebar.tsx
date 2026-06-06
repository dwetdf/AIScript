// ============================================================================
// ProjectSidebar — 项目管理侧边栏
// 列出所有小说项目，支持折叠子阶段、重命名、删除
// ============================================================================

import React, { useState, useRef, useEffect } from 'react';
import { useProjectStore } from '../store';
import { type AppSection } from './AppShell';

interface Props {
  currentSection: AppSection;
  onNavigate: (section: AppSection) => void;
}

const PHASE_LABELS: Array<{ phase: AppSection; icon: string; label: string }> = [
  { phase: 'analysis_overview', icon: '📊', label: '阶段1: 分析' },
  { phase: 'plan_overview', icon: '🎬', label: '阶段2: 规划' },
  { phase: 'script_edit', icon: '📝', label: '阶段3: 剧本' },
];

export const ProjectSidebar: React.FC<Props> = ({
  currentSection,
  onNavigate,
}) => {
  const projects = useProjectStore((s) => s.projects);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const setActiveProject = useProjectStore((s) => s.setActiveProject);
  const removeProject = useProjectStore((s) => s.removeProject);
  const renameProject = useProjectStore((s) => s.renameProject);

  // 折叠状态：默认全部折叠，读取 localStorage 记忆
  // （在 Set 中 = 已折叠，不在 Set 中 = 已展开）
  const STORAGE_KEY_COLLAPSED = 'aiscript_sidebar_collapsed';
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_COLLAPSED);
      if (raw) return new Set<string>(JSON.parse(raw));
    } catch { /* ignore */ }
    // 默认全部折叠
    return new Set<string>(projects.map((p) => p.id));
  });

  // 新增项目时：默认折叠
  useEffect(() => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const p of projects) {
        if (!next.has(p.id)) { next.add(p.id); changed = true; }
      }
      return changed ? next : prev;
    });
  }, [projects]);

  // 折叠状态变更时持久化
  const persistCollapsed = (ids: Set<string>) => {
    try {
      localStorage.setItem(STORAGE_KEY_COLLAPSED, JSON.stringify([...ids]));
    } catch { /* ignore */ }
  };
  // 重命名状态
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);
  // 删除确认
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  // hover 操作按钮
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // 自动 focus 重命名输入框
  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

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

  const handleToggleCollapse = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      persistCollapsed(next);
      return next;
    });
  };

  const handleStartRename = (e: React.MouseEvent, projectId: string, currentTitle: string) => {
    e.stopPropagation();
    setRenamingId(projectId);
    setRenameValue(currentTitle);
    setDeleteConfirmId(null); // 关闭删除确认
  };

  const handleConfirmRename = () => {
    if (renamingId && renameValue.trim()) {
      renameProject(renamingId, renameValue.trim());
    }
    setRenamingId(null);
    setRenameValue('');
  };

  const handleCancelRename = () => {
    setRenamingId(null);
    setRenameValue('');
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleConfirmRename();
    if (e.key === 'Escape') handleCancelRename();
  };

  const handleStartDelete = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    setDeleteConfirmId(projectId);
    setRenamingId(null); // 关闭重命名
  };

  const handleConfirmDelete = (projectId: string) => {
    removeProject(projectId);
    setDeleteConfirmId(null);
  };

  const handleCancelDelete = () => {
    setDeleteConfirmId(null);
  };

  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ padding: '8px 14px', fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: 1 }}>
        📖 我的项目
      </div>

      {projects.map((proj) => {
        const isActive = proj.id === activeProjectId;
        const isCollapsed = collapsedIds.has(proj.id);
        const isHovered = hoveredId === proj.id;
        const isRenaming = renamingId === proj.id;
        const isConfirmingDelete = deleteConfirmId === proj.id;
        const phaseLevel = phaseForProject(proj.id);
        const canShowPhase2 = phaseLevel === 'analyzed' || phaseLevel === 'planned' || phaseLevel === 'scripted';
        const canShowPhase3 = phaseLevel === 'planned' || phaseLevel === 'scripted';

        return (
          <div key={proj.id}>
            {/* 项目名称行 */}
            <div
              onClick={() => handleProjectClick(proj.id)}
              onMouseEnter={() => setHoveredId(proj.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                ...treeItemStyle,
                background: isActive ? '#e3f2fd' : 'transparent',
                color: isActive ? '#1565c0' : '#444',
                fontWeight: isActive ? 600 : 400,
                borderLeft: isActive ? '3px solid #1976d2' : '3px solid transparent',
              }}
              title={proj.author ? `${proj.title} — ${proj.author}` : proj.title}
            >
              {/* 折叠/展开箭头 */}
              <span
                onClick={(e) => handleToggleCollapse(e, proj.id)}
                style={{
                  marginRight: 4,
                  fontSize: 11,
                  color: '#999',
                  cursor: 'pointer',
                  flexShrink: 0,
                  width: 16,
                  textAlign: 'center',
                  userSelect: 'none',
                  lineHeight: '18px',
                }}
              >
                {isCollapsed ? '▸' : '▾'}
              </span>

              {/* 图标 */}
              <span style={{ marginRight: 6 }}>📖</span>

              {/* 标题 或 重命名输入框 */}
              {isRenaming ? (
                <input
                  ref={renameInputRef}
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={handleRenameKeyDown}
                  onBlur={handleCancelRename}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    flex: 1,
                    fontSize: 13,
                    border: '1px solid #1976d2',
                    borderRadius: 4,
                    padding: '2px 6px',
                    outline: 'none',
                    minWidth: 0,
                  }}
                />
              ) : (
                <span style={{
                  fontSize: 13,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                  minWidth: 0,
                }}>
                  {proj.title}
                </span>
              )}

              {/* Hover 操作按钮 */}
              {isHovered && !isRenaming && !isConfirmingDelete && (
                <div style={{ display: 'flex', gap: 2, flexShrink: 0, marginLeft: 4 }}>
                  <button
                    onClick={(e) => handleStartRename(e, proj.id, proj.title)}
                    style={iconBtn}
                    title="重命名"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={(e) => handleStartDelete(e, proj.id)}
                    style={iconBtn}
                    title="删除项目"
                  >
                    🗑️
                  </button>
                </div>
              )}
            </div>

            {/* 阶段子项（折叠时隐藏） */}
            {!isCollapsed && !isConfirmingDelete && (
              <div style={{ marginLeft: 0 }}>
                {PHASE_LABELS.map((pl) => {
                  let enabled = false;
                  if (pl.phase === 'analysis_overview') enabled = true;
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
            )}

            {/* 删除确认行 */}
            {isConfirmingDelete && (
              <div style={{ padding: '6px 14px 6px 36px', fontSize: 12 }}>
                <div style={{
                  padding: '8px 10px',
                  background: '#fff3e0',
                  borderRadius: 6,
                  border: '1px solid #ffe0b2',
                }}>
                  <div style={{ marginBottom: 6, color: '#e65100' }}>
                    删除「{proj.title}」？
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => handleConfirmDelete(proj.id)} style={confirmDeleteBtn}>
                      确认删除
                    </button>
                    <button onClick={handleCancelDelete} style={cancelBtn}>
                      取消
                    </button>
                  </div>
                </div>
              </div>
            )}
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
        <span style={{ marginRight: 6, width: 14, fontSize: 10 }}></span>
        <span style={{ marginRight: 6 }}>＋</span>
        <span style={{ fontSize: 13 }}>导入新小说</span>
      </div>
    </div>
  );
};

const treeItemStyle: React.CSSProperties = {
  padding: '8px 14px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  transition: 'background 0.15s',
  userSelect: 'none',
};

const iconBtn: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  padding: '2px 4px',
  fontSize: 11,
  borderRadius: 3,
  lineHeight: 1,
};

const confirmDeleteBtn: React.CSSProperties = {
  padding: '3px 10px',
  border: 'none',
  borderRadius: 4,
  background: '#d32f2f',
  color: '#fff',
  fontSize: 11,
  cursor: 'pointer',
  fontWeight: 600,
};

const cancelBtn: React.CSSProperties = {
  padding: '3px 10px',
  border: '1px solid #d0d0d0',
  borderRadius: 4,
  background: '#fff',
  fontSize: 11,
  cursor: 'pointer',
  color: '#555',
};