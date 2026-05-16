import { useStore } from '../store';
import { TaskCard } from '../components/TaskCard';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import type { Priority } from '../types';

const QUADRANTS: { key: Priority; title: string; subtitle: string; bg: string }[] = [
  { key: 'urgent', title: '🔴 紧急 + 重要', subtitle: '立即去做', bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' },
  { key: 'high',   title: '🟠 重要 + 不紧急', subtitle: '计划安排', bg: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800' },
  { key: 'medium', title: '🟡 紧急 + 不重要', subtitle: '尽快处理', bg: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' },
  { key: 'low',    title: '🟢 不紧急 + 不重要', subtitle: '可以放弃', bg: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' },
];

export function EisenhowerView() {
  const { tasks, updateTask, selectedSpaceId } = useStore();
  let visible = tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled');
  if (selectedSpaceId !== 'all') visible = visible.filter(t => t.space_id === selectedSpaceId);

  const onDragEnd = (r: DropResult) => {
    if (!r.destination) return;
    updateTask(r.draggableId, { priority: r.destination.droppableId as Priority });
  };

  return (
    <div className="h-full p-4">
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-2 grid-rows-2 gap-3 h-full">
          {QUADRANTS.map(q => {
            const items = visible.filter(t => t.priority === q.key);
            return (
              <div key={q.key} className={`rounded-lg border-2 ${q.bg} flex flex-col overflow-hidden`}>
                <div className="px-3 py-2 border-b border-current/10">
                  <div className="font-semibold text-sm">{q.title} <span className="text-xs text-slate-500 font-normal">({items.length})</span></div>
                  <div className="text-xs text-slate-500">{q.subtitle}</div>
                </div>
                <Droppable droppableId={q.key}>
                  {(p) => (
                    <div ref={p.innerRef} {...p.droppableProps} className="flex-1 p-2 overflow-y-auto space-y-2">
                      {items.map((t, i) => (
                        <Draggable key={t.id} draggableId={t.id} index={i}>
                          {(pp) => (
                            <div ref={pp.innerRef} {...pp.draggableProps} {...pp.dragHandleProps}>
                              <TaskCard task={t} />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {p.placeholder}
                      {items.length === 0 && <div className="text-xs text-slate-400 text-center py-4">空</div>}
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
