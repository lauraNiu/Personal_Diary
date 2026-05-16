import { useStore } from '../store';
import { Inbox, Calendar, CalendarDays, Users, ChevronLeft, ChevronRight, HelpCircle, Plus, FileText, Sparkles } from 'lucide-react';
import { Tooltip } from './Tooltip';
import clsx from 'clsx';

export function Sidebar() {
  const {
    spaces, areas, projects, collaborators,
    selectedSpaceId, setSelectedSpace,
    selectedProjectId, setSelectedProject,
    selectedCollaboratorId, setSelectedCollaborator,
    sidebarCollapsed, toggleSidebar, toggleHelpPanel, toggleQuickCapture,
    currentView, setCurrentView,
  } = useStore();

  if (sidebarCollapsed) {
    return (
      <aside className="w-14 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col items-center py-3 gap-2">
        <Tooltip title="展开侧边栏" shortcut="⌘[" side="right">
          <button className="btn-icon" onClick={toggleSidebar}>
            <ChevronRight className="w-4 h-4" />
          </button>
        </Tooltip>
        <div className="w-full border-t border-slate-200 dark:border-slate-800 my-2" />
        {spaces.map(s => (
          <Tooltip key={s.id} title={s.name} desc="切换空间" side="right">
            <button
              className={clsx('btn-icon text-lg', selectedSpaceId === s.id && 'bg-slate-200 dark:bg-slate-800')}
              onClick={() => setSelectedSpace(s.id)}
            >
              {s.emoji}
            </button>
          </Tooltip>
        ))}
        <div className="flex-1" />
        <Tooltip title="帮助" shortcut="⌘/" side="right">
          <button className="btn-icon" onClick={toggleHelpPanel}>
            <HelpCircle className="w-4 h-4" />
          </button>
        </Tooltip>
      </aside>
    );
  }

  const filteredAreas = selectedSpaceId === 'all' ? areas : areas.filter(a => a.space_id === selectedSpaceId);
  const filteredProjects = selectedSpaceId === 'all' ? projects : projects.filter(p => p.space_id === selectedSpaceId);

  return (
    <aside className="w-60 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🧠</span>
          <span className="font-semibold">Life OS</span>
        </div>
        <Tooltip title="收起侧边栏" shortcut="⌘[" side="right">
          <button className="btn-icon" onClick={toggleSidebar}>
            <ChevronLeft className="w-4 h-4" />
          </button>
        </Tooltip>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-2">
        {/* 智能视图 */}
        <div className="space-y-0.5 mb-3">
          <button
            className={clsx('w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-slate-100 dark:hover:bg-slate-800',
              currentView === 'paper' && 'bg-slate-100 dark:bg-slate-800')}
            onClick={() => setCurrentView('paper')}
          >
            <FileText className="w-4 h-4" />
            <span>论文 Hub</span>
          </button>
        </div>

        {/* Spaces */}
        <div className="text-xs uppercase text-slate-500 px-2 py-1.5 mt-2">空间</div>
        <div className="space-y-0.5">
          <button
            className={clsx('w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-slate-100 dark:hover:bg-slate-800',
              selectedSpaceId === 'all' && 'bg-slate-100 dark:bg-slate-800 font-medium')}
            onClick={() => setSelectedSpace('all')}
          >
            <span>🌐</span>
            <span>全部</span>
          </button>
          {spaces.map(s => (
            <button
              key={s.id}
              className={clsx('w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-slate-100 dark:hover:bg-slate-800',
                selectedSpaceId === s.id && 'bg-slate-100 dark:bg-slate-800 font-medium')}
              onClick={() => setSelectedSpace(s.id)}
            >
              <span>{s.emoji}</span>
              <span style={{ color: selectedSpaceId === s.id ? s.color : undefined }}>{s.name}</span>
            </button>
          ))}
        </div>

        {/* Areas */}
        {filteredAreas.length > 0 && (
          <>
            <div className="text-xs uppercase text-slate-500 px-2 py-1.5 mt-3">分类</div>
            <div className="space-y-0.5">
              {filteredAreas.map(a => (
                <div key={a.id} className="px-2 py-1 text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: a.color || '#94A3B8' }} />
                  {a.name}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Projects */}
        <div className="text-xs uppercase text-slate-500 px-2 py-1.5 mt-3 flex items-center justify-between">
          <span>项目</span>
          <Tooltip title="新建项目" side="right">
            <button className="btn-icon w-5 h-5"><Plus className="w-3 h-3" /></button>
          </Tooltip>
        </div>
        <div className="space-y-0.5">
          {filteredProjects.map(p => (
            <button
              key={p.id}
              className={clsx('w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-slate-100 dark:hover:bg-slate-800',
                selectedProjectId === p.id && 'bg-slate-100 dark:bg-slate-800')}
              onClick={() => setSelectedProject(selectedProjectId === p.id ? null : p.id)}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
              <span className="truncate">{p.name}</span>
            </button>
          ))}
          {filteredProjects.length === 0 && (
            <div className="px-2 py-2 text-xs text-slate-400">暂无项目</div>
          )}
        </div>

        {/* 协作者 */}
        <div className="text-xs uppercase text-slate-500 px-2 py-1.5 mt-3 flex items-center justify-between">
          <span>协作者</span>
          <Tooltip title="管理协作者" desc="添加 / 编辑 / 删除" side="right">
            <button
              className="btn-icon w-5 h-5"
              onClick={() => { setSelectedCollaborator(null); setCurrentView('collaborator'); }}
            >
              <Plus className="w-3 h-3" />
            </button>
          </Tooltip>
        </div>
        <div className="space-y-0.5">
          {collaborators.map(c => (
            <button
              key={c.id}
              className={clsx('w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-slate-100 dark:hover:bg-slate-800',
                selectedCollaboratorId === c.id && 'bg-slate-100 dark:bg-slate-800')}
              onClick={() => {
                setSelectedCollaborator(selectedCollaboratorId === c.id ? null : c.id);
                setCurrentView('collaborator');
              }}
            >
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs text-white"
                    style={{ background: c.avatar_color }}>
                {c.name.charAt(0)}
              </span>
              <span className="truncate">{c.name}</span>
            </button>
          ))}
          {collaborators.length === 0 && (
            <div className="px-2 py-2 text-xs text-slate-400">还没有协作者</div>
          )}
        </div>

        {/* 智能筛选 */}
        <div className="text-xs uppercase text-slate-500 px-2 py-1.5 mt-3">收件箱</div>
        <div className="space-y-0.5">
          <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-slate-100 dark:hover:bg-slate-800">
            <Inbox className="w-4 h-4" />
            <span>📥 Inbox</span>
          </button>
          <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-slate-100 dark:hover:bg-slate-800">
            <Calendar className="w-4 h-4" />
            <span>📅 今日</span>
          </button>
          <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-slate-100 dark:hover:bg-slate-800">
            <CalendarDays className="w-4 h-4" />
            <span>📆 本周</span>
          </button>
          <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-slate-100 dark:hover:bg-slate-800">
            <Users className="w-4 h-4" />
            <span>👥 全部协作者</span>
          </button>
        </div>
      </nav>

      <div className="p-2 border-t border-slate-200 dark:border-slate-800 space-y-1">
        <Tooltip title="Quick Capture" desc="自然语言快速记录任务" shortcut="Q" side="right">
          <button className="btn-primary w-full justify-center" onClick={toggleQuickCapture}>
            <Sparkles className="w-4 h-4" />
            <span>AI 快速录入</span>
          </button>
        </Tooltip>
        <Tooltip title="帮助中心" shortcut="⌘/" side="right">
          <button className="btn-ghost w-full justify-center" onClick={toggleHelpPanel}>
            <HelpCircle className="w-4 h-4" />
            <span>帮助</span>
          </button>
        </Tooltip>
      </div>
    </aside>
  );
}
