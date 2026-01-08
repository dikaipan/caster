import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'; // Backend API

// Remove trailing slash from API_URL to avoid double slashes
const cleanApiUrl = API_URL.replace(/\/+$/, '');

// Debug: Log API URL in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('🔧 API Configuration:', {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    API_URL,
    cleanApiUrl,
    baseURL: `${cleanApiUrl}/api/v1`,
  });
}

export const api = axios.create({
  baseURL: `${cleanApiUrl}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send cookies with every request
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle auth errors and auto-refresh token
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Refresh token is now in HttpOnly cookie, so we just call the endpoint
        // No body needed (except empty object if required by strict api, but cookie is key)
        const response = await axios.post(
          `${API_URL}/api/v1/auth/refresh`,
          {},
          {
            headers: { 'Content-Type': 'application/json' },
            withCredentials: true
          }
        );

        const { access_token } = response.data;
        localStorage.setItem('token', access_token);

        // Update authorization header
        originalRequest.headers.Authorization = `Bearer ${access_token}`;

        // Process queued requests
        processQueue(null, access_token);
        isRefreshing = false;

        // Retry original request
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed - logout
        processQueue(refreshError, null);
        isRefreshing = false;

        if (typeof window !== 'undefined') {
          // Clear remaining local storage
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);


// 2FA Endpoints
export const authApi = {
  setup2FA: async () => {
    const response = await api.post('/auth/2fa/setup');
    return response.data;
  },
  verifySetup: async (code: string) => {
    const response = await api.post('/auth/2fa/verify-setup', { code });
    return response.data;
  },
  disable2FA: async (code: string) => {
    const response = await api.post('/auth/2fa/disable', { code });
    return response.data;
  },
  verifyLogin2FA: async (tempToken: string, code: string) => {
    const response = await axios.post(`${API_URL}/api/v1/auth/2fa/verify-login`, { tempToken, code });
    return response.data;
  },
  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  }
};

export default api;
