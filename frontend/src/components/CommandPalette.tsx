import { Command } from 'cmdk';
import { useStore } from '../store';
import { useEffect } from 'react';
import { Sparkles, Plus, Search, FileText, Users, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function CommandPalette() {
  const { commandPaletteOpen, toggleCommandPalette, tasks, projects, collaborators,
          openTaskDetail, setCurrentView, toggleQuickCapture } = useStore();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && commandPaletteOpen) toggleCommandPalette();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [commandPaletteOpen, toggleCommandPalette]);

  return (
    <AnimatePresence>
      {commandPaletteOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
                      onClick={toggleCommandPalette} />
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="fixed top-32 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl mx-4">
            <Command className="card overflow-hidden">
              <div className="flex items-center gap-2 px-3 border-b border-slate-200 dark:border-slate-700">
                <Search className="w-4 h-4 text-slate-400" />
                <Command.Input placeholder="搜索任务、项目、协作者..."
                               className="flex-1 py-3 bg-transparent outline-none text-sm" />
              </div>
              <Command.List className="max-h-96 overflow-y-auto p-2">
                <Command.Empty className="text-center py-6 text-sm text-slate-400">没有匹配结果</Command.Empty>

                <Command.Group heading="快捷操作" className="text-xs text-slate-500 px-2 py-1">
                  <Command.Item onSelect={() => { toggleCommandPalette(); toggleQuickCapture(); }}
                                className="px-2 py-2 rounded text-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-500" /> AI 快速录入
                    <kbd className="kbd ml-auto">Q</kbd>
                  </Command.Item>
                  <Command.Item onSelect={() => { toggleCommandPalette(); setCurrentView('paper'); }}
                                className="px-2 py-2 rounded text-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> 打开论文 Hub
                  </Command.Item>
                  <Command.Item onSelect={() => { toggleCommandPalette(); setCurrentView('focus'); }}
                                className="px-2 py-2 rounded text-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2">
                    🍅 进入专注模式
                    <kbd className="kbd ml-auto">F</kbd>
                  </Command.Item>
                </Command.Group>

                {tasks.length > 0 && (
                  <Command.Group heading="任务" className="text-xs text-slate-500 px-2 py-1 mt-2">
                    {tasks.slice(0, 8).map(t => (
                      <Command.Item key={t.id} value={'task ' + t.title}
                                    onSelect={() => { toggleCommandPalette(); openTaskDetail(t.id); }}
                                    className="px-2 py-1.5 rounded text-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2">
                        <span>📋</span>
                        <span className="truncate">{t.title}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {collaborators.length > 0 && (
                  <Command.Group heading="协作者" className="text-xs text-slate-500 px-2 py-1 mt-2">
                    {collaborators.slice(0, 5).map(c => (
                      <Command.Item key={c.id} value={'collab ' + c.name}
                                    className="px-2 py-1.5 rounded text-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>{c.name}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}
              </Command.List>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
