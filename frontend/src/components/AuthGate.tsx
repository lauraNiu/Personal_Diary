import { useEffect, useState } from 'react';
import { useAuth } from '../auth';
import { Sparkles, Mail, Lock, User, Loader2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, init } = useAuth();
  useEffect(() => { init(); }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!user) return <AuthScreen />;
  return <>{children}</>;
}

function AuthScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!email || !password || (mode === 'register' && !name)) {
      toast.error('请填写所有字段');
      return;
    }
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email, password);
        toast.success('欢迎回来！');
      } else {
        await register(email, name, password);
        toast.success('注册成功！开始你的第一个任务吧');
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || e.message || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-full grid grid-cols-1 md:grid-cols-2 bg-slate-50 dark:bg-slate-900">
      {/* 左侧品牌区 */}
      <div className="hidden md:flex flex-col justify-center p-12 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white">
        <div className="max-w-md">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="text-2xl font-bold">Personal Life OS</div>
          </div>
          <div className="text-3xl font-light leading-relaxed mb-4">
            一个 AI 驱动的<br />
            <span className="font-semibold">个人生命周期</span>管理系统
          </div>
          <div className="text-white/80 leading-relaxed mb-8">
            学术、工作、生活，三大空间一站式管理。<br />
            按 Q 一句话录入，AI 自动解析、规划、提醒。
          </div>
          <div className="space-y-3 text-sm">
            <Feat>🎓 论文管理 + Overleaf 自动同步</Feat>
            <Feat>🤖 GLM-5.1 智能任务解析</Feat>
            <Feat>📧 每日 / 周 / 月度邮件复盘</Feat>
            <Feat>📊 10 种视图 · 看板 / 甘特 / 日历 / 四象限...</Feat>
          </div>
        </div>
      </div>

      {/* 右侧表单区 */}
      <div className="flex items-center justify-center p-6 md:p-12">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-sm">
          <div className="md:hidden flex items-center gap-2 mb-8 text-indigo-500">
            <Sparkles className="w-6 h-6" />
            <div className="text-xl font-bold">Personal Life OS</div>
          </div>

          <div className="text-2xl font-bold mb-1">
            {mode === 'login' ? '欢迎回来' : '创建账号'}
          </div>
          <div className="text-sm text-slate-500 mb-6">
            {mode === 'login' ? '登录继续管理你的任务' : '邮箱 + 密码即可，30 秒搞定'}
          </div>

          <form onSubmit={submit} className="space-y-3">
            <AnimatePresence mode="wait">
              {mode === 'register' && (
                <motion.div initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input className="input pl-9 py-2.5"
                           placeholder="你的名字"
                           value={name}
                           onChange={(e) => setName(e.target.value)} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="input pl-9 py-2.5" type="email" autoComplete="email"
                     placeholder="邮箱"
                     value={email}
                     onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="input pl-9 py-2.5" type="password"
                     autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                     placeholder={mode === 'login' ? '密码' : '设置密码（≥6位）'}
                     value={password}
                     onChange={(e) => setPassword(e.target.value)} />
            </div>

            <button type="submit" disabled={submitting}
                    className="btn-primary w-full justify-center py-2.5 text-base mt-2">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <>{mode === 'login' ? '登录' : '创建账号'} <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-500">
            {mode === 'login' ? (
              <>还没账号？<button onClick={() => setMode('register')}
                                  className="text-indigo-500 hover:underline ml-1 font-medium">
                立即注册
              </button></>
            ) : (
              <>已有账号？<button onClick={() => setMode('login')}
                                  className="text-indigo-500 hover:underline ml-1 font-medium">
                返回登录
              </button></>
            )}
          </div>

          <div className="mt-8 text-xs text-slate-400 text-center">
            注册即表示同意「数据本地存储」 · 仅用于个人任务管理
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function Feat({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-white/90">
      <span>{children}</span>
    </div>
  );
}
