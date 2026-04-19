import axios from 'axios';

// Create axios instance with temporary URL (will be overridden by interceptor)
const api = axios.create({
  baseURL: 'http://localhost:5000/api', // Temporary - interceptor will override
});

// Interceptor to dynamically set the correct API URL at request time
api.interceptors.request.use((config) => {
  // Get the runtime API URL that was set by config.js
  const runtimeApiUrl = window.__VITE_API_URL__ || 'http://localhost:5000/api';
  
  // Override the baseURL for each request
  config.baseURL = runtimeApiUrl;
  
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
