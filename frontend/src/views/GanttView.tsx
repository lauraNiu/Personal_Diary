import { useStore } from '../store';
import dayjs from 'dayjs';
import { PRIORITY_COLORS } from '../utils';
import { Tooltip } from '../components/Tooltip';
import { Info } from 'lucide-react';

export function GanttView() {
  const { tasks, openTaskDetail, projects, selectedSpaceId, selectedProjectId } = useStore();

  // 显示所有有 due_date 的未取消任务（start_date 缺失则推断）
  let visible = tasks.filter(t => t.due_date && t.status !== 'cancelled');
  if (selectedSpaceId !== 'all') visible = visible.filter(t => t.space_id === selectedSpaceId);
  if (selectedProjectId) visible = visible.filter(t => t.project_id === selectedProjectId);

  // 推断每个任务的开始/结束日期
  const enriched = visible.map(t => {
    const due = dayjs(t.due_date);
    let start: dayjs.Dayjs;
    if (t.start_date) {
      start = dayjs(t.start_date);
    } else if (t.estimated_hours && t.estimated_hours > 0) {
      // 按 8 小时/天 推算
      const days = Math.max(1, Math.ceil(t.estimated_hours / 8));
      start = due.subtract(days - 1, 'day');
    } else {
      // 默认 1 天
      start = due;
    }
    // 如果起始 > 截止（异常数据），调整
    if (start.isAfter(due)) start = due;
    return { ...t, _start: start, _end: due };
  });

  if (enriched.length === 0) {
    return (
      <div className="p-12 text-center text-slate-400">
        <div className="text-4xl mb-2">📊</div>
        <div>当前筛选下没有任务</div>
        <div className="text-xs mt-2">给任务设置截止日期就会出现在甘特图上</div>
      </div>
    );
  }

  // 时间范围（向两侧 padding 2 天，让任务条不贴边）
  const minDate = enriched.reduce((m, t) => t._start.isBefore(m) ? t._start : m, enriched[0]._start).subtract(2, 'day');
  const maxDate = enriched.reduce((m, t) => t._end.isAfter(m) ? t._end : m, enriched[0]._end).add(2, 'day');
  const totalDays = maxDate.diff(minDate, 'day') + 1;

  // 按 project 分组
  const grouped: Record<string, typeof enriched> = {};
  enriched.forEach(t => {
    const k = t.project_id || '__no_project__';
    grouped[k] = grouped[k] || [];
    grouped[k].push(t);
  });
  // 排序：有 project 的在前
  const groupKeys = Object.keys(grouped).sort((a, b) =>
    a === '__no_project__' ? 1 : b === '__no_project__' ? -1 : 0
  );

  return (
    <div className="p-3 overflow-auto h-full">
      <div className="flex items-center justify-between text-xs text-slate-500 px-2 pb-2">
        <div>共 {enriched.length} 个任务（按截止日期排布；未填开始日期时按预估工时推算）</div>
        <Tooltip title="使用说明" desc="点击任务条打开详情 · 在详情面板可调整开始/截止日期" side="left">
          <button className="btn-icon w-6 h-6"><Info className="w-3.5 h-3.5" /></button>
        </Tooltip>
      </div>
      <div className="card p-4 min-w-[800px]">
        {/* 月份头 */}
        <div className="flex sticky top-0 bg-white dark:bg-slate-800 z-10 border-b border-slate-200 dark:border-slate-700 pb-1">
          <div className="w-48 shrink-0 text-xs font-medium text-slate-500 px-2">任务</div>
          <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${totalDays}, minmax(28px, 1fr))` }}>
            {Array.from({ length: totalDays }).map((_, i) => {
              const d = minDate.add(i, 'day');
              const isToday = d.isSame(dayjs(), 'day');
              const isFirstOfMonth = d.date() === 1;
              return (
                <div key={i} className="relative">
                  <div className={`text-center text-[10px] ${isToday ? 'text-indigo-500 font-bold' : 'text-slate-400'}`}>
                    {d.date()}
                  </div>
                  {isFirstOfMonth && (
                    <div className="absolute left-0 top-3 text-[9px] text-slate-500 whitespace-nowrap">
                      {d.format('M月')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {groupKeys.map((pid) => {
          const ts = grouped[pid];
          const project = projects.find(p => p.id === pid);
          return (
            <div key={pid} className="mt-3">
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 px-2 flex items-center gap-1.5">
                {project ? (
                  <>
                    <span className="w-2 h-2 rounded-full" style={{ background: project.color }} />
                    {project.name}
                  </>
                ) : (
                  <span className="text-slate-400">无项目</span>
                )}
                <span className="text-slate-400 font-normal">({ts.length})</span>
              </div>
              {ts.map(t => {
                const start = t._start.diff(minDate, 'day');
                const span = Math.max(1, t._end.diff(t._start, 'day') + 1);
                const isDone = t.status === 'done';
                const isOverdue = !isDone && t._end.isBefore(dayjs(), 'day');
                return (
                  <div key={t.id} className="flex items-center py-1 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded">
                    <div className="w-48 shrink-0 text-xs px-2 truncate" title={t.title}>
                      {isDone && <span className="mr-1 text-green-500">✓</span>}
                      {t.title}
                    </div>
                    <div className="flex-1 grid relative h-6"
                         style={{ gridTemplateColumns: `repeat(${totalDays}, minmax(28px, 1fr))` }}>
                      {/* 今日竖线 */}
                      {(() => {
                        const today = dayjs().diff(minDate, 'day');
                        if (today < 0 || today >= totalDays) return null;
                        return (
                          <div className="absolute top-0 bottom-0 w-px bg-indigo-400 opacity-50"
                               style={{ left: `calc(${(today / totalDays) * 100}% + 14px)` }} />
                        );
                      })()}
                      <Tooltip title={t.title}
                               desc={`${t._start.format('MM/DD')} → ${t._end.format('MM/DD')}${isOverdue ? ' · 已逾期' : ''}`}>
                        <div onClick={() => openTaskDetail(t.id)}
                             className={`absolute h-5 rounded cursor-pointer hover:opacity-90 text-white text-[10px] flex items-center px-1.5 truncate transition-all ${isDone ? 'opacity-50 line-through' : ''}`}
                             style={{
                               left: `${(start / totalDays) * 100}%`,
                               width: `${(span / totalDays) * 100}%`,
                               background: PRIORITY_COLORS[t.priority],
                               top: '2px',
                               outline: isOverdue ? '2px solid #DC2626' : 'none',
                             }}>
                          {t.title}
                        </div>
                      </Tooltip>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
