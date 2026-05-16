import { useEffect, useState } from 'react';
import { Papers } from '../api';
import type { Paper, PaperSnapshot } from '../types';
import { FileText, RefreshCw, Plus, Loader2, FileEdit } from 'lucide-react';
import { Tooltip } from '../components/Tooltip';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip as RTooltip } from 'recharts';
import toast from 'react-hot-toast';

const STATUS_COLORS: Record<string, string> = {
  preparing: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  in_review: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  minor_revision: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  major_revision: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  accepted: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const STATUS_LABEL: Record<string, string> = {
  preparing: '准备中',
  submitted: '已投稿',
  in_review: '在审',
  minor_revision: '小修',
  major_revision: '大修',
  accepted: '接受',
  rejected: '拒稿',
};

export function PaperHubView() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [selected, setSelected] = useState<Paper | null>(null);
  const [snapshots, setSnapshots] = useState<PaperSnapshot[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newOverleafId, setNewOverleafId] = useState('');

  const load = async () => {
    const list = await Papers.list();
    setPapers(list);
    if (selected) {
      const s = await Papers.snapshots(selected.id);
      setSnapshots(s);
    }
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { if (selected) Papers.snapshots(selected.id).then(setSnapshots); }, [selected?.id]);

  const sync = async () => {
    if (!selected) return;
    setSyncing(true);
    try {
      const r = await Papers.sync(selected.id);
      if (r.ok) toast.success(`同步完成：${r.diff_summary}`);
      else toast.error(r.error || '同步失败');
      await load();
    } finally {
      setSyncing(false);
    }
  };

  const createPaper = async () => {
    if (!newTitle.trim()) return;
    await Papers.create({ title: newTitle, overleaf_project_id: newOverleafId || undefined });
    setNewTitle(''); setNewOverleafId(''); setCreating(false);
    load();
  };

  const chartData = [...snapshots].reverse().map(s => ({
    date: s.snapshot_at.slice(0, 10),
    words: s.word_count,
  }));

  return (
    <div className="h-full grid grid-cols-12 gap-3 p-3">
      {/* 左侧论文列表 */}
      <div className="col-span-4 card p-3 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold flex items-center gap-2"><FileText className="w-4 h-4" /> 论文</div>
          <Tooltip title="新建论文">
            <button onClick={() => setCreating(!creating)} className="btn-icon"><Plus className="w-4 h-4" /></button>
          </Tooltip>
        </div>
        {creating && (
          <div className="space-y-2 mb-3 p-2 rounded border border-slate-200 dark:border-slate-700">
            <input className="input" placeholder="论文标题" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            <input className="input" placeholder="Overleaf project id（可选）" value={newOverleafId} onChange={(e) => setNewOverleafId(e.target.value)} />
            <div className="flex gap-1">
              <button className="btn-primary flex-1" onClick={createPaper}>创建</button>
              <button className="btn-ghost" onClick={() => setCreating(false)}>取消</button>
            </div>
          </div>
        )}
        {papers.length === 0 && (
          <div className="text-center py-8 text-xs text-slate-400">
            还没有论文<br /><span className="text-[10px]">点 + 新建</span>
          </div>
        )}
        <div className="space-y-1.5">
          {papers.map(p => (
            <button key={p.id}
                    onClick={() => setSelected(p)}
                    className={`w-full text-left p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition
                                ${selected?.id === p.id ? 'bg-slate-100 dark:bg-slate-800' : ''}`}>
              <div className="text-sm font-medium truncate">{p.title}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_COLORS[p.submission_status]}`}>
                  {STATUS_LABEL[p.submission_status]}
                </span>
                <span className="text-[10px] text-slate-500">{p.current_word_count} 字</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 右侧详情 */}
      <div className="col-span-8 overflow-y-auto">
        {!selected ? (
          <div className="card p-12 text-center text-slate-400">
            <FileText className="w-12 h-12 mx-auto mb-2" />
            <div>选择一篇论文查看详情</div>
            <div className="text-xs mt-2">支持 Overleaf 自动同步、版本快照、字数曲线</div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xl font-semibold">{selected.title}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[selected.submission_status]}`}>
                      {STATUS_LABEL[selected.submission_status]}
                    </span>
                    <span className="text-xs text-slate-500">当前 {selected.current_word_count} 字</span>
                    {selected.submission_deadline && (
                      <span className="text-xs text-orange-500">📅 截稿 {selected.submission_deadline.slice(0, 10)}</span>
                    )}
                  </div>
                </div>
                <Tooltip title="立即同步 Overleaf" desc="拉取最新版本并生成快照">
                  <button onClick={sync} disabled={syncing || !selected.overleaf_project_id}
                          className="btn-primary">
                    {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    同步
                  </button>
                </Tooltip>
              </div>
              {!selected.overleaf_project_id && (
                <div className="text-xs text-slate-400 mt-2">未绑定 Overleaf 项目（在论文设置里配置）</div>
              )}
            </div>

            {chartData.length > 1 && (
              <div className="card p-5">
                <div className="font-semibold mb-3">📈 字数增长曲线</div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData}>
                    <XAxis dataKey="date" />
                    <YAxis />
                    <RTooltip />
                    <Line type="monotone" dataKey="words" stroke="#6366F1" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="card p-5">
              <div className="font-semibold mb-3">🕐 版本时间轴 ({snapshots.length})</div>
              {snapshots.length === 0 ? (
                <div className="text-xs text-slate-400">还没有快照，点上方"同步"创建第一个</div>
              ) : (
                <div className="space-y-2">
                  {snapshots.map(s => (
                    <div key={s.id} className="flex items-start gap-3 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                      <FileEdit className="w-4 h-4 text-indigo-500 mt-0.5" />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{s.version_label} · {s.word_count} 字</div>
                        <div className="text-xs text-slate-500 mt-0.5">{s.diff_summary}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{s.snapshot_at.replace('T', ' ').slice(0, 16)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
