/**
 * Runtime Configuration
 * Sets API URL dynamically instead of relying on build-time env vars
 */

// Your actual Render backend URL
const PRODUCTION_API_URL = 'https://campuskart-3mzo.onrender.com/api';

export const initializeConfig = () => {
  // Determine if we're in production or development
  const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  // Get API URL
  const apiUrl = isDevelopment 
    ? 'http://localhost:5000/api'
    : PRODUCTION_API_URL;
  
  // Set it globally - this is what the interceptor will read
  window.__VITE_API_URL__ = apiUrl;
  
  console.log('✅ Config initialized');
  console.log('   Environment:', isDevelopment ? 'DEVELOPMENT' : 'PRODUCTION');
  console.log('   API URL:', apiUrl);
  
  return apiUrl;
};
