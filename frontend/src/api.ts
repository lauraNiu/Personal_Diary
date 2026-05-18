/// <reference types="vite/client" />
import axios from 'axios';
import type {
  Space, Area, Project, Collaborator, Task, Paper, PaperSnapshot,
  Meeting, Notification, AIParsed, Tag, Priority, TaskStatus,
} from './types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000',
  timeout: 30000,
});

// Spaces
export const Spaces = {
  list: () => api.get<Space[]>('/api/spaces').then(r => r.data),
  create: (data: Partial<Space>) => api.post<Space>('/api/spaces', data).then(r => r.data),
  update: (id: string, data: Partial<Space>) => api.put<Space>(`/api/spaces/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/api/spaces/${id}`).then(r => r.data),
};

// Areas
export const Areas = {
  list: (space_id?: string) => api.get<Area[]>('/api/areas', { params: { space_id } }).then(r => r.data),
  create: (data: Partial<Area>) => api.post<Area>('/api/areas', data).then(r => r.data),
  update: (id: string, data: Partial<Area>) => api.put<Area>(`/api/areas/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/api/areas/${id}`).then(r => r.data),
};

// Projects
export const Projects = {
  list: (params?: { space_id?: string; area_id?: string }) =>
    api.get<Project[]>('/api/projects', { params }).then(r => r.data),
  create: (data: Partial<Project>) => api.post<Project>('/api/projects', data).then(r => r.data),
  update: (id: string, data: Partial<Project>) => api.put<Project>(`/api/projects/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/api/projects/${id}`).then(r => r.data),
};

// Tasks
export interface TaskFilter {
  space_id?: string;
  status?: TaskStatus;
  project_id?: string;
  collaborator_id?: string;
  is_inbox?: number;
  due_before?: string;
}
export const Tasks = {
  list: (params?: TaskFilter) => api.get<Task[]>('/api/tasks', { params }).then(r => r.data),
  get: (id: string) => api.get<Task>(`/api/tasks/${id}`).then(r => r.data),
  create: (data: Partial<Task>) => api.post<Task>('/api/tasks', data).then(r => r.data),
  update: (id: string, data: Partial<Task>) => api.put<Task>(`/api/tasks/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/api/tasks/${id}`).then(r => r.data),
  complete: (id: string) => api.post<Task>(`/api/tasks/${id}/complete`).then(r => r.data),
};

// Collaborators
export const Collaborators = {
  list: () => api.get<Collaborator[]>('/api/collaborators').then(r => r.data),
  create: (data: Partial<Collaborator>) => api.post<Collaborator>('/api/collaborators', data).then(r => r.data),
  update: (id: string, data: Partial<Collaborator>) => api.put<Collaborator>(`/api/collaborators/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/api/collaborators/${id}`).then(r => r.data),
};

// Papers
export const Papers = {
  list: (project_id?: string) => api.get<Paper[]>('/api/papers', { params: { project_id } }).then(r => r.data),
  create: (data: Partial<Paper>) => api.post<Paper>('/api/papers', data).then(r => r.data),
  update: (id: string, data: Partial<Paper>) => api.put<Paper>(`/api/papers/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/api/papers/${id}`).then(r => r.data),
  sync: (id: string) => api.post(`/api/papers/${id}/sync`).then(r => r.data),
  snapshots: (id: string) => api.get<PaperSnapshot[]>(`/api/papers/${id}/snapshots`).then(r => r.data),
  snapshotFiles: (sid: string) =>
    api.get<{ files: { name: string; size: number; compressed: number }[]; total: number }>(
      `/api/papers/snapshots/${sid}/files`).then(r => r.data),
  snapshotFile: (sid: string, path: string) =>
    api.get<{ content: string | null; binary: boolean; size: number }>(
      `/api/papers/snapshots/${sid}/file`, { params: { path } }).then(r => r.data),
  snapshotDownloadUrl: (sid: string) => {
    const token = localStorage.getItem('life-os-token') || '';
    return `${api.defaults.baseURL}/api/papers/snapshots/${sid}/download`;
  },
};

// Meetings
export const Meetings = {
  list: (space_id?: string) => api.get<Meeting[]>('/api/meetings', { params: { space_id } }).then(r => r.data),
  create: (data: Partial<Meeting>) => api.post<Meeting>('/api/meetings', data).then(r => r.data),
  update: (id: string, data: Partial<Meeting>) => api.put<Meeting>(`/api/meetings/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/api/meetings/${id}`).then(r => r.data),
  testReminder: (id: string) => api.post(`/api/meetings/${id}/test-reminder`).then(r => r.data),
};

// Tags
export const Tags = {
  list: () => api.get<Tag[]>('/api/tags').then(r => r.data),
  create: (data: Partial<Tag>) => api.post<Tag>('/api/tags', data).then(r => r.data),
  delete: (id: string) => api.delete(`/api/tags/${id}`).then(r => r.data),
};

// Journals
export const Journals = {
  list: (params?: { field?: string; search?: string }) =>
    api.get('/api/journals', { params }).then(r => r.data),
};

// Notifications
export const Notifications = {
  list: (unread = false) => api.get<Notification[]>('/api/notifications', { params: { unread } }).then(r => r.data),
  read: (id: string) => api.post(`/api/notifications/${id}/read`).then(r => r.data),
  readAll: () => api.post('/api/notifications/read-all').then(r => r.data),
};

// Stats
export const Stats = {
  overview: () => api.get('/api/stats/overview').then(r => r.data),
  heatmap: (days = 90) => api.get('/api/stats/heatmap', { params: { days } }).then(r => r.data),
  trend: (days = 14) => api.get('/api/stats/trend', { params: { days } }).then(r => r.data),
  capacity: () => api.get('/api/stats/capacity').then(r => r.data),
};

// AI
export const AI = {
  parse: (text: string, auto_create = true) =>
    api.post<{ parsed: AIParsed; task?: Task }>('/api/ai/parse', { text, auto_create }).then(r => r.data),
  breakdown: (goal: string, deadline?: string) =>
    api.post('/api/ai/breakdown', { goal, deadline }).then(r => r.data),
  dayPlan: (available_hours: number) =>
    api.post('/api/ai/day-plan', { available_hours }).then(r => r.data),
  suggestions: () => api.get('/api/ai/suggestions').then(r => r.data),
};

export default api;
