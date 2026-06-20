import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';

// Create Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Memory-store for access token
let accessToken = null;
let refreshSubscribers = [];
let isRefreshing = false;

export const setAccessToken = (token) => {
  accessToken = token;
};

export const getAccessToken = () => {
  return accessToken;
};

// Add access token to requests and log requests
api.interceptors.request.use(
  (config) => {
    console.log(`>>> [Frontend API Request] ${config.method.toUpperCase()} ${config.baseURL || ''}${config.url}`, {
      headers: config.headers,
      data: config.data,
    });
    if (accessToken && !config.headers['Authorization']) {
      config.headers['Authorization'] = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    console.error(`!!! [Frontend API Request Error]`, error);
    return Promise.reject(error);
  }
);

// Response interceptor for token refresh on 401 and log responses
api.interceptors.response.use(
  (response) => {
    console.log(`<<< [Frontend API Response] Status: ${response.status} URL: ${response.config.url}`, response.data);
    return response;
  },
  async (error) => {
    if (error.response) {
      console.error(`<<< [Frontend API Response Error] Status: ${error.response.status} URL: ${error.config.url}`, error.response.data);
    } else {
      console.error(`<<< [Frontend API Network/Server Error]`, error.message);
    }
    const originalRequest = error.config;
    
    // Check if error is 401 and we haven't already retried this request
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      // Don't loop on refresh/login endpoints
      if (originalRequest.url.includes('/auth/refresh') || originalRequest.url.includes('/auth/login')) {
        return Promise.reject(error);
      }
      
      if (isRefreshing) {
        // Queue the request until token is refreshed
        return new Promise((resolve) => {
          refreshSubscribers.push((token) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }
      
      originalRequest._retry = true;
      isRefreshing = true;
      
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        isRefreshing = false;
        return Promise.reject(error);
      }
      
      try {
        // Request a new access token
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });
        
        const newAccessToken = response.data.access_token;
        setAccessToken(newAccessToken);
        
        // Retry queued requests
        isRefreshing = false;
        refreshSubscribers.forEach((callback) => callback(newAccessToken));
        refreshSubscribers = [];
        
        // Retry original request
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        refreshSubscribers = [];
        localStorage.removeItem('refresh_token');
        setAccessToken(null);
        // Redirect to login or dispatch custom event to log out
        window.dispatchEvent(new Event('auth-logout'));
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
