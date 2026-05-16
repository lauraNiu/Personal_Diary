import { useStore } from '../store';
import type { ViewName } from '../types';
import {
  Columns, GanttChart, Calendar, BarChart3, LayoutGrid,
  Battery, Activity, Users, FileText, Focus,
} from 'lucide-react';
import { Tooltip } from './Tooltip';
import clsx from 'clsx';

const VIEWS: { name: ViewName; label: string; icon: any; shortcut: string; desc: string }[] = [
  { name: 'kanban', label: '看板', icon: Columns, shortcut: '⌘1', desc: '三列拖拽：待办/进行中/完成' },
  { name: 'gantt', label: '甘特', icon: GanttChart, shortcut: '⌘2', desc: '横向时间轴，按项目分组' },
  { name: 'calendar', label: '日历', icon: Calendar, shortcut: '⌘3', desc: '月视图，按截止日期落点显示' },
  { name: 'stats', label: '统计', icon: BarChart3, shortcut: '⌘4', desc: '完成率、时间分布、趋势图' },
  { name: 'eisenhower', label: '四象限', icon: LayoutGrid, shortcut: '⌘5', desc: '紧急 × 重要 拖拽分类' },
  { name: 'capacity', label: '容量', icon: Battery, shortcut: '⌘6', desc: '今日/本周剩余工时' },
  { name: 'heatmap', label: '热力图', icon: Activity, shortcut: '⌘7', desc: '过去 90 天完成数热力图' },
  { name: 'collaborator', label: '协作者', icon: Users, shortcut: '⌘8', desc: '按人查看相关任务' },
  { name: 'paper', label: '论文', icon: FileText, shortcut: '⌘9', desc: 'Overleaf 同步 + 版本快照' },
  { name: 'focus', label: '专注', icon: Focus, shortcut: 'F', desc: '番茄钟全屏单任务' },
];

export function ViewTabs() {
  const { currentView, setCurrentView } = useStore();
  return (
    <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900
                    px-3 flex items-center gap-1 overflow-x-auto">
      {VIEWS.map(v => {
        const Icon = v.icon;
        const active = currentView === v.name;
        return (
          <Tooltip key={v.name} title={v.label} desc={v.desc} shortcut={v.shortcut}>
            <button
              onClick={() => setCurrentView(v.name)}
              className={clsx(
                'inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                active
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{v.label}</span>
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}
