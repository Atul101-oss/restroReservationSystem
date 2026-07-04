import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

// Attach JWT token to every request if available
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses globally (token expired / invalid)
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Redirect to login if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth ──
export const registerUser = (data) => API.post('/auth/register', data);
export const loginUser = (data) => API.post('/auth/login', data);
export const getMe = () => API.get('/auth/me');

// ── Tables ──
export const getTables = () => API.get('/tables');
export const getAvailableTables = (date, timeSlot, guests, isShared) =>
  API.get('/tables/available', { params: { date, timeSlot, guests, isShared } });
export const createTable = (data) => API.post('/tables', data);
export const updateTable = (id, data) => API.put(`/tables/${id}`, data);
export const deleteTable = (id) => API.delete(`/tables/${id}`);

// ── Reservations ──
export const createReservation = (data) => API.post('/reservations', data);
export const getMyReservations = () => API.get('/reservations/my');
export const cancelMyReservation = (id) =>
  API.put(`/reservations/${id}/cancel`);
export const getAllReservations = (params) =>
  API.get('/reservations', { params });
export const updateReservation = (id, data) =>
  API.put(`/reservations/${id}`, data);
export const deleteReservation = (id) => API.delete(`/reservations/${id}`);

export default API;
