import { create } from 'zustand';
import api from '@/lib/api';

interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: string;
  userType: 'HITACHI' | 'PENGELOLA';
  pengelolaId?: string;
  department?: string;
  phone?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => void;
  refreshAccessToken: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (username: string, password: string) => {
    try {
      // Debug: Log the request URL
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const loginUrl = `${apiUrl}/api/auth/login`;
      console.log('🔐 Attempting login to:', loginUrl);
      
      const response = await api.post('/auth/login', { username, password });
      const { access_token, refresh_token, user } = response.data;

      // Security: Store tokens securely
      localStorage.setItem('token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      localStorage.setItem('user', JSON.stringify(user));

      set({
        user,
        token: access_token,
        refreshToken: refresh_token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      console.error('Login error:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        fullURL: error.config?.baseURL ? `${error.config.baseURL}${error.config.url}` : 'unknown',
      });
      throw error;
    }
  },

  logout: async () => {
    const { refreshToken } = get();
    
    // Security: Revoke refresh token on logout
    if (refreshToken) {
      try {
        await api.post('/auth/logout', { refresh_token: refreshToken });
      } catch (error) {
        console.error('Error revoking refresh token:', error);
        // Continue with logout even if revoke fails
      }
    }

    // Clear all auth data
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    
    set({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  },

  refreshAccessToken: async (): Promise<boolean> => {
    const { refreshToken } = get();
    
    if (!refreshToken) {
      return false;
    }

    try {
      const response = await api.post('/auth/refresh', {
        refresh_token: refreshToken,
      });

      const { access_token } = response.data;
      
      // Update token in storage and state
      localStorage.setItem('token', access_token);
      set({ token: access_token });
      
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      
      // Refresh failed - clear everything and logout
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      
      set({
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
      });
      
      return false;
    }
  },

  loadUser: () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      const refreshToken = localStorage.getItem('refresh_token');
      const userStr = localStorage.getItem('user');

      if (token && refreshToken && userStr) {
        try {
          const user = JSON.parse(userStr);
          set({
            user,
            token,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          console.error('Error loading user:', error);
          set({ isLoading: false });
        }
      } else {
        set({ isLoading: false });
      }
    }
  },
}));

