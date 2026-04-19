import axios from 'axios';

// Get API URL from multiple sources in order of priority:
// 1. Runtime env var (set by window object)
// 2. Build-time VITE_API_URL
// 3. Fallback to localhost for development
const getApiUrl = () => {
  // Check if window has API URL set at runtime
  if (window.__VITE_API_URL__) {
    return window.__VITE_API_URL__;
  }
  
  // Check build-time env var
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Fallback for development
  return 'http://localhost:5000/api';
};

const API_URL = getApiUrl();
console.log('🔗 API URL:', API_URL); // Debug: show which API URL is being used

// Axios instance with base URL
const api = axios.create({
  baseURL: API_URL,
});

// Attach the access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If a request fails with 401 (token expired), silently refresh and retry
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && error.response?.data?.expired && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const { data } = await axios.post(`${API_URL}/auth/refresh-token`, { refreshToken });

        // Store the new access token
        localStorage.setItem('token', data.accessToken);

        // Retry the original request with the new token
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh token itself is expired — force a full logout
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
