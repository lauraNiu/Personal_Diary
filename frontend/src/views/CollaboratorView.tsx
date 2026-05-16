import { useState } from 'react';
import { useStore } from '../store';
import { TaskCard } from '../components/TaskCard';
import { Tooltip } from '../components/Tooltip';
import { Collaborators as CollabAPI } from '../api';
import type { Collaborator } from '../types';
import { Users, Plus, Edit2, Trash2, X, Check, Mail, Briefcase } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const ROLE_OPTIONS = ['导师', '学生', '同事', '上级', '下属', '合作者', '其他'];
const COLOR_PALETTE = [
  '#EF4444', '#F97316', '#EAB308', '#22C55E', '#06B6D4',
  '#3B82F6', '#8B5CF6', '#EC4899', '#F43F5E', '#10B981',
];

export function CollaboratorView() {
  const { tasks, collaborators, selectedCollaboratorId, setSelectedCollaborator, loadAll } = useStore();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Collaborator> | null>(null);

  const openCreate = () => {
    setEditing({
      name: '',
      email: '',
      role: '合作者',
      institution: '',
      avatar_color: COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)],
      notes: '',
    });
    setEditorOpen(true);
  };

  const openEdit = (c: Collaborator) => {
    setEditing({ ...c });
    setEditorOpen(true);
  };

  const handleSave = async () => {
    if (!editing?.name?.trim()) {
      toast.error('姓名不能为空');
      return;
    }
    try {
      if (editing.id) {
        await CollabAPI.update(editing.id, editing);
        toast.success('已更新');
      } else {
        await CollabAPI.create(editing);
        toast.success('已添加');
      }
      setEditorOpen(false);
      setEditing(null);
      await loadAll();
    } catch (e: any) {
      toast.error('保存失败：' + e.message);
    }
  };

  const handleDelete = async (c: Collaborator) => {
    const taskCount = tasks.filter(t => t.collaborator_ids.includes(c.id)).length;
    const msg = taskCount > 0
      ? `删除协作者「${c.name}」？\n\n他/她还关联着 ${taskCount} 个任务，删除后任务将解除关联（不会删除任务）。`
      : `删除协作者「${c.name}」？此操作不可撤销。`;
    if (!confirm(msg)) return;
    try {
      await CollabAPI.delete(c.id);
      toast.success('已删除');
      if (selectedCollaboratorId === c.id) setSelectedCollaborator(null);
      await loadAll();
    } catch (e: any) {
      toast.error('删除失败：' + e.message);
    }
  };

  // 单人详情视图
  if (selectedCollaboratorId) {
    const c = collaborators.find(x => x.id === selectedCollaboratorId);
    const ts = tasks.filter(t => t.collaborator_ids.includes(selectedCollaboratorId));
    if (!c) return null;
    return (
      <>
        <div className="p-6 overflow-y-auto h-full">
          <button className="text-xs text-slate-500 mb-3 hover:text-indigo-500" onClick={() => setSelectedCollaborator(null)}>
            ← 返回全部协作者
          </button>
          <div className="card p-5 mb-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center justify-center w-12 h-12 rounded-full text-xl text-white"
                    style={{ background: c.avatar_color }}>
                {c.name.charAt(0)}
              </span>
              <div className="flex-1">
                <div className="text-lg font-semibold">{c.name}</div>
                <div className="text-xs text-slate-500 flex flex-wrap gap-3 mt-1">
                  {c.role && <span className="inline-flex items-center gap-1"><Briefcase className="w-3 h-3" />{c.role}</span>}
                  {c.email && <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</span>}
                  {c.institution && <span>🏢 {c.institution}</span>}
                </div>
                {c.notes && <div className="text-xs text-slate-500 mt-2 italic">{c.notes}</div>}
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="text-right">
                  <div className="text-2xl font-bold">{ts.length}</div>
                  <div className="text-xs text-slate-500">关联任务</div>
                </div>
                <div className="flex gap-1">
                  <Tooltip title="编辑">
                    <button className="btn-icon" onClick={() => openEdit(c)}>
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </Tooltip>
                  <Tooltip title="删除" warning="此操作不可撤销">
                    <button className="btn-icon text-red-500" onClick={() => handleDelete(c)}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </Tooltip>
                </div>
              </div>
            </div>
          </div>
          {ts.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              暂无关联任务<br />
              <span className="text-xs">在任何任务详情中勾选「{c.name}」即可关联</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {ts.map(t => <TaskCard key={t.id} task={t} />)}
            </div>
          )}
        </div>
        <CollaboratorEditor
          open={editorOpen}
          editing={editing}
          setEditing={setEditing}
          onSave={handleSave}
          onClose={() => { setEditorOpen(false); setEditing(null); }}
        />
      </>
    );
  }

  // 列表视图
  const grouped = collaborators.map(c => ({
    collab: c,
    tasks: tasks.filter(t => t.collaborator_ids.includes(c.id) && t.status !== 'done'),
  }));

  return (
    <>
      <div className="p-6 overflow-y-auto h-full">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-lg font-semibold">协作者</div>
            <div className="text-xs text-slate-500 mt-0.5">
              共 {collaborators.length} 人 · AI 解析任务时会自动识别新的协作者
            </div>
          </div>
          <Tooltip title="添加协作者" desc="手动新建一个协作者">
            <button className="btn-primary" onClick={openCreate}>
              <Plus className="w-4 h-4" /> 添加协作者
            </button>
          </Tooltip>
        </div>

        {grouped.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Users className="w-12 h-12 mx-auto mb-2" />
            <div>还没有协作者</div>
            <div className="text-xs mt-2">点右上角「+ 添加协作者」手动添加</div>
            <div className="text-xs mt-1">或按 <kbd className="kbd">Q</kbd> 用 AI 快速录入"和某某讨论..."自动创建</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {grouped.map(({ collab, tasks }) => (
              <div key={collab.id}
                   className="group card p-4 cursor-pointer hover:shadow-md transition relative">
                <div className="flex items-center gap-3" onClick={() => setSelectedCollaborator(collab.id)}>
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-full text-white"
                        style={{ background: collab.avatar_color }}>
                    {collab.name.charAt(0)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{collab.name}</div>
                    <div className="text-xs text-slate-500 truncate">
                      {collab.role || '协作者'}{collab.email ? ` · ${collab.email}` : ''}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-indigo-500">{tasks.length}</div>
                    <div className="text-[10px] text-slate-500">活跃</div>
                  </div>
                </div>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition flex gap-0.5">
                  <Tooltip title="编辑">
                    <button onClick={(e) => { e.stopPropagation(); openEdit(collab); }}
                            className="btn-icon w-7 h-7 bg-white/80 dark:bg-slate-700/80">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </Tooltip>
                  <Tooltip title="删除" warning="不可撤销">
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(collab); }}
                            className="btn-icon w-7 h-7 bg-white/80 dark:bg-slate-700/80 text-red-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </Tooltip>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <CollaboratorEditor
        open={editorOpen}
        editing={editing}
        setEditing={setEditing}
        onSave={handleSave}
        onClose={() => { setEditorOpen(false); setEditing(null); }}
      />
    </>
  );
}

interface EditorProps {
  open: boolean;
  editing: Partial<Collaborator> | null;
  setEditing: (e: Partial<Collaborator> | null) => void;
  onSave: () => void;
  onClose: () => void;
}

function CollaboratorEditor({ open, editing, setEditing, onSave, onClose }: EditorProps) {
  return (
    <AnimatePresence>
      {open && editing && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
                      onClick={onClose} />
          <motion.div initial={{ opacity: 0, y: -20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ type: 'spring', damping: 24, stiffness: 320 }}
                      className="fixed top-24 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg mx-4">
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-500" />
                  {editing.id ? '编辑协作者' : '新增协作者'}
                </div>
                <button className="btn-icon" onClick={onClose}><X className="w-4 h-4" /></button>
              </div>

              <div className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center justify-center w-12 h-12 rounded-full text-xl text-white shrink-0"
                        style={{ background: editing.avatar_color || '#94A3B8' }}>
                    {editing.name?.charAt(0) || '?'}
                  </span>
                  <div className="flex-1">
                    <label className="text-xs text-slate-500">姓名 *</label>
                    <input className="input mt-1" autoFocus
                           value={editing.name || ''}
                           onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                           placeholder="例：张老师" />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-500">头像颜色</label>
                  <div className="flex gap-1.5 mt-1">
                    {COLOR_PALETTE.map(c => (
                      <button key={c}
                              onClick={() => setEditing({ ...editing, avatar_color: c })}
                              className="w-6 h-6 rounded-full border-2 transition"
                              style={{
                                background: c,
                                borderColor: editing.avatar_color === c ? '#0F172A' : 'transparent',
                              }}>
                        {editing.avatar_color === c && <Check className="w-3 h-3 text-white mx-auto" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500">角色</label>
                    <select className="input mt-1"
                            value={editing.role || '合作者'}
                            onChange={(e) => setEditing({ ...editing, role: e.target.value })}>
                      {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">所属机构</label>
                    <input className="input mt-1"
                           value={editing.institution || ''}
                           onChange={(e) => setEditing({ ...editing, institution: e.target.value })}
                           placeholder="例：某大学 / 某公司" />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-500">邮箱（可选，用于会议邀请）</label>
                  <input className="input mt-1" type="email"
                         value={editing.email || ''}
                         onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                         placeholder="example@domain.com" />
                </div>

                <div>
                  <label className="text-xs text-slate-500">备注</label>
                  <textarea className="input mt-1" rows={2}
                            value={editing.notes || ''}
                            onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                            placeholder="例：研究方向 NLP，每周三组会..." />
                </div>
              </div>

              <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-2">
                <button className="btn-ghost" onClick={onClose}>取消</button>
                <button className="btn-primary" onClick={onSave}>
                  <Check className="w-4 h-4" /> {editing.id ? '保存' : '添加'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
