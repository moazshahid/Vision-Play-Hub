// frontend/src/utils/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/',
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
  withCredentials: true, // Send cookies with requests
});

// Helper to get cookie by name
const getCookie = (name) => {
  console.log('Current cookies:', document.cookie); // Debug full cookie string
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
};

api.interceptors.request.use(async (config) => {
  let token = localStorage.getItem('access_token');
  if (!token) {
    token = getCookie('access_token');
    if (token) {
      console.log('Using cookie access_token:', token);
      localStorage.setItem('access_token', token); // Sync with App.js
    } else {
      console.log('No access_token found in cookies');
      // Attempt to refresh token if refresh_token exists
      const refreshToken = getCookie('refresh_token');
      if (refreshToken) {
        try {
          console.log('Attempting to refresh token');
          const response = await api.post('api/token/refresh/', { refresh: refreshToken });
          token = response.data.access;
          localStorage.setItem('access_token', token);
          console.log('Token refreshed:', token);
        } catch (error) {
          console.error('Token refresh failed:', error.response?.data || error.message);
        }
      }
    }
  }
  console.log('Request token:', token);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Add CSRF token for POST requests
  if (['post', 'put', 'patch', 'delete'].includes(config.method.toLowerCase())) {
    const csrfToken = getCookie('csrftoken');
    if (csrfToken) {
      console.log('Using CSRF token:', csrfToken);
      config.headers['X-CSRFToken'] = csrfToken;
    } else {
      console.warn('No CSRF token found in cookies');
    }
  }

  return config;
});

export const login = async (username, password) => {
  try {
    const response = await api.post('api/token/', { username, password });
    console.log('Login response:', response.data);
    localStorage.setItem('access_token', response.data.access);
    localStorage.setItem('refresh_token', response.data.refresh);
    return response.data;
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    throw error;
  }
};

export const submitScore = async (gameTitle, score) => {
  try {
    const response = await api.post('auth/api/submit-score/', { game: gameTitle, score });
    console.log('Score submitted:', response.data);
    return response.data;
  } catch (error) {
    console.error('Score submission failed:', error.response?.data || error.message);
    throw error;
  }
};