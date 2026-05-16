import { useEffect, useState } from 'react';
import { Stats } from '../api';
import dayjs from 'dayjs';
import { Tooltip } from '../components/Tooltip';

export function HeatmapView() {
  const [data, setData] = useState<{ date: string; count: number }[]>([]);
  useEffect(() => { Stats.heatmap(91).then(setData); }, []);

  const max = Math.max(...data.map(d => d.count), 1);
  const colorFor = (c: number) => {
    if (c === 0) return 'bg-slate-100 dark:bg-slate-800';
    const ratio = c / max;
    if (ratio < 0.25) return 'bg-green-200 dark:bg-green-900/50';
    if (ratio < 0.5)  return 'bg-green-300 dark:bg-green-700';
    if (ratio < 0.75) return 'bg-green-500 dark:bg-green-600';
    return 'bg-green-700 dark:bg-green-500';
  };

  // 按周组织
  const weeks: { date: string; count: number }[][] = [];
  let week: typeof data = [];
  data.forEach((d, i) => {
    const day = dayjs(d.date).day();
    if (i === 0) for (let k = 0; k < day; k++) week.push({ date: '', count: -1 } as any);
    week.push(d);
    if (day === 6) { weeks.push(week); week = []; }
  });
  if (week.length) weeks.push(week);

  const total = data.reduce((s, x) => s + x.count, 0);
  const activeDays = data.filter(d => d.count > 0).length;

  return (
    <div className="p-6 overflow-y-auto">
      <div className="card p-6 max-w-3xl">
        <div className="flex items-end justify-between mb-4">
          <div>
            <div className="text-lg font-semibold">完成任务热力图</div>
            <div className="text-xs text-slate-500 mt-1">过去 90 天</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-500">{total}</div>
            <div className="text-xs text-slate-500">{activeDays} 天有完成</div>
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto pb-2">
          {weeks.map((w, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {w.map((d, di) => (
                d.date ? (
                  <Tooltip key={di} title={d.date} desc={`完成 ${d.count} 个任务`}>
                    <div className={`w-3 h-3 rounded-sm ${colorFor(d.count)}`} />
                  </Tooltip>
                ) : <div key={di} className="w-3 h-3" />
              ))}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-1 mt-3 text-xs text-slate-500">
          少 <div className="w-3 h-3 rounded-sm bg-slate-100 dark:bg-slate-800" />
          <div className="w-3 h-3 rounded-sm bg-green-200 dark:bg-green-900/50" />
          <div className="w-3 h-3 rounded-sm bg-green-300 dark:bg-green-700" />
          <div className="w-3 h-3 rounded-sm bg-green-500 dark:bg-green-600" />
          <div className="w-3 h-3 rounded-sm bg-green-700 dark:bg-green-500" /> 多
        </div>
      </div>
    </div>
  );
}
