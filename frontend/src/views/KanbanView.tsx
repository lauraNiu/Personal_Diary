import { useStore } from '../store';
import { TaskCard } from '../components/TaskCard';
import { STATUS_COLUMNS } from '../utils';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { Plus, Info } from 'lucide-react';
import { useState } from 'react';
import { Tooltip } from '../components/Tooltip';
import clsx from 'clsx';

export function KanbanView() {
  const { tasks, selectedSpaceId, selectedProjectId, updateTask, createTask, currentView } = useStore();
  const [adding, setAdding] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');

  let visible = tasks.filter(t => t.status !== 'cancelled');
  if (selectedSpaceId !== 'all') visible = visible.filter(t => t.space_id === selectedSpaceId);
  if (selectedProjectId) visible = visible.filter(t => t.project_id === selectedProjectId);

  const onDragEnd = (r: DropResult) => {
    if (!r.destination) return;
    const tid = r.draggableId;
    const newStatus = r.destination.droppableId as any;
    // completed_at 由后端根据 status 变化自动维护
    updateTask(tid, { status: newStatus });
  };

  const handleAdd = async (status: string) => {
    if (!draftTitle.trim()) { setAdding(null); return; }
    await createTask({
      title: draftTitle,
      space_id: selectedSpaceId === 'all' ? 'space-life' : selectedSpaceId,
      status: status as any,
      priority: 'medium',
      is_inbox: 0,
    });
    setDraftTitle(''); setAdding(null);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-2 flex items-center justify-between text-xs text-slate-500">
        <div>共 {visible.length} 个任务</div>
        <Tooltip title="使用说明" side="left"
                 desc="拖拽卡片到不同列改状态 · 点击列底部 + 新建任务 · 点击卡片打开详情">
          <button className="btn-icon w-6 h-6"><Info className="w-3.5 h-3.5" /></button>
        </Tooltip>
      </div>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex-1 grid grid-cols-3 gap-3 p-3 overflow-x-auto">
          {STATUS_COLUMNS.map(col => {
            const colTasks = visible.filter(t => t.status === col.key);
            return (
              <div key={col.key} className={clsx('rounded-lg flex flex-col', col.bgClass)}>
                <div className="px-3 py-2.5 flex items-center justify-between sticky top-0">
                  <div className="font-semibold text-sm">{col.label}</div>
                  <span className="text-xs text-slate-500">{colTasks.length}</span>
                </div>
                <Droppable droppableId={col.key}>
                  {(provided, snap) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={clsx('flex-1 px-2 pb-2 space-y-2 min-h-[100px]',
                        snap.isDraggingOver && 'bg-indigo-50 dark:bg-indigo-900/20 rounded')}
                    >
                      {colTasks.length === 0 && (
                        <div className="text-center py-8 text-xs text-slate-400">
                          {col.key === 'todo' ? (
                            <>
                              <div className="mb-2">📥 这里还没有任务</div>
                              <div>按 <kbd className="kbd">Q</kbd> 快速录入</div>
                            </>
                          ) : col.key === 'in_progress' ? '把任务拖到这里开始进行' : '完成的任务会在这里'}
                        </div>
                      )}
                      {colTasks.map((task, idx) => (
                        <Draggable key={task.id} draggableId={task.id} index={idx}>
                          {(p, s) => (
                            <div
                              ref={p.innerRef}
                              {...p.draggableProps}
                              {...p.dragHandleProps}
                              style={{
                                ...p.draggableProps.style,
                                opacity: s.isDragging ? 0.85 : 1,
                              }}
                            >
                              <TaskCard task={task} />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {adding === col.key ? (
                        <div className="card p-2">
                          <input
                            autoFocus
                            value={draftTitle}
                            onChange={(e) => setDraftTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAdd(col.key);
                              if (e.key === 'Escape') { setAdding(null); setDraftTitle(''); }
                            }}
                            onBlur={() => handleAdd(col.key)}
                            placeholder="任务标题，回车确认"
                            className="w-full text-sm bg-transparent outline-none border-0 px-1"
                          />
                        </div>
                      ) : (
                        <button
                          onClick={() => setAdding(col.key)}
                          className="w-full text-left text-xs text-slate-500 hover:text-indigo-500 py-2 px-2 flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" /> 添加任务
                        </button>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}
