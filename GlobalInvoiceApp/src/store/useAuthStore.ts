import { create } from 'zustand';

interface User {
  id: number;
  name: string;
  role: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  activeCompanyId: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  setActiveCompanyId: (id: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('adrinix_token'),
  user: localStorage.getItem('adrinix_user') ? JSON.parse(localStorage.getItem('adrinix_user') as string) : null,
  activeCompanyId: localStorage.getItem('adrinix_company_id'),
  login: (token, user) => {
    localStorage.setItem('adrinix_token', token);
    localStorage.setItem('adrinix_user', JSON.stringify(user));
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem('adrinix_token');
    localStorage.removeItem('adrinix_user');
    localStorage.removeItem('adrinix_company_id');
    set({ token: null, user: null, activeCompanyId: null });
    window.location.href = '/login';
  },
  setActiveCompanyId: (id) => {
    if (id) localStorage.setItem('adrinix_company_id', id);
    else localStorage.removeItem('adrinix_company_id');
    set({ activeCompanyId: id });
  }
}));

export const authFetch = async (url: string, options: RequestInit = {}) => {
  const { token, activeCompanyId } = useAuthStore.getState();
  const headers = { ...options.headers } as Record<string, string>;

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (activeCompanyId) {
    headers['X-Company-Id'] = activeCompanyId;
  }

  options.headers = headers;
  
  const response = await fetch(url, options);
  if (response.status === 401) {
    useAuthStore.getState().logout();
  }
  return response;
};
