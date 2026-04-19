import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

// Flag to track if we've initialized
let initialized = false;

// Initialize on first request if not already done
const ensureInitialized = () => {
  if (!initialized) {
    // Check if window has the API URL set by config.js
    if (!window.__VITE_API_URL__) {
      // If not set, initialize it here
      const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      window.__VITE_API_URL__ = isDevelopment 
        ? 'http://localhost:5000/api'
        : 'https://campuskart-3mzo.onrender.com/api';
      console.log('⚙️ Initialized API URL:', window.__VITE_API_URL__);
    }
    initialized = true;
  }
};

// Interceptor to dynamically set the correct API URL at request time
api.interceptors.request.use((config) => {
  // Ensure we have the API URL
  ensureInitialized();
  
  const runtimeApiUrl = window.__VITE_API_URL__;
  if (runtimeApiUrl) {
    config.baseURL = runtimeApiUrl;
    console.log('🔗 Request to:', runtimeApiUrl);
  }
  
  // Attach the access token
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
        const runtimeApiUrl = window.__VITE_API_URL__ || 'http://localhost:5000/api';
        const { data } = await axios.post(`${runtimeApiUrl}/auth/refresh-token`, { refreshToken });

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
