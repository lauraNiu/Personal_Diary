import type { Task } from '../types';
import { useStore } from '../store';
import { PRIORITY_COLORS, dueDateColor, dueDateLabel } from '../utils';
import { CheckCircle2, Circle, Trash2 } from 'lucide-react';
import { Tooltip } from './Tooltip';
import clsx from 'clsx';

export function TaskCard({ task, dragHandleProps }: { task: Task; dragHandleProps?: any }) {
  const { openTaskDetail, completeTask, deleteTask, collaborators, projects, spaces } = useStore();
  const project = projects.find(p => p.id === task.project_id);
  const space = spaces.find(s => s.id === task.space_id);
  const collabs = collaborators.filter(c => task.collaborator_ids.includes(c.id));
  const subtasksDone = task.subtasks.filter(s => s.done).length;
  const subtasksTotal = task.subtasks.length;
  const isDone = task.status === 'done';

  return (
    <div
      {...dragHandleProps}
      onClick={() => openTaskDetail(task.id)}
      className={clsx(
        'group card p-3 cursor-pointer hover:shadow-md transition-shadow relative',
        isDone && 'opacity-60'
      )}
    >
      {/* 优先级竖条 */}
      <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r"
           style={{ background: PRIORITY_COLORS[task.priority] }} />

      <div className="pl-2">
        <div className="flex items-start gap-2">
          <Tooltip title={isDone ? '取消完成' : '完成'} shortcut="Space">
            <button
              onClick={(e) => { e.stopPropagation(); !isDone && completeTask(task.id); }}
              className="mt-0.5 text-slate-400 hover:text-green-500 transition"
            >
              {isDone ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Circle className="w-4 h-4" />}
            </button>
          </Tooltip>
          <div className="flex-1 min-w-0">
            <div className={clsx('text-sm font-medium', isDone && 'line-through')}>
              {task.title}
            </div>
            {task.ai_parsed === 1 && (
              <span className="inline-flex items-center gap-1 text-[10px] text-indigo-500 mt-0.5">
                ✨ AI 解析
              </span>
            )}
          </div>
          <Tooltip title="删除" warning="此操作不可撤销">
            <button
              onClick={(e) => { e.stopPropagation(); if (confirm(`删除任务"${task.title}"?`)) deleteTask(task.id); }}
              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
        </div>

        <div className="flex items-center gap-2 mt-2 text-xs flex-wrap">
          {space && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]"
                  style={{ background: space.color + '20', color: space.color }}>
              {space.emoji} {space.name}
            </span>
          )}
          {project && (
            <span className="inline-flex items-center gap-1 text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: project.color }} />
              {project.name}
            </span>
          )}
          {task.due_date && (
            <span className={dueDateColor(task.due_date)}>📅 {dueDateLabel(task.due_date)}</span>
          )}
          {subtasksTotal > 0 && (
            <span className="text-slate-500">✓ {subtasksDone}/{subtasksTotal}</span>
          )}
          {task.estimated_hours && (
            <span className="text-slate-500">⏱ {task.estimated_hours}h</span>
          )}
        </div>

        {collabs.length > 0 && (
          <div className="flex items-center gap-1 mt-2">
            {collabs.slice(0, 4).map(c => (
              <Tooltip key={c.id} title={c.name} desc={c.role || ''}>
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] text-white"
                      style={{ background: c.avatar_color }}>
                  {c.name.charAt(0)}
                </span>
              </Tooltip>
            ))}
            {collabs.length > 4 && (
              <span className="text-xs text-slate-500">+{collabs.length - 4}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
