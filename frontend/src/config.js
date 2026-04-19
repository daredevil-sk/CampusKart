/**
 * Runtime Configuration
 * Sets API URL dynamically instead of relying on build-time env vars
 * This works around Vite's limitations with environment variables on Vercel
 */

// Your Render backend URL - UPDATE THIS with your actual backend URL
const PRODUCTION_API_URL = 'https://campuskart-pink.onrender.com/api';

export const initializeConfig = () => {
  // Get API URL from various sources
  const apiUrl = 
    // 1. Check URL parameter (for testing)
    new URLSearchParams(window.location.search).get('apiUrl') ||
    // 2. Check if already set (shouldn't happen, but just in case)
    window.__VITE_API_URL__ ||
    // 3. For production on Vercel, use the production API URL
    (window.location.hostname !== 'localhost' 
      ? PRODUCTION_API_URL
      : `http://localhost:5000/api`);
  
  // Set it globally
  window.__VITE_API_URL__ = apiUrl;
  
  console.log('✅ Config initialized - API URL:', apiUrl);
  
  return apiUrl;
};
