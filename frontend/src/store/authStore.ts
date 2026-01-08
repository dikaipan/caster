import { create } from 'zustand';
import api, { authApi } from '@/lib/api';

interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: string;
  userType: 'HITACHI' | 'PENGELOLA' | 'BANK';
  pengelolaId?: string;
  customerBankId?: string;
  department?: string;
  phone?: string;
  twoFactorEnabled?: boolean;
  twoFactorBackupCodes?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  loadUser: () => void;
  refreshAccessToken: () => Promise<boolean>;
  verify2FALogin: (tempToken: string, code: string) => Promise<boolean>;
  updateUser: (user: Partial<User>) => void;
  fetchProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (username: string, password: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const loginUrl = `${apiUrl}/api/v1/auth/login`;

      const response = await api.post('/auth/login', { username, password });

      // Check for 2FA requirement
      if (response.data.twoFactorRequired) {
        return response.data; // Return to component to handle 2FA UI
      }

      // Extract access_token from tokens object
      const access_token = response.data.tokens?.access_token || response.data.access_token;
      const user = response.data.user;

      if (!access_token || !user) {
        throw new Error('Invalid login response format');
      }

      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(user));

      set({
        user,
        token: access_token,
        isAuthenticated: true,
        isLoading: false,
      });
      return response.data;

    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    }
  },

  verify2FALogin: async (tempToken: string, code: string) => {
    try {
      const response = await api.post('/auth/2fa/verify-login', { tempToken, code });
      
      // Extract access_token from tokens object
      const access_token = response.data.tokens?.access_token || response.data.access_token;
      const user = response.data.user;

      if (!access_token || !user) {
        throw new Error('Invalid 2FA verification response format');
      }

      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(user));

      set({
        user,
        token: access_token,
        isAuthenticated: true,
        isLoading: false,
      });
      return true;
    } catch (error) {
      console.error('2FA Verification failed', error);
      throw error;
    }
  },

  logout: async () => {
    try {
      // API call clears the cookie
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Error logging out:', error);
    }

    // Clear all auth data
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    set({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  },

  refreshAccessToken: async (): Promise<boolean> => {
    try {
      // Cookie is sent automatically
      const response = await api.post('/auth/refresh');

      const { access_token } = response.data;

      // Update token in storage and state
      localStorage.setItem('token', access_token);
      set({ token: access_token });

      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);

      // Refresh failed - clear everything and logout
      localStorage.removeItem('token');
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
      const userStr = localStorage.getItem('user');

      if (token && userStr) {
        try {
          const user = JSON.parse(userStr);
          set({
            user,
            token,
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

  updateUser: (updatedData: Partial<User>) => {
    const currentUser = get().user;
    if (currentUser) {
      const newUser = { ...currentUser, ...updatedData } as User;
      set({ user: newUser });
      localStorage.setItem('user', JSON.stringify(newUser));
    }
  },

  fetchProfile: async () => {
    try {
      const user = await authApi.getProfile();
      // Ensure we keep the token but update the user
      const currentUser = get().user;
      const updatedUser = { ...currentUser, ...user };

      set({ user: updatedUser });
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (error) {
      console.error('Failed to fetch profile', error);
    }
  },
}));

