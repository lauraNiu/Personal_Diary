import { useStore } from '../store';
import { useState } from 'react';
import dayjs from 'dayjs';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PRIORITY_COLORS } from '../utils';
import { Tooltip } from '../components/Tooltip';

export function CalendarView() {
  const { tasks, openTaskDetail, selectedSpaceId } = useStore();
  const [month, setMonth] = useState(dayjs());

  let visible = tasks;
  if (selectedSpaceId !== 'all') visible = visible.filter(t => t.space_id === selectedSpaceId);

  const start = month.startOf('month').startOf('week');
  const end = month.endOf('month').endOf('week');
  const days: dayjs.Dayjs[] = [];
  let cur = start;
  while (cur.isBefore(end)) { days.push(cur); cur = cur.add(1, 'day'); }

  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex items-center gap-2 mb-3">
        <button className="btn-icon" onClick={() => setMonth(m => m.subtract(1, 'month'))}>
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-lg font-semibold">{month.format('YYYY 年 M 月')}</div>
        <button className="btn-icon" onClick={() => setMonth(m => m.add(1, 'month'))}>
          <ChevronRight className="w-4 h-4" />
        </button>
        <button className="btn-ghost ml-2" onClick={() => setMonth(dayjs())}>今天</button>
      </div>
      <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-800 flex-1 rounded overflow-hidden">
        {['日','一','二','三','四','五','六'].map(d => (
          <div key={d} className="bg-white dark:bg-slate-900 text-center py-1 text-xs font-medium text-slate-500">{d}</div>
        ))}
        {days.map(d => {
          const dueTasks = visible.filter(t => t.due_date && dayjs(t.due_date).isSame(d, 'day'));
          const isToday = d.isSame(dayjs(), 'day');
          const inMonth = d.month() === month.month();
          return (
            <div key={d.format('YYYY-MM-DD')}
                 className={`bg-white dark:bg-slate-900 p-1.5 min-h-[80px] ${!inMonth ? 'opacity-40' : ''}`}>
              <div className={`text-xs ${isToday ? 'inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500 text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                {d.date()}
              </div>
              <div className="mt-1 space-y-0.5">
                {dueTasks.slice(0, 3).map(t => (
                  <Tooltip key={t.id} title={t.title} desc={t.description}>
                    <div onClick={() => openTaskDetail(t.id)}
                         className="text-[10px] truncate px-1 py-0.5 rounded cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                         style={{ borderLeft: `2px solid ${PRIORITY_COLORS[t.priority]}` }}>
                      {t.title}
                    </div>
                  </Tooltip>
                ))}
                {dueTasks.length > 3 && (
                  <div className="text-[10px] text-slate-500">+{dueTasks.length - 3}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
