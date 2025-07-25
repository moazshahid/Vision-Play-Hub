import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/',
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
  withCredentials: true,
});

const getCookie = (name) => {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return match ? match[1] : null;
};

async function getCsrfToken() {
  try {
    const response = await axios.get('http://localhost:8000/csrf/', { withCredentials: true });
    const csrfToken = getCookie('csrftoken');
    console.log('CSRF token fetched:', csrfToken);
    if (csrfToken) localStorage.setItem('csrftoken', csrfToken);
    return csrfToken;
  } catch (error) {
    console.error('CSRF fetch error:', error.message);
    return null;
  }
}

api.interceptors.request.use(async (config) => {
  let token = localStorage.getItem('access_token');
  console.log('Access token from localStorage:', token ? token.substring(0, 10) + '...' : 'null');

  if (!token) {
    token = getCookie('access_token');
    if (token) {
      console.log('Using cookie access_token:', token.substring(0, 10) + '...');
      localStorage.setItem('access_token', token);
    }
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (['post', 'put', 'patch', 'delete'].includes(config.method.toLowerCase())) {
    let csrfToken = localStorage.getItem('csrftoken') || getCookie('csrftoken');
    console.log('CSRF token in request:', csrfToken || 'null');
    if (!csrfToken) {
      csrfToken = await getCsrfToken();
    }
    if (csrfToken) {
      console.log('Using CSRF token:', csrfToken);
      config.headers['X-CSRFToken'] = csrfToken;
    } else {
      console.warn('No CSRF token available');
    }
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      error.response?.data?.code === 'token_not_valid' &&
      error.response?.data?.messages?.[0]?.message === 'Token is expired' &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      let refreshToken = localStorage.getItem('refresh_token') || getCookie('refresh_token');
      console.log('Refresh token:', refreshToken ? refreshToken.substring(0, 10) + '...' : 'null');
      if (refreshToken) {
        console.log('Attempting to refresh token');
        let csrfToken = localStorage.getItem('csrftoken') || getCookie('csrftoken');
        if (!csrfToken) {
          csrfToken = await getCsrfToken();
        }
        try {
          const response = await axios.post('http://localhost:8000/api/token/refresh/', { refresh: refreshToken }, {
            headers: { 'X-CSRFToken': csrfToken },
            withCredentials: true,
          });
          const newAccessToken = response.data.access;
          console.log('Token refreshed successfully:', newAccessToken.substring(0, 10) + '...');
          localStorage.setItem('access_token', newAccessToken);
          document.cookie = `access_token=${newAccessToken};max-age=3600;path=/;samesite=Lax`;
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError.response?.data || refreshError.message);
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('csrftoken');
          document.cookie = 'access_token=;expires=Thu, 01 Jan 1970;path=/';
          document.cookie = 'refresh_token=;expires=Thu, 01 Jan 1970;path=/';
          document.cookie = 'csrftoken=;expires=Thu, 01 Jan 1970;path=/';
          console.log('Redirecting to login due to refresh failure');
          window.location.href = 'http://localhost:8000/auth/login/';
          return Promise.reject(refreshError);
        }
      } else {
        console.warn('No refresh token available, redirecting to login');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('csrftoken');
        document.cookie = 'access_token=;expires=Thu, 01 Jan 1970;path=/';
        document.cookie = 'refresh_token=;expires=Thu, 01 Jan 1970;path=/';
        document.cookie = 'csrftoken=;expires=Thu, 01 Jan 1970;path=/';
        window.location.href = 'http://localhost:8000/auth/login/';
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export const login = async (username, password) => {
  try {
    const response = await api.post('api/token/', { username, password });
    console.log('Login response:', response.data);
    const { access, refresh } = response.data;
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    localStorage.setItem('csrftoken', getCookie('csrftoken'));
    document.cookie = `access_token=${access};max-age=3600;path=/;samesite=Lax`;
    document.cookie = `refresh_token=${refresh};max-age=86400;path=/;samesite=Lax`;
    console.log('Tokens stored: access_token=', access.substring(0, 10) + '...', 'refresh_token=', refresh.substring(0, 10) + '...');
    return response.data;
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    throw error;
  }
};

export const submitScore = async (gameTitle, score) => {
  try {
    console.log('Submitting score:', { game: gameTitle, score });
    const response = await api.post('auth/api/submit-score/', { game: gameTitle, score });
    console.log('Score submitted:', response.data);
    return response.data;
  } catch (error) {
    console.error('Submit score failed:', error.response?.data || error.message);
    throw error;
  }
};

export default api;