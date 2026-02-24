import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData)
};

// Stock API
export const stockAPI = {
  getQuote: (symbol) => api.get(`/stocks/quote/${symbol}`),
  getHistorical: (symbol, days = 90) => api.get(`/stocks/historical/${symbol}?days=${days}`),
  getAnalysis: (symbol) => api.get(`/stocks/analysis/${symbol}`),
  scan: (symbols) => api.post('/stocks/scan', { symbols })
};

// Portfolio API
export const portfolioAPI = {
  getPortfolio: () => api.get('/portfolio'),
  addHolding: (data) => api.post('/portfolio/holding', data),
  deleteHolding: (symbol) => api.delete(`/portfolio/holding/${symbol}`),
  getTransactions: (page = 1, limit = 50) => api.get(`/portfolio/transactions?page=${page}&limit=${limit}`)
};

export default api;