import { create } from 'zustand';
import api from './api';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_color: string;
  created_at: string;
  last_login_at?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  init: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  logout: () => void;
}

const STORAGE_KEY = 'life-os-token';

export const useAuth = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem(STORAGE_KEY),
  loading: true,

  init: async () => {
    const token = localStorage.getItem(STORAGE_KEY);
    if (!token) { set({ loading: false }); return; }
    try {
      const r = await api.get('/api/auth/me');
      set({ user: r.data, token, loading: false });
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      set({ user: null, token: null, loading: false });
    }
  },

  login: async (email, password) => {
    const r = await api.post('/api/auth/login', { email, password });
    localStorage.setItem(STORAGE_KEY, r.data.access_token);
    set({ user: r.data.user, token: r.data.access_token });
  },

  register: async (email, name, password) => {
    const r = await api.post('/api/auth/register', { email, name, password });
    localStorage.setItem(STORAGE_KEY, r.data.access_token);
    set({ user: r.data.user, token: r.data.access_token });
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ user: null, token: null });
  },
}));

// axios 拦截器：自动附 Bearer token，401 时强制登出
api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem(STORAGE_KEY);
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem(STORAGE_KEY);
      useAuth.setState({ user: null, token: null });
    }
    return Promise.reject(err);
  }
);
