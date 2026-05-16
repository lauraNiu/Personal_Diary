import { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';
import { AI } from '../api';
import { X, Sparkles, Send, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AIParsed } from '../types';
import { PRIORITY_COLORS, PRIORITY_LABELS } from '../utils';
import toast from 'react-hot-toast';

export function QuickCapture() {
  const { quickCaptureOpen, toggleQuickCapture, loadAll, spaces } = useStore();
  const [text, setText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<AIParsed | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (quickCaptureOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setText(''); setParsed(null); setCreatedId(null);
    }
  }, [quickCaptureOpen]);

  // ESC 关闭
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && quickCaptureOpen) toggleQuickCapture();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [quickCaptureOpen, toggleQuickCapture]);

  const submit = async () => {
    if (!text.trim() || parsing) return;
    setParsing(true);
    try {
      const r = await AI.parse(text, true);
      setParsed(r.parsed);
      setCreatedId(r.task?.id || null);
      await loadAll();
      toast.success('AI 已解析并创建任务');
      setTimeout(() => toggleQuickCapture(), 1500);
    } catch (e: any) {
      toast.error('AI 解析失败：' + (e?.message || ''));
    } finally {
      setParsing(false);
    }
  };

  const space = parsed && spaces.find(s => s.id === parsed.space_id);

  return (
    <AnimatePresence>
      {quickCaptureOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={toggleQuickCapture}
          />
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', damping: 24, stiffness: 320 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl mx-4"
          >
            <div className="card overflow-hidden">
              <div className="flex items-center gap-2 px-4 pt-3 pb-2 text-sm text-slate-500">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <span>告诉 AI 你想做什么</span>
                <button onClick={toggleQuickCapture} className="ml-auto btn-icon">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <textarea
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    submit();
                  }
                }}
                placeholder="例：下周三和张老师讨论 NLP 论文进展，紧急"
                className="w-full px-4 py-3 text-base bg-transparent outline-none resize-none border-0"
                rows={3}
              />

              {parsed && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border-t border-slate-200 dark:border-slate-700 p-4 space-y-2 bg-slate-50 dark:bg-slate-900/50"
                >
                  <div className="text-xs text-slate-500 mb-2">✨ AI 解析结果</div>
                  <div className="text-sm font-medium">{parsed.title}</div>
                  <div className="flex items-center gap-3 text-xs flex-wrap">
                    {space && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded"
                            style={{ background: space.color + '20', color: space.color }}>
                        {space.emoji} {space.name}
                      </span>
                    )}
                    <span style={{ color: PRIORITY_COLORS[parsed.priority] }}>
                      ⚡ {PRIORITY_LABELS[parsed.priority]}
                    </span>
                    {parsed.due_date && <span>📅 {parsed.due_date}</span>}
                    {parsed.estimated_hours && <span>⏱ {parsed.estimated_hours}h</span>}
                  </div>
                  {parsed.collaborators?.length > 0 && (
                    <div className="text-xs">👤 {parsed.collaborators.join(', ')}</div>
                  )}
                  {parsed.subtasks?.length > 0 && (
                    <div className="text-xs space-y-0.5 mt-1">
                      {parsed.subtasks.map((s, i) => <div key={i}>· {s}</div>)}
                    </div>
                  )}
                  {createdId && (
                    <div className="text-xs text-green-600 mt-2">✓ 任务已创建</div>
                  )}
                </motion.div>
              )}

              <div className="px-4 py-2.5 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2 text-xs text-slate-500">
                <kbd className="kbd">↵</kbd>
                <span>确认</span>
                <kbd className="kbd">Shift+↵</kbd>
                <span>换行</span>
                <kbd className="kbd">ESC</kbd>
                <span>关闭</span>
                <button
                  onClick={submit}
                  disabled={!text.trim() || parsing}
                  className="btn-primary ml-auto"
                >
                  {parsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {parsing ? '解析中...' : '创建任务'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
