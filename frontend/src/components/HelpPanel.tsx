import { useStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const SHORTCUTS = [
  { key: 'Q', desc: 'Quick Capture - AI 快速录入' },
  { key: '⌘K', desc: '全局搜索' },
  { key: '⌘/', desc: '帮助面板' },
  { key: '⌘1-9', desc: '切换视图' },
  { key: '⌘[', desc: '侧边栏展开/收起' },
  { key: 'F', desc: '专注模式' },
  { key: 'ESC', desc: '关闭弹窗' },
];

const GUIDE = [
  { title: '🤖 AI 快速录入', body: '按 Q，输入一句自然语言（如"下周三和张老师讨论 NLP 论文"），AI 自动解析类别、协作者、截止日期、子任务。' },
  { title: '📋 看板拖拽', body: '在看板视图，拖拽任务卡片到不同列即可改变状态（待办/进行中/完成）。' },
  { title: '👥 协作者维度', body: 'AI 解析时自动识别人名并创建协作者；协作者视图按人聚合所有相关任务。' },
  { title: '📊 多视图切换', body: '同一份任务数据，可在 10 种视图（看板/甘特/日历/统计/四象限/容量/热力图/协作者/论文/专注）间切换。' },
  { title: '⏱ 容量管理', body: '容量视图显示今日/本周已分配工时，超载时变红警示。' },
  { title: '🍅 专注模式', body: '按 F 进入全屏番茄钟，25 分钟工作 + 5 分钟休息，完成后自动记录工时。' },
  { title: '📝 论文管理', body: '论文 Hub 支持绑定 Overleaf 项目，每日定时拉取版本快照、统计字数变化、生成版本时间轴。' },
  { title: '📧 邮件提醒', body: '配置 Gmail 后，每天 8:00 收到今日计划、周日 20:00 收到周回顾、临期任务自动预警。' },
];

export function HelpPanel() {
  const { helpPanelOpen, toggleHelpPanel } = useStore();
  return (
    <AnimatePresence>
      {helpPanelOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="fixed inset-0 bg-black/40 z-40" onClick={toggleHelpPanel} />
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                      transition={{ type: 'spring', damping: 30, stiffness: 320 }}
                      className="fixed right-0 top-0 bottom-0 w-96 bg-white dark:bg-slate-900
                                 border-l border-slate-200 dark:border-slate-800 z-50 overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-slate-900 px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="font-semibold">帮助中心</div>
              <button className="btn-icon" onClick={toggleHelpPanel}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-6">
              <section>
                <h3 className="font-semibold text-sm mb-2">⌨️ 快捷键</h3>
                <div className="space-y-1.5">
                  {SHORTCUTS.map(s => (
                    <div key={s.key} className="flex items-center justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-300">{s.desc}</span>
                      <kbd className="kbd">{s.key}</kbd>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="font-semibold text-sm mb-2">📖 功能指南</h3>
                <div className="space-y-3">
                  {GUIDE.map((g, i) => (
                    <div key={i} className="text-sm">
                      <div className="font-medium">{g.title}</div>
                      <div className="text-slate-500 mt-0.5 text-xs leading-relaxed">{g.body}</div>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="font-semibold text-sm mb-2">⚙️ 配置</h3>
                <div className="text-xs text-slate-500 space-y-2">
                  <div>编辑 <code className="kbd">backend/.env</code> 启用：</div>
                  <ul className="list-disc list-inside space-y-1">
                    <li><code className="text-indigo-500">ZHIPU_API_KEY</code> — AI 语义解析</li>
                    <li><code className="text-indigo-500">GMAIL_*</code> — 邮件提醒</li>
                    <li><code className="text-indigo-500">OVERLEAF_COOKIE</code> — 论文同步</li>
                  </ul>
                  <div className="mt-2">未配置时各功能自动降级到 mock 模式，前端仍可使用。</div>
                </div>
              </section>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
