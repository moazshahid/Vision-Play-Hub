import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add interceptor to include JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const login = async (username, password) => {
  try {
    const response = await api.post('api/token/', { username, password });
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