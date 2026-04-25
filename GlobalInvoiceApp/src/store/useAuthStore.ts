import { create } from 'zustand';

interface User {
  id: number;
  name: string;
  role: string;
  company_id?: number;
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  activeCompanyId: string | null;
  login: (token: string, refreshToken: string, user: User) => void;
  logout: () => void;
  setActiveCompanyId: (id: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('adrinix_token'),
  refreshToken: localStorage.getItem('adrinix_refresh_token'),
  user: localStorage.getItem('adrinix_user') ? JSON.parse(localStorage.getItem('adrinix_user') as string) : null,
  activeCompanyId: localStorage.getItem('adrinix_company_id'),
  login: (token, refreshToken, user) => {
    localStorage.setItem('adrinix_token', token);
    localStorage.setItem('adrinix_refresh_token', refreshToken);
    localStorage.setItem('adrinix_user', JSON.stringify(user));
    
    // Auto-set company if provided (for team members)
    if (user.company_id) {
      localStorage.setItem('adrinix_company_id', user.company_id.toString());
    }

    set({ 
      token, 
      refreshToken, 
      user, 
      activeCompanyId: user.company_id ? user.company_id.toString() : localStorage.getItem('adrinix_company_id')
    });
  },
  logout: () => {
    localStorage.removeItem('adrinix_token');
    localStorage.removeItem('adrinix_refresh_token'); // Added
    localStorage.removeItem('adrinix_user');
    localStorage.removeItem('adrinix_company_id');
    set({ token: null, refreshToken: null, user: null, activeCompanyId: null });
    window.location.href = '/login';
  },
  setActiveCompanyId: (id) => {
    if (id) localStorage.setItem('adrinix_company_id', id);
    else localStorage.removeItem('adrinix_company_id');
    set({ activeCompanyId: id });
  }
}));

let isRefreshing = false;

export const authFetch = async (url: string, options: RequestInit = {}) => {
  const { token, refreshToken, activeCompanyId } = useAuthStore.getState();
  const headers = { ...options.headers } as Record<string, string>;

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (activeCompanyId) {
    headers['X-Company-Id'] = activeCompanyId;
  }

  options.headers = headers;
  
  const response = await fetch(url, options);

  // If 401 and we have a refresh token, try to refresh
  if (response.status === 401 && refreshToken && !isRefreshing) {
    isRefreshing = true;
    try {
      const refreshRes = await fetch(`${import.meta.env.VITE_API_BASE}/auth.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'refresh', refreshToken })
      });

      const data = await refreshRes.json();
      if (data.status === 'success') {
        const newToken = data.token;
        localStorage.setItem('adrinix_token', newToken);
        useAuthStore.setState({ token: newToken });
        isRefreshing = false;
        
        // Retry original request with new token
        headers['Authorization'] = `Bearer ${newToken}`;
        return fetch(url, { ...options, headers });
      }
    } catch (e) {
      console.error("Silent refresh failed", e);
    } finally {
      isRefreshing = false;
    }

    // If refresh failed or was already in progress, logout
    useAuthStore.getState().logout();
  } else if (response.status === 401) {
    useAuthStore.getState().logout();
  }

  return response;
};
