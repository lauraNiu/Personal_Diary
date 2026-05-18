import { useEffect, useState } from 'react';
import { Papers } from '../api';
import type { Paper, PaperSnapshot } from '../types';
import {
  FileText, RefreshCw, Plus, Loader2, FileEdit, Edit2, Trash2,
  Download, FolderOpen, X, Check, ExternalLink, File as FileIcon,
} from 'lucide-react';
import { Tooltip } from '../components/Tooltip';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip as RTooltip } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
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

const STATUS_OPTIONS = [
  { v: 'preparing', l: '准备中' },
  { v: 'submitted', l: '已投稿' },
  { v: 'in_review', l: '在审' },
  { v: 'minor_revision', l: '小修' },
  { v: 'major_revision', l: '大修' },
  { v: 'accepted', l: '接受' },
  { v: 'rejected', l: '拒稿' },
];
const STATUS_LABEL: Record<string, string> =
  Object.fromEntries(STATUS_OPTIONS.map(o => [o.v, o.l]));

function fmtSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export function PaperHubView() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [selected, setSelected] = useState<Paper | null>(null);
  const [snapshots, setSnapshots] = useState<PaperSnapshot[]>([]);
  const [syncing, setSyncing] = useState(false);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Paper> | null>(null);

  const [browserOpen, setBrowserOpen] = useState(false);
  const [browseSnap, setBrowseSnap] = useState<PaperSnapshot | null>(null);

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

  const openCreate = () => {
    setEditing({
      title: '',
      overleaf_project_id: '',
      submission_status: 'preparing',
      submission_deadline: '',
      notes: '',
      target_journal_ids: [],
      collaborator_ids: [],
    });
    setEditorOpen(true);
  };
  const openEdit = (p: Paper) => {
    setEditing({ ...p });
    setEditorOpen(true);
  };

  const handleSave = async () => {
    if (!editing?.title?.trim()) {
      toast.error('标题不能为空');
      return;
    }
    try {
      if (editing.id) {
        const updated = await Papers.update(editing.id, editing);
        toast.success('已保存');
        if (selected?.id === editing.id) setSelected(updated);
      } else {
        await Papers.create(editing);
        toast.success('已创建');
      }
      setEditorOpen(false);
      setEditing(null);
      await load();
    } catch (e: any) {
      toast.error('保存失败：' + e.message);
    }
  };

  const handleDelete = async (p: Paper) => {
    if (!confirm(`删除论文「${p.title}」？\n\n包含的版本快照（${snapshots.length}个）也会一并删除，此操作不可撤销。`)) return;
    try {
      await Papers.delete(p.id);
      toast.success('已删除');
      if (selected?.id === p.id) setSelected(null);
      await load();
    } catch (e: any) {
      toast.error('删除失败：' + e.message);
    }
  };

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

  const downloadSnapshot = (snap: PaperSnapshot) => {
    // 用 fetch+blob 方式下载，能带 token
    const token = localStorage.getItem('life-os-token') || '';
    fetch(`/api/papers/snapshots/${snap.id}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => {
        if (!r.ok) throw new Error('下载失败');
        return r.blob();
      })
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${snap.version_label}_${snap.snapshot_at.slice(0, 10)}.zip`;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(e => toast.error(e.message));
  };

  const chartData = [...snapshots].reverse().map(s => ({
    date: s.snapshot_at.slice(0, 10),
    words: s.word_count,
  }));

  return (
    <>
      <div className="h-full grid grid-cols-12 gap-3 p-3">
        {/* 左侧论文列表 */}
        <div className="col-span-4 card p-3 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold flex items-center gap-2"><FileText className="w-4 h-4" /> 论文</div>
            <Tooltip title="新建论文">
              <button onClick={openCreate} className="btn-icon"><Plus className="w-4 h-4" /></button>
            </Tooltip>
          </div>
          {papers.length === 0 && (
            <div className="text-center py-8 text-xs text-slate-400">
              还没有论文<br /><span className="text-[10px]">点 + 新建</span>
            </div>
          )}
          <div className="space-y-1.5">
            {papers.map(p => (
              <div key={p.id} className="group relative">
                <button onClick={() => setSelected(p)}
                        className={`w-full text-left p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition
                                    ${selected?.id === p.id ? 'bg-slate-100 dark:bg-slate-800' : ''}`}>
                  <div className="text-sm font-medium truncate pr-12">{p.title}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_COLORS[p.submission_status]}`}>
                      {STATUS_LABEL[p.submission_status] || p.submission_status}
                    </span>
                    <span className="text-[10px] text-slate-500">{p.current_word_count} 字</span>
                  </div>
                </button>
                <div className="absolute right-1 top-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition">
                  <Tooltip title="编辑">
                    <button onClick={(e) => { e.stopPropagation(); openEdit(p); }}
                            className="btn-icon w-6 h-6 bg-white/80 dark:bg-slate-700/80">
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </Tooltip>
                  <Tooltip title="删除" warning="包含快照一并删除">
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(p); }}
                            className="btn-icon w-6 h-6 bg-white/80 dark:bg-slate-700/80 text-red-500">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </Tooltip>
                </div>
              </div>
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
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-xl font-semibold">{selected.title}</div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[selected.submission_status]}`}>
                        {STATUS_LABEL[selected.submission_status] || selected.submission_status}
                      </span>
                      <span className="text-xs text-slate-500">当前 {selected.current_word_count} 字</span>
                      {selected.submission_deadline && (
                        <span className="text-xs text-orange-500">📅 截稿 {selected.submission_deadline.slice(0, 10)}</span>
                      )}
                      {selected.overleaf_project_id && (
                        <a href={`https://www.overleaf.com/project/${selected.overleaf_project_id}`}
                           target="_blank" rel="noreferrer"
                           className="text-xs text-indigo-500 hover:underline inline-flex items-center gap-0.5">
                          打开 Overleaf <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    {selected.notes && (
                      <div className="text-sm text-slate-500 mt-2 whitespace-pre-line">{selected.notes}</div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 items-end">
                    <Tooltip title="立即同步 Overleaf" desc="拉取最新版本并生成快照">
                      <button onClick={sync} disabled={syncing || !selected.overleaf_project_id}
                              className="btn-primary">
                        {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        同步
                      </button>
                    </Tooltip>
                    <div className="flex gap-1">
                      <Tooltip title="编辑论文">
                        <button onClick={() => openEdit(selected)} className="btn-icon">
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </Tooltip>
                      <Tooltip title="删除论文" warning="包含快照一并删除">
                        <button onClick={() => handleDelete(selected)} className="btn-icon text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                </div>
                {!selected.overleaf_project_id && (
                  <div className="text-xs text-orange-500 mt-3 p-2 bg-orange-50 dark:bg-orange-900/20 rounded">
                    ⚠ 未绑定 Overleaf 项目，请点编辑按钮填入 project id
                  </div>
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
                  <div className="text-xs text-slate-400 text-center py-6">
                    还没有快照<br />
                    <span className="text-[10px]">点上方"同步"按钮拉取第一个版本</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {snapshots.map(s => (
                      <div key={s.id} className="group flex items-start gap-3 py-2 px-2 -mx-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 last:border-0">
                        <FileEdit className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{s.version_label} · {s.word_count} 字</div>
                          <div className="text-xs text-slate-500 mt-0.5">{s.diff_summary}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {s.snapshot_at.replace('T', ' ').slice(0, 16)}
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                          <Tooltip title="浏览文件" desc="查看 ZIP 内 tex 文件内容">
                            <button onClick={() => { setBrowseSnap(s); setBrowserOpen(true); }}
                                    className="btn-icon w-7 h-7">
                              <FolderOpen className="w-3.5 h-3.5" />
                            </button>
                          </Tooltip>
                          <Tooltip title="下载快照 ZIP">
                            <button onClick={() => downloadSnapshot(s)} className="btn-icon w-7 h-7">
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </Tooltip>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="text-[10px] text-slate-400 mt-3">
                  💾 快照本地保存在 <code>backend/data/snapshots/{selected.id}/</code>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <PaperEditor
        open={editorOpen}
        editing={editing}
        setEditing={setEditing}
        onSave={handleSave}
        onClose={() => { setEditorOpen(false); setEditing(null); }}
      />
      <SnapshotBrowser
        open={browserOpen}
        snapshot={browseSnap}
        onClose={() => { setBrowserOpen(false); setBrowseSnap(null); }}
      />
    </>
  );
}

// ---------------- 编辑论文弹窗 ----------------
function PaperEditor({ open, editing, setEditing, onSave, onClose }: {
  open: boolean;
  editing: Partial<Paper> | null;
  setEditing: (e: Partial<Paper> | null) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open && editing && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onClose} />
          <motion.div initial={{ opacity: 0, y: -16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ type: 'spring', damping: 24, stiffness: 320 }}
                      className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl mx-4">
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-500" />
                  {editing.id ? '编辑论文' : '新建论文'}
                </div>
                <button className="btn-icon" onClick={onClose}><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
                <div>
                  <label className="text-xs text-slate-500">论文标题 *</label>
                  <input className="input mt-1" autoFocus
                         value={editing.title || ''}
                         onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                         placeholder="例：基于 LLM 的代码生成研究" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Overleaf Project ID</label>
                  <input className="input mt-1"
                         value={editing.overleaf_project_id || ''}
                         onChange={(e) => setEditing({ ...editing, overleaf_project_id: e.target.value })}
                         placeholder="如 682a3b1d8abc1234567890ef（URL 中 /project/ 后面那串）" />
                  <div className="text-[10px] text-slate-400 mt-1">
                    从 Overleaf 项目地址复制：https://www.overleaf.com/project/<b>这一段</b>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500">投稿状态</label>
                    <select className="input mt-1"
                            value={editing.submission_status || 'preparing'}
                            onChange={(e) => setEditing({ ...editing, submission_status: e.target.value })}>
                      {STATUS_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">截稿日期</label>
                    <input className="input mt-1" type="date"
                           value={editing.submission_deadline?.slice(0, 10) || ''}
                           onChange={(e) => setEditing({ ...editing, submission_deadline: e.target.value || undefined })} />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500">备注</label>
                  <textarea className="input mt-1" rows={3}
                            value={editing.notes || ''}
                            onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                            placeholder="例：目标 EMNLP / 合作者 / 注意事项..." />
                </div>
              </div>
              <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-2">
                <button className="btn-ghost" onClick={onClose}>取消</button>
                <button className="btn-primary" onClick={onSave}>
                  <Check className="w-4 h-4" /> {editing.id ? '保存' : '创建'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ---------------- 快照文件浏览器 ----------------
function SnapshotBrowser({ open, snapshot, onClose }: {
  open: boolean;
  snapshot: PaperSnapshot | null;
  onClose: () => void;
}) {
  const [files, setFiles] = useState<{ name: string; size: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [content, setContent] = useState<{ text: string | null; binary: boolean; size: number } | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);

  useEffect(() => {
    if (open && snapshot) {
      setLoading(true);
      setActiveFile(null); setContent(null);
      Papers.snapshotFiles(snapshot.id)
        .then(r => setFiles(r.files))
        .catch(e => toast.error('读取失败：' + e.message))
        .finally(() => setLoading(false));
    }
  }, [open, snapshot?.id]);

  const openFile = async (name: string) => {
    if (!snapshot) return;
    setActiveFile(name);
    setLoadingFile(true);
    setContent(null);
    try {
      const r = await Papers.snapshotFile(snapshot.id, name);
      setContent({ text: r.content, binary: r.binary, size: r.size });
    } catch (e: any) {
      toast.error('读取失败：' + e.message);
    } finally {
      setLoadingFile(false);
    }
  };

  return (
    <AnimatePresence>
      {open && snapshot && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      className="fixed inset-8 z-50 max-w-6xl max-h-[90vh] m-auto card overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <div className="font-semibold">{snapshot.version_label} · 文件浏览</div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {snapshot.snapshot_at.replace('T', ' ').slice(0, 16)} · {snapshot.word_count} 字
                </div>
              </div>
              <button className="btn-icon" onClick={onClose}><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 grid grid-cols-12 overflow-hidden">
              {/* 左侧文件列表 */}
              <div className="col-span-4 border-r border-slate-200 dark:border-slate-700 overflow-y-auto">
                {loading ? (
                  <div className="p-4 text-center text-slate-400"><Loader2 className="w-4 h-4 animate-spin inline" /></div>
                ) : files.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">空快照</div>
                ) : (
                  <div className="p-2 space-y-0.5">
                    {files.map(f => {
                      const isTex = f.name.endsWith('.tex') || f.name.endsWith('.bib') || f.name.endsWith('.md');
                      return (
                        <button key={f.name} onClick={() => openFile(f.name)}
                                className={`w-full flex items-center gap-2 px-2 py-1.5 text-left rounded text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition
                                            ${activeFile === f.name ? 'bg-slate-100 dark:bg-slate-800' : ''}`}>
                          <FileIcon className={`w-3.5 h-3.5 shrink-0 ${isTex ? 'text-indigo-500' : 'text-slate-400'}`} />
                          <span className="flex-1 truncate">{f.name}</span>
                          <span className="text-[10px] text-slate-400">{fmtSize(f.size)}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              {/* 右侧文件内容 */}
              <div className="col-span-8 overflow-auto bg-slate-50 dark:bg-slate-900">
                {!activeFile ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    👈 从左侧选一个文件查看内容
                  </div>
                ) : loadingFile ? (
                  <div className="p-8 text-center text-slate-400"><Loader2 className="w-4 h-4 animate-spin inline" /></div>
                ) : content?.binary ? (
                  <div className="p-8 text-center text-sm text-slate-500">
                    🔒 二进制文件（{fmtSize(content.size)}），无法预览<br />
                    <span className="text-xs">下载整个 ZIP 后用本地工具查看</span>
                  </div>
                ) : (
                  <pre className="p-4 text-xs font-mono whitespace-pre-wrap break-words">
                    {content?.text}
                  </pre>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
