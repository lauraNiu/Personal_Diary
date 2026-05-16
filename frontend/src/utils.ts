import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import relativeTime from 'dayjs/plugin/relativeTime';
import type { Priority, TaskStatus } from './types';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

export const fmt = (d?: string, pattern = 'YYYY-MM-DD') => (d ? dayjs(d).format(pattern) : '');
export const fromNow = (d?: string) => (d ? dayjs(d).fromNow() : '');

export const PRIORITY_COLORS: Record<Priority, string> = {
  urgent: '#EF4444',
  high: '#F97316',
  medium: '#EAB308',
  low: '#22C55E',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  urgent: '紧急',
  high: '高',
  medium: '中',
  low: '低',
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  inbox: '收件箱',
  todo: '待办',
  in_progress: '进行中',
  done: '已完成',
  cancelled: '已取消',
};

export const STATUS_COLUMNS: { key: TaskStatus; label: string; bgClass: string }[] = [
  { key: 'todo', label: '待办', bgClass: 'bg-slate-100 dark:bg-slate-800/50' },
  { key: 'in_progress', label: '进行中', bgClass: 'bg-blue-50 dark:bg-blue-900/20' },
  { key: 'done', label: '已完成', bgClass: 'bg-green-50 dark:bg-green-900/20' },
];

export function dueDateColor(due?: string): string {
  if (!due) return 'text-slate-500';
  const days = dayjs(due).diff(dayjs(), 'day');
  if (days < 0) return 'text-red-600 font-semibold';
  if (days <= 1) return 'text-red-500 font-medium';
  if (days <= 3) return 'text-orange-500';
  if (days <= 7) return 'text-yellow-600';
  return 'text-slate-500';
}

export function dueDateLabel(due?: string): string {
  if (!due) return '';
  const d = dayjs(due);
  const days = d.diff(dayjs().startOf('day'), 'day');
  if (days < 0) return `已逾期 ${-days} 天`;
  if (days === 0) return '今天';
  if (days === 1) return '明天';
  if (days <= 7) return `${days} 天后`;
  return d.format('M月D日');
}
