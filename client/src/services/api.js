import axios from 'axios';

// Retrieve saved server URL or default to current window hostname or localhost:5000
export const getServerUrl = () => {
  return localStorage.getItem('SERVER_URL') || 'http://localhost:5000';
};

export const setServerUrl = (url) => {
  let formatted = url.trim();
  if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
    formatted = `http://${formatted}`;
  }
  // Strip trailing slash
  formatted = formatted.replace(/\/$/, '');
  localStorage.setItem('SERVER_URL', formatted);
  api.defaults.baseURL = formatted;
  return formatted;
};

const api = axios.create({
  baseURL: getServerUrl(),
  timeout: 60000
});

// Request Interceptor: Attach JWT Token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('AUTH_TOKEN');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Response Interceptor: Handle 401 Unauthorized Session Expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('AUTH_TOKEN');
      localStorage.removeItem('USER_DATA');
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default api;
