import { useEffect, useState } from 'react';
import { Stats, AI } from '../api';
import { useStore } from '../store';
import dayjs from 'dayjs';
import { Sparkles, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export function CapacityView() {
  const { tasks } = useStore();
  const [data, setData] = useState<any>(null);
  const [planning, setPlanning] = useState(false);
  const [plan, setPlan] = useState<any>(null);

  useEffect(() => { Stats.capacity().then(setData); }, [tasks.length]);

  const generatePlan = async () => {
    setPlanning(true);
    try {
      const r = await AI.dayPlan(8);
      setPlan(r);
      toast.success('AI 已生成今日计划');
    } catch (e: any) {
      toast.error('规划失败：' + e.message);
    } finally {
      setPlanning(false);
    }
  };

  if (!data) return <div className="p-8 text-center text-slate-500">加载中...</div>;

  const todayPercent = Math.min((data.today_hours / data.today_capacity) * 100, 100);
  const todayColor = todayPercent > 100 ? 'bg-red-500'
    : todayPercent > 80 ? 'bg-orange-500'
    : 'bg-green-500';

  return (
    <div className="p-6 space-y-4 overflow-y-auto">
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-lg font-semibold">今日容量</div>
            <div className="text-xs text-slate-500">已分配 {data.today_hours.toFixed(1)} / {data.today_capacity}h</div>
          </div>
          <button onClick={generatePlan} disabled={planning} className="btn-primary">
            {planning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            AI 生成今日计划
          </button>
        </div>
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div className={`h-full transition-all ${todayColor}`} style={{ width: `${todayPercent}%` }} />
        </div>
        {todayPercent > 100 && (
          <div className="text-xs text-red-500 mt-2">⚠ 任务过载，建议重排部分任务到其他天</div>
        )}
      </div>

      {plan && (
        <div className="card p-5">
          <div className="text-sm font-semibold mb-2">📋 AI 今日规划</div>
          <div className="text-xs text-slate-500 mb-3">{plan.summary}</div>
          {plan.warning && <div className="text-xs text-orange-500 mb-2">⚠ {plan.warning}</div>}
          <div className="space-y-2">
            {(plan.blocks || []).map((b: any, i: number) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="font-mono text-slate-500 w-24">{b.start_time} - {b.end_time}</span>
                <span className="flex-1">{b.task_title}</span>
                <span className="text-xs text-slate-400">{b.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card p-5">
        <div className="font-semibold mb-3">本周容量</div>
        <div className="space-y-2">
          {data.week.map((d: any) => {
            const pct = Math.min(d.hours / 8 * 100, 100);
            const day = dayjs(d.date);
            const isToday = day.isSame(dayjs(), 'day');
            return (
              <div key={d.date} className="flex items-center gap-3">
                <div className="w-20 text-sm">
                  <div className={isToday ? 'font-semibold text-indigo-500' : ''}>
                    {['日','一','二','三','四','五','六'][day.day()]} {day.date()}
                  </div>
                </div>
                <div className="flex-1 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full ${pct > 100 ? 'bg-red-500' : pct > 80 ? 'bg-orange-500' : 'bg-indigo-500'}`}
                       style={{ width: `${pct}%` }} />
                </div>
                <div className="w-16 text-xs text-slate-500 text-right">{d.hours.toFixed(1)}h</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
