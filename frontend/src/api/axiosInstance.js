import axios from 'axios';

// Determine API URL based on environment
const getApiUrl = () => {
  const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  return isDevelopment 
    ? 'http://localhost:5000/api'
    : 'https://campuskart-3mzo.onrender.com/api';
};

// Create axios instance with correct URL
const API_URL = getApiUrl();
console.log('🚀 Frontend API URL set to:', API_URL);

const api = axios.create({
  baseURL: API_URL,
});

// Interceptor to ensure URL is correct before each request
api.interceptors.request.use((config) => {
  // Force the baseURL to be correct
  const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const correctUrl = isDevelopment 
    ? 'http://localhost:5000/api'
    : 'https://campuskart-3mzo.onrender.com/api';
  
  config.baseURL = correctUrl;
  
  console.log('📤 Request:', config.method?.toUpperCase(), config.url, '→', correctUrl + config.url);
  
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
