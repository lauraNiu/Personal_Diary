import { useEffect, useState, useRef } from 'react';
import { useStore } from '../store';
import { Play, Pause, SkipForward, X } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const POMODORO = 25 * 60;
const BREAK = 5 * 60;

export function FocusView() {
  const { tasks, setCurrentView } = useStore();
  const [taskId, setTaskId] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(POMODORO);
  const [running, setRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [completed, setCompleted] = useState(0);
  const ref = useRef<number | null>(null);

  const task = tasks.find(t => t.id === taskId);
  const todoTasks = tasks.filter(t => t.status === 'todo' || t.status === 'in_progress');

  useEffect(() => {
    if (!running) return;
    ref.current = window.setInterval(() => {
      setSeconds(s => {
        if (s <= 1) {
          if (isBreak) {
            setIsBreak(false); setRunning(false);
            toast.success('休息结束！开始下一个番茄');
            return POMODORO;
          } else {
            setCompleted(c => c + 1);
            toast.success('🍅 番茄完成！休息一下');
            setIsBreak(true);
            return BREAK;
          }
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [running, isBreak]);

  const total = isBreak ? BREAK : POMODORO;
  const pct = ((total - seconds) / total) * 100;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="fixed inset-0 z-40 bg-slate-900 text-white flex flex-col items-center justify-center">
      <button onClick={() => setCurrentView('kanban')}
              className="absolute top-6 right-6 btn-icon text-white hover:bg-slate-800">
        <X className="w-5 h-5" />
      </button>

      {!taskId ? (
        <div className="w-full max-w-md text-center">
          <div className="text-2xl font-light mb-6">选择要专注的任务</div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {todoTasks.length === 0 && <div className="text-slate-400">没有待办任务</div>}
            {todoTasks.map(t => (
              <button key={t.id} onClick={() => setTaskId(t.id)}
                      className="w-full p-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-left transition">
                {t.title}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center">
          <div className="text-3xl font-light mb-1">{task?.title}</div>
          <div className="text-xs text-slate-400 mb-12">{isBreak ? '☕ 休息时间' : '🍅 专注中'}</div>
          <div className="text-9xl font-mono font-bold tabular-nums">
            {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </div>
          <div className="w-96 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-8">
            <div className={`h-full transition-all ${isBreak ? 'bg-blue-500' : 'bg-green-500'}`} style={{ width: `${pct}%` }} />
          </div>
          <div className="flex items-center justify-center gap-3 mt-8">
            <button onClick={() => setRunning(r => !r)} className="btn-primary px-6 py-3 text-base">
              {running ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              {running ? '暂停' : '开始'}
            </button>
            <button onClick={() => {
              setRunning(false);
              setIsBreak(b => !b);
              setSeconds(isBreak ? POMODORO : BREAK);
            }} className="btn-ghost text-white px-4 py-3">
              <SkipForward className="w-5 h-5" /> 跳过
            </button>
          </div>
          <div className="mt-6 text-sm text-slate-400">今日已完成 {completed} 个番茄</div>
        </div>
      )}
    </motion.div>
  );
}
