import { create } from 'zustand';
import type { Space, Area, Project, Collaborator, Task, ViewName } from './types';
import { Spaces, Areas, Projects, Collaborators, Tasks } from './api';

interface AppState {
  // 数据
  spaces: Space[];
  areas: Area[];
  projects: Project[];
  collaborators: Collaborator[];
  tasks: Task[];

  // UI 状态
  selectedSpaceId: string | 'all';
  selectedProjectId: string | null;
  selectedCollaboratorId: string | null;
  currentView: ViewName;
  selectedTaskId: string | null;
  rightPanelOpen: boolean;
  quickCaptureOpen: boolean;
  commandPaletteOpen: boolean;
  notificationPanelOpen: boolean;
  helpPanelOpen: boolean;
  sidebarCollapsed: boolean;
  darkMode: boolean;

  // Actions
  loadAll: () => Promise<void>;
  loadTasks: () => Promise<void>;
  setSelectedSpace: (id: string | 'all') => void;
  setSelectedProject: (id: string | null) => void;
  setSelectedCollaborator: (id: string | null) => void;
  setCurrentView: (v: ViewName) => void;
  openTaskDetail: (id: string | null) => void;
  toggleQuickCapture: () => void;
  toggleCommandPalette: () => void;
  toggleNotificationPanel: () => void;
  toggleHelpPanel: () => void;
  toggleSidebar: () => void;
  toggleDarkMode: () => void;

  // 任务操作
  createTask: (data: Partial<Task>) => Promise<Task>;
  updateTask: (id: string, data: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  completeTask: (id: string) => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  spaces: [],
  areas: [],
  projects: [],
  collaborators: [],
  tasks: [],

  selectedSpaceId: 'all',
  selectedProjectId: null,
  selectedCollaboratorId: null,
  currentView: 'kanban',
  selectedTaskId: null,
  rightPanelOpen: false,
  quickCaptureOpen: false,
  commandPaletteOpen: false,
  notificationPanelOpen: false,
  helpPanelOpen: false,
  sidebarCollapsed: false,
  darkMode: typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches,

  loadAll: async () => {
    const [spaces, areas, projects, collaborators, tasks] = await Promise.all([
      Spaces.list(),
      Areas.list(),
      Projects.list(),
      Collaborators.list(),
      Tasks.list(),
    ]);
    set({ spaces, areas, projects, collaborators, tasks });
  },

  loadTasks: async () => {
    const tasks = await Tasks.list();
    set({ tasks });
  },

  setSelectedSpace: (id) => set({ selectedSpaceId: id, selectedProjectId: null }),
  setSelectedProject: (id) => set({ selectedProjectId: id }),
  setSelectedCollaborator: (id) => set({ selectedCollaboratorId: id }),
  setCurrentView: (v) => set({ currentView: v }),
  openTaskDetail: (id) => set({ selectedTaskId: id, rightPanelOpen: !!id }),
  toggleQuickCapture: () => set((s) => ({ quickCaptureOpen: !s.quickCaptureOpen })),
  toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
  toggleNotificationPanel: () => set((s) => ({ notificationPanelOpen: !s.notificationPanelOpen })),
  toggleHelpPanel: () => set((s) => ({ helpPanelOpen: !s.helpPanelOpen })),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  toggleDarkMode: () => {
    const next = !get().darkMode;
    set({ darkMode: next });
    document.documentElement.classList.toggle('dark', next);
  },

  createTask: async (data) => {
    const t = await Tasks.create(data);
    set((s) => ({ tasks: [t, ...s.tasks] }));
    return t;
  },
  updateTask: async (id, data) => {
    const t = await Tasks.update(id, data);
    set((s) => ({ tasks: s.tasks.map((x) => (x.id === id ? t : x)) }));
  },
  deleteTask: async (id) => {
    await Tasks.delete(id);
    set((s) => ({ tasks: s.tasks.filter((x) => x.id !== id) }));
  },
  completeTask: async (id) => {
    const t = await Tasks.complete(id);
    set((s) => ({ tasks: s.tasks.map((x) => (x.id === id ? t : x)) }));
  },
}));
