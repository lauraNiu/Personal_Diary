import { useEffect, useState } from 'react';
import { Stats } from '../api';
import { useStore } from '../store';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';
import { PRIORITY_COLORS, PRIORITY_LABELS } from '../utils';

export function StatsView() {
  const { spaces } = useStore();
  const [overview, setOverview] = useState<any>(null);
  const [trend, setTrend] = useState<any[]>([]);

  useEffect(() => {
    Stats.overview().then(setOverview);
    Stats.trend(14).then(setTrend);
  }, []);

  if (!overview) return <div className="p-8 text-center text-slate-500">加载中...</div>;

  const statusData = Object.entries(overview.by_status).map(([k, v]) => ({ name: k, value: v }));
  const spaceData = Object.entries(overview.by_space).map(([k, v]) => {
    const s = spaces.find(x => x.id === k);
    return { name: s?.name || k, value: v, color: s?.color || '#94A3B8' };
  });
  const priorityData = Object.entries(overview.by_priority || {}).map(([k, v]) => ({
    name: PRIORITY_LABELS[k as keyof typeof PRIORITY_LABELS] || k,
    value: v,
    color: PRIORITY_COLORS[k as keyof typeof PRIORITY_COLORS] || '#94A3B8',
  }));

  const totalAll = statusData.reduce((s, x) => s + (x.value as number), 0);
  const doneCount = statusData.find(x => x.name === 'done')?.value || 0;
  const completion = totalAll > 0 ? Math.round((doneCount as number) / totalAll * 100) : 0;

  return (
    <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-y-auto">
      {/* Top stats */}
      <div className="card p-4 lg:col-span-2 grid grid-cols-4 gap-4">
        <Stat label="今日完成" value={overview.today_done} accent="text-green-500" />
        <Stat label="本周完成" value={overview.week_done} accent="text-blue-500" />
        <Stat label="即将到期 (3天)" value={overview.urgent_count} accent="text-orange-500" />
        <Stat label="完成率" value={`${completion}%`} accent="text-indigo-500" />
      </div>

      <div className="card p-4">
        <div className="font-semibold mb-3">各状态任务数</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={statusData}>
            <XAxis dataKey="name" />
            <YAxis />
            <RTooltip />
            <Bar dataKey="value" fill="#6366F1" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card p-4">
        <div className="font-semibold mb-3">各空间分布</div>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={spaceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
              {spaceData.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="card p-4">
        <div className="font-semibold mb-3">优先级分布（未完成）</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={priorityData}>
            <XAxis dataKey="name" />
            <YAxis />
            <RTooltip />
            <Bar dataKey="value">
              {priorityData.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card p-4">
        <div className="font-semibold mb-3">14 天完成趋势</div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={trend}>
            <XAxis dataKey="date" />
            <YAxis />
            <RTooltip />
            <Line type="monotone" dataKey="count" stroke="#10B981" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: any; accent?: string }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${accent || ''}`}>{value}</div>
    </div>
  );
}
