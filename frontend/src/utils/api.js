import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/auth/',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include session cookies
});

export const submitScore = async (gameTitle, score) => {
  try {
    const response = await api.post('submit_score/', { game: gameTitle, score });
    console.log('Score submitted:', response.data);
    return response.data;
  } catch (error) {
    console.error('Score submission failed:', error.response?.data || error.message);
    throw error;
  }
};