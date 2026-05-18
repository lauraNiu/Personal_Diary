import { useEffect, useState } from 'react';
import { Meetings as MeetingsAPI } from '../api';
import { useStore } from '../store';
import type { Meeting } from '../types';
import {
  CalendarClock, Plus, Edit2, Trash2, Mail, MapPin, Users, Check, X, Loader2, Clock,
} from 'lucide-react';
import { Tooltip } from '../components/Tooltip';
import { motion, AnimatePresence } from 'framer-motion';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';

const REMINDER_OPTIONS = [
  { v: 0, l: '不提醒' },
  { v: 5, l: '5 分钟前' },
  { v: 15, l: '15 分钟前' },
  { v: 30, l: '30 分钟前（推荐）' },
  { v: 60, l: '1 小时前' },
  { v: 1440, l: '1 天前' },
];

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

export function MeetingsView() {
  const { collaborators, spaces, projects, selectedSpaceId } = useStore();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Meeting> | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const list = await MeetingsAPI.list(
        selectedSpaceId === 'all' ? undefined : selectedSpaceId
      );
      setMeetings(list);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [selectedSpaceId]);

  const openCreate = () => {
    // 默认下个整点
    const def = dayjs().add(1, 'hour').minute(0).second(0);
    setEditing({
      title: '',
      scheduled_at: def.format('YYYY-MM-DDTHH:mm'),
      duration_minutes: 60,
      attendee_ids: [],
      reminder_minutes: 30,
      location: '',
      agenda: '',
      notes: '',
      action_items: [],
      space_id: selectedSpaceId !== 'all' ? selectedSpaceId : undefined,
    });
    setEditorOpen(true);
  };

  const openEdit = (m: Meeting) => {
    setEditing({ ...m, scheduled_at: m.scheduled_at.slice(0, 16) });
    setEditorOpen(true);
  };

  const handleSave = async () => {
    if (!editing?.title?.trim()) { toast.error('标题不能为空'); return; }
    if (!editing.scheduled_at) { toast.error('请选择时间'); return; }
    try {
      if (editing.id) {
        await MeetingsAPI.update(editing.id, editing);
        toast.success('已保存');
      } else {
        await MeetingsAPI.create(editing);
        toast.success('已创建');
      }
      setEditorOpen(false);
      setEditing(null);
      await load();
    } catch (e: any) {
      toast.error('保存失败：' + (e?.response?.data?.detail || e.message));
    }
  };

  const handleDelete = async (m: Meeting) => {
    if (!confirm(`删除会议「${m.title}」？`)) return;
    try {
      await MeetingsAPI.delete(m.id);
      toast.success('已删除');
      await load();
    } catch (e: any) {
      toast.error('删除失败：' + e.message);
    }
  };

  const testReminder = async (m: Meeting) => {
    try {
      const r = await MeetingsAPI.testReminder(m.id);
      if (r.ok) toast.success('测试邮件已发送');
      else toast.error(r.message || '发送失败');
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || e.message);
    }
  };

  const now = dayjs();
  const upcoming = meetings.filter(m => dayjs(m.scheduled_at).isAfter(now));
  const past = meetings.filter(m => dayjs(m.scheduled_at).isBefore(now));

  if (loading) {
    return <div className="p-8 text-center text-slate-500"><Loader2 className="w-5 h-5 animate-spin inline" /></div>;
  }

  return (
    <>
      <div className="p-6 overflow-y-auto h-full">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-lg font-semibold">会议</div>
            <div className="text-xs text-slate-500 mt-0.5">
              共 {meetings.length} 场 · 即将开始 {upcoming.length} · 已结束 {past.length}
            </div>
          </div>
          <Tooltip title="新建会议" desc="设置时间和参会人，自动会前邮件提醒">
            <button className="btn-primary" onClick={openCreate}>
              <Plus className="w-4 h-4" /> 新建会议
            </button>
          </Tooltip>
        </div>

        {/* 即将开始 */}
        <div className="mb-6">
          <div className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-2">
            <CalendarClock className="w-4 h-4" /> 即将开始
          </div>
          {upcoming.length === 0 ? (
            <div className="card p-8 text-center text-slate-400 text-sm">
              暂无即将开始的会议<br />
              <span className="text-xs mt-1 block">点右上角"新建会议"开始安排</span>
            </div>
          ) : (
            <div className="space-y-2">
              {upcoming.map(m => <MeetingCard key={m.id} meeting={m}
                                              collaborators={collaborators}
                                              spaces={spaces}
                                              onEdit={openEdit}
                                              onDelete={handleDelete}
                                              onTestReminder={testReminder} />)}
            </div>
          )}
        </div>

        {/* 已结束 */}
        {past.length > 0 && (
          <div>
            <div className="text-sm font-semibold text-slate-500 mb-2">已结束</div>
            <div className="space-y-2 opacity-70">
              {past.slice(0, 10).reverse().map(m => <MeetingCard key={m.id} meeting={m}
                                                                  collaborators={collaborators}
                                                                  spaces={spaces}
                                                                  onEdit={openEdit}
                                                                  onDelete={handleDelete}
                                                                  onTestReminder={testReminder} />)}
            </div>
          </div>
        )}
      </div>

      <MeetingEditor
        open={editorOpen}
        editing={editing}
        setEditing={setEditing}
        onSave={handleSave}
        onClose={() => { setEditorOpen(false); setEditing(null); }}
      />
    </>
  );
}

function MeetingCard({ meeting, collaborators, spaces, onEdit, onDelete, onTestReminder }: any) {
  const sched = dayjs(meeting.scheduled_at);
  const end = sched.add(meeting.duration_minutes, 'minute');
  const now = dayjs();
  const isFuture = sched.isAfter(now);
  const isOngoing = sched.isBefore(now) && end.isAfter(now);
  const mins = sched.diff(now, 'minute');

  const attendees = (meeting.attendee_ids || [])
    .map((id: string) => collaborators.find((c: any) => c.id === id))
    .filter(Boolean);
  const space = spaces.find((s: any) => s.id === meeting.space_id);

  let countdown = '';
  if (isOngoing) countdown = '🔴 进行中';
  else if (isFuture) {
    if (mins < 60) countdown = `${mins} 分钟后`;
    else if (mins < 1440) countdown = `${Math.floor(mins / 60)} 小时后`;
    else countdown = `${Math.floor(mins / 1440)} 天后`;
  }

  return (
    <div className="card p-4 group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="font-semibold">{meeting.title}</div>
            {countdown && (
              <span className={`text-xs px-2 py-0.5 rounded ${isOngoing
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
              }`}>{countdown}</span>
            )}
            {space && (
              <span className="text-[10px] px-1.5 py-0.5 rounded"
                    style={{ background: space.color + '20', color: space.color }}>
                {space.emoji} {space.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs text-slate-600 dark:text-slate-300 flex-wrap">
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {sched.format('YYYY-MM-DD HH:mm')} ~ {end.format('HH:mm')} ({meeting.duration_minutes}min)
            </span>
            {meeting.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {meeting.location}
              </span>
            )}
            {meeting.reminder_minutes > 0 && (
              <span className="inline-flex items-center gap-1 text-indigo-500">
                <Mail className="w-3 h-3" /> 会前 {meeting.reminder_minutes}min 邮件提醒
                {meeting.reminder_sent === 1 && <span className="text-green-500">· 已发送</span>}
              </span>
            )}
          </div>
          {attendees.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2">
              <Users className="w-3 h-3 text-slate-500" />
              {attendees.map((c: any) => (
                <span key={c.id} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-white"
                      style={{ background: c.avatar_color }}>
                  {c.name}
                </span>
              ))}
            </div>
          )}
          {meeting.agenda && (
            <div className="text-xs text-slate-500 mt-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded border-l-2 border-indigo-300 whitespace-pre-line">
              {meeting.agenda}
            </div>
          )}
        </div>
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition">
          <Tooltip title="发送测试提醒邮件" desc="立即触发一次，验证邮件能不能收到">
            <button onClick={() => onTestReminder(meeting)} className="btn-icon">
              <Mail className="w-4 h-4" />
            </button>
          </Tooltip>
          <Tooltip title="编辑">
            <button onClick={() => onEdit(meeting)} className="btn-icon">
              <Edit2 className="w-4 h-4" />
            </button>
          </Tooltip>
          <Tooltip title="删除" warning="不可撤销">
            <button onClick={() => onDelete(meeting)} className="btn-icon text-red-500">
              <Trash2 className="w-4 h-4" />
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

// ---------- 编辑/新建会议弹窗 ----------
function MeetingEditor({ open, editing, setEditing, onSave, onClose }: {
  open: boolean;
  editing: Partial<Meeting> | null;
  setEditing: (e: Partial<Meeting> | null) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const { collaborators, spaces, projects } = useStore();

  return (
    <AnimatePresence>
      {open && editing && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onClose} />
          <motion.div initial={{ opacity: 0, y: -16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ type: 'spring', damping: 24, stiffness: 320 }}
                      className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl mx-4">
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="font-semibold flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-indigo-500" />
                  {editing.id ? '编辑会议' : '新建会议'}
                </div>
                <button className="btn-icon" onClick={onClose}><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4 space-y-3 max-h-[75vh] overflow-y-auto">
                <div>
                  <label className="text-xs text-slate-500">会议标题 *</label>
                  <input className="input mt-1" autoFocus
                         value={editing.title || ''}
                         onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                         placeholder="例：和张老师对齐 EMNLP 论文进度" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500">开始时间 *</label>
                    <input className="input mt-1" type="datetime-local"
                           value={editing.scheduled_at || ''}
                           onChange={(e) => setEditing({ ...editing, scheduled_at: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">时长</label>
                    <select className="input mt-1"
                            value={editing.duration_minutes || 60}
                            onChange={(e) => setEditing({ ...editing, duration_minutes: +e.target.value })}>
                      {DURATION_OPTIONS.map(d => (
                        <option key={d} value={d}>{d < 60 ? `${d} 分钟` : `${d / 60} 小时${d % 60 ? ` ${d % 60}分` : ''}`}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-500">📍 地点 / 会议室 / Zoom 链接</label>
                  <input className="input mt-1"
                         value={editing.location || ''}
                         onChange={(e) => setEditing({ ...editing, location: e.target.value })}
                         placeholder="例：教研楼 304 / https://zoom.us/..." />
                </div>

                <div>
                  <label className="text-xs text-slate-500">⏰ 会前提醒</label>
                  <select className="input mt-1"
                          value={editing.reminder_minutes ?? 30}
                          onChange={(e) => setEditing({ ...editing, reminder_minutes: +e.target.value })}>
                    {REMINDER_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                  </select>
                  <div className="text-[10px] text-slate-400 mt-1">
                    选定的提前时间到了，系统会自动发邮件到你注册时填的邮箱
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-500">👥 参会人</label>
                  {collaborators.length === 0 ? (
                    <div className="text-xs text-slate-400 mt-1 p-2 bg-slate-50 dark:bg-slate-800/50 rounded">
                      暂无协作者。先到"协作者"视图添加，或按 Q 用 AI 录入"和某某..."会自动创建
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {collaborators.map(c => {
                        const sel = (editing.attendee_ids || []).includes(c.id);
                        return (
                          <button key={c.id} type="button"
                                  onClick={() => {
                                    const ids = sel
                                      ? (editing.attendee_ids || []).filter(x => x !== c.id)
                                      : [...(editing.attendee_ids || []), c.id];
                                    setEditing({ ...editing, attendee_ids: ids });
                                  }}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs transition
                                              ${sel ? 'text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
                                  style={{ background: sel ? c.avatar_color : undefined }}>
                            {c.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500">所属空间</label>
                    <select className="input mt-1"
                            value={editing.space_id || ''}
                            onChange={(e) => setEditing({ ...editing, space_id: e.target.value || undefined })}>
                      <option value="">无</option>
                      {spaces.map(s => <option key={s.id} value={s.id}>{s.emoji} {s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">关联项目</label>
                    <select className="input mt-1"
                            value={editing.project_id || ''}
                            onChange={(e) => setEditing({ ...editing, project_id: e.target.value || undefined })}>
                      <option value="">无</option>
                      {projects.filter(p => !editing.space_id || p.space_id === editing.space_id)
                        .map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-500">📋 议程</label>
                  <textarea className="input mt-1" rows={4}
                            value={editing.agenda || ''}
                            onChange={(e) => setEditing({ ...editing, agenda: e.target.value })}
                            placeholder="例：&#10;1. 上次会议 action 回顾&#10;2. 本周进度同步&#10;3. 下周计划" />
                </div>

                <div>
                  <label className="text-xs text-slate-500">备注</label>
                  <textarea className="input mt-1" rows={2}
                            value={editing.notes || ''}
                            onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                            placeholder="会议纪要、会后想法..." />
                </div>
              </div>
              <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-2">
                <button className="btn-ghost" onClick={onClose}>取消</button>
                <button className="btn-primary" onClick={onSave}>
                  <Check className="w-4 h-4" /> {editing.id ? '保存' : '创建会议'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
