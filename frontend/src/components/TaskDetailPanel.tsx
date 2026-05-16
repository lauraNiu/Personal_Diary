import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { Tasks, AI } from '../api';
import type { Task, Subtask } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Sparkles, CheckCircle2, Circle, Plus } from 'lucide-react';
import { Tooltip } from './Tooltip';
import { PRIORITY_COLORS, PRIORITY_LABELS, STATUS_LABELS } from '../utils';
import toast from 'react-hot-toast';

export function TaskDetailPanel() {
  const { rightPanelOpen, openTaskDetail, selectedTaskId, loadTasks, spaces, projects, collaborators } = useStore();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  const [breakingDown, setBreakingDown] = useState(false);

  useEffect(() => {
    if (selectedTaskId) {
      setLoading(true);
      Tasks.get(selectedTaskId).then(setTask).finally(() => setLoading(false));
    } else {
      setTask(null);
    }
  }, [selectedTaskId]);

  const update = async (data: Partial<Task>) => {
    if (!task) return;
    const updated = await Tasks.update(task.id, data);
    setTask(updated);
    loadTasks();
  };

  const toggleSub = async (sid: string) => {
    if (!task) return;
    const newSubs = task.subtasks.map(s => s.id === sid ? { ...s, done: !s.done } : s);
    await update({ subtasks: newSubs });
  };

  const addSub = async (title: string) => {
    if (!task || !title.trim()) return;
    const newSubs = [...task.subtasks, { id: crypto.randomUUID(), title, done: false }];
    await update({ subtasks: newSubs });
  };

  const aiBreakdown = async () => {
    if (!task) return;
    setBreakingDown(true);
    try {
      const r = await AI.breakdown(task.title, task.due_date);
      const newSubs: Subtask[] = (r.subtasks || []).map((s: any) => ({
        id: crypto.randomUUID(),
        title: s.title,
        done: false,
      }));
      await update({ subtasks: [...task.subtasks, ...newSubs] });
      toast.success(`AI 拆解完成，新增 ${newSubs.length} 个子任务`);
    } catch (e: any) {
      toast.error('拆解失败：' + e.message);
    } finally {
      setBreakingDown(false);
    }
  };

  return (
    <AnimatePresence>
      {rightPanelOpen && task && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 320 }}
          className="fixed right-0 top-14 bottom-0 w-[420px] bg-white dark:bg-slate-900
                     border-l border-slate-200 dark:border-slate-800 z-30 overflow-y-auto"
        >
          <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800
                          px-4 py-2.5 flex items-center justify-between">
            <Tooltip title="关闭" shortcut="ESC">
              <button className="btn-icon" onClick={() => openTaskDetail(null)}>
                <X className="w-4 h-4" />
              </button>
            </Tooltip>
            <div className="flex items-center gap-1">
              <Tooltip title="AI 拆解子任务" desc="让 AI 把当前任务拆成可执行步骤">
                <button className="btn-icon text-indigo-500" onClick={aiBreakdown} disabled={breakingDown}>
                  <Sparkles className="w-4 h-4" />
                </button>
              </Tooltip>
              <Tooltip title="删除任务" warning="此操作不可撤销">
                <button
                  className="btn-icon text-red-500"
                  onClick={async () => {
                    if (confirm(`删除任务"${task.title}"?`)) {
                      await Tasks.delete(task.id);
                      loadTasks();
                      openTaskDetail(null);
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </Tooltip>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* 标题 */}
            <input
              value={task.title}
              onChange={(e) => setTask({ ...task, title: e.target.value })}
              onBlur={() => update({ title: task.title })}
              className="w-full text-lg font-semibold bg-transparent border-0 outline-none px-0"
            />

            {/* 属性网格 */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <label className="text-xs text-slate-500">空间</label>
                <select
                  value={task.space_id}
                  onChange={(e) => update({ space_id: e.target.value })}
                  className="input mt-1"
                >
                  {spaces.map(s => <option key={s.id} value={s.id}>{s.emoji} {s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500">项目</label>
                <select
                  value={task.project_id || ''}
                  onChange={(e) => update({ project_id: e.target.value || undefined })}
                  className="input mt-1"
                >
                  <option value="">无</option>
                  {projects.filter(p => p.space_id === task.space_id).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500">优先级</label>
                <select
                  value={task.priority}
                  onChange={(e) => update({ priority: e.target.value as any })}
                  className="input mt-1"
                  style={{ color: PRIORITY_COLORS[task.priority] }}
                >
                  {(['urgent', 'high', 'medium', 'low'] as const).map(p => (
                    <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500">状态</label>
                <select
                  value={task.status}
                  onChange={(e) => update({ status: e.target.value as any })}
                  className="input mt-1"
                >
                  {(['inbox', 'todo', 'in_progress', 'done', 'cancelled'] as const).map(s => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500">开始日期</label>
                <input
                  type="date"
                  value={task.start_date?.slice(0, 10) || ''}
                  onChange={(e) => update({ start_date: e.target.value || undefined })}
                  className="input mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">截止日期</label>
                <input
                  type="date"
                  value={task.due_date?.slice(0, 10) || ''}
                  onChange={(e) => update({ due_date: e.target.value || undefined })}
                  className="input mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">预估工时</label>
                <input
                  type="number"
                  step="0.5"
                  value={task.estimated_hours || ''}
                  onChange={(e) => update({ estimated_hours: parseFloat(e.target.value) || undefined })}
                  className="input mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">实际工时</label>
                <input
                  type="number"
                  step="0.5"
                  value={task.actual_hours || 0}
                  onChange={(e) => update({ actual_hours: parseFloat(e.target.value) || 0 })}
                  className="input mt-1"
                />
              </div>
            </div>

            {/* 协作者 */}
            <div>
              <label className="text-xs text-slate-500">协作者</label>
              <div className="flex flex-wrap gap-1 mt-1">
                {collaborators.map(c => {
                  const sel = task.collaborator_ids.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        const ids = sel
                          ? task.collaborator_ids.filter(x => x !== c.id)
                          : [...task.collaborator_ids, c.id];
                        update({ collaborator_ids: ids });
                      }}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs transition
                                  ${sel ? 'text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
                      style={{ background: sel ? c.avatar_color : undefined }}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 描述 */}
            <div>
              <label className="text-xs text-slate-500">描述</label>
              <textarea
                value={task.description || ''}
                onChange={(e) => setTask({ ...task, description: e.target.value })}
                onBlur={() => update({ description: task.description })}
                placeholder="任务详细描述..."
                className="input mt-1"
                rows={4}
              />
            </div>

            {/* 子任务 */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-500">
                  子任务 ({task.subtasks.filter(s => s.done).length}/{task.subtasks.length})
                </label>
                <Tooltip title="AI 拆解" desc="让 AI 帮你拆成可执行步骤">
                  <button onClick={aiBreakdown} disabled={breakingDown}
                          className="text-xs text-indigo-500 hover:text-indigo-600 inline-flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> AI 拆解
                  </button>
                </Tooltip>
              </div>
              <div className="mt-2 space-y-1">
                {task.subtasks.map(s => (
                  <div key={s.id} className="flex items-center gap-2 text-sm">
                    <button onClick={() => toggleSub(s.id)} className="text-slate-400 hover:text-green-500">
                      {s.done ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Circle className="w-4 h-4" />}
                    </button>
                    <span className={s.done ? 'line-through text-slate-400' : ''}>{s.title}</span>
                  </div>
                ))}
                <SubtaskAdder onAdd={addSub} />
              </div>
            </div>

            {task.raw_input && (
              <div className="text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-2 py-1.5 rounded">
                原始输入：{task.raw_input}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SubtaskAdder({ onAdd }: { onAdd: (t: string) => void }) {
  const [v, setV] = useState('');
  return (
    <div className="flex items-center gap-2 text-sm">
      <Plus className="w-4 h-4 text-slate-400" />
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && v.trim()) {
            onAdd(v.trim()); setV('');
          }
        }}
        placeholder="新建子任务，回车提交"
        className="flex-1 bg-transparent border-0 outline-none placeholder-slate-400"
      />
    </div>
  );
}
