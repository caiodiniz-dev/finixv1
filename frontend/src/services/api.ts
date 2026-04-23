import axios from 'axios';

const BACKEND = process.env.REACT_APP_BACKEND_URL;

export const api = axios.create({
  baseURL: `${BACKEND}/api`,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config: any) => {
  const token = localStorage.getItem('finix_token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem('finix_token');
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register') && window.location.pathname !== '/') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export function apiErrorMessage(e: any): string {
  const d = e?.response?.data?.detail;
  if (typeof d === 'string') return d;
  if (Array.isArray(d)) return d.map((x: any) => x?.msg || JSON.stringify(x)).join(' ');
  if (d?.msg) return d.msg;
  return e?.message || 'Algo deu errado';
}
