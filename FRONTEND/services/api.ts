import axios, { AxiosError } from 'axios';

const TOKEN_KEY   = 'token';
const USER_KEY    = 'currentUser';
const API_TIMEOUT = 10000;

// ─── URL base da API ─────────────────────────────────────────────────────────
// Dev local (npm run dev):   NEXT_PUBLIC_API_URL=http://localhost:3002  →  http://localhost:3002/api
// Docker produção (nginx):   NEXT_PUBLIC_API_URL não definido           →  /api  (relativo ao host)
//
// Com URL relativa, o browser usa o mesmo host/porta da página — funciona
// independente do IP ou domínio em que o sistema estiver hospedado.

const configuredUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');

const BASE_URL = configuredUrl
  ? `${configuredUrl}/api`   // dev: aponta direto pro backend
  : '/api';                  // produção: relativo ao nginx

export const API_URL = BASE_URL;

// ─── Helpers de storage ───────────────────────────────────────────────────────

const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
};

const getStoredUser = () => {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
};

const persistSession = (token: string, user?: unknown) => {
  localStorage.setItem(TOKEN_KEY, token);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
};

const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

// ─── Axios instance ───────────────────────────────────────────────────────────

const api = axios.create({ baseURL: BASE_URL, timeout: API_TIMEOUT });

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const normalizeError = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED')
      return new Error('A API demorou para responder. Verifique se o backend está rodando.');
    if (error.message === 'Network Error' || !error.response)
      return new Error(`Não foi possível conectar à API em ${BASE_URL}. Verifique se o backend está rodando.`);
    const msg = error.response?.data?.error ?? error.response?.data?.message ?? error.message;
    return new Error(msg || 'Erro ao comunicar com a API.');
  }
  if (error instanceof Error) return error;
  return new Error('Erro inesperado.');
};

api.interceptors.response.use(
  (r) => r,
  (error: AxiosError) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      clearSession();
      // Redireciona para login apenas no browser e se não estiver já na página de login
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(normalizeError(error));
  }
);

// ─── Serviços ─────────────────────────────────────────────────────────────────

export const authService = {
  login: async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    if (data.token) persistSession(data.token, data.user);
    return data;
  },
  register: async (name: string, email: string, password: string) => {
    const { data } = await api.post('/auth/register', { name, email, password });
    if (data.token) persistSession(data.token, data.user);
    return data;
  },
  logout: () => clearSession(),
  getCurrentUser: () => getStoredUser(),
  getToken,
};

export const clientService = {
  getAll:  async ()                      => (await api.get('/clients')).data,
  create:  async (data: unknown)         => (await api.post('/clients', data)).data,
  update:  async (id: string, data: unknown) => (await api.put(`/clients/${id}`, data)).data,
  delete:  async (id: string)            => (await api.delete(`/clients/${id}`)).data,
};

export const quoteService = {
  getAll:           async ()                            => (await api.get('/quotes')).data,
  getById:          async (id: string)                  => (await api.get(`/quotes/${id}`)).data,
  create:           async (data: unknown)               => (await api.post('/quotes', data)).data,
  update:           async (id: string, data: unknown)   => (await api.put(`/quotes/${id}`, data)).data,
  delete:           async (id: string)                  => (await api.delete(`/quotes/${id}`)).data,
  convertToProject: async (id: string, data: unknown)   => (await api.post(`/quotes/${id}/convert-to-project`, data)).data,
  generatePDF:      async (id: string)                  => api.get(`/quotes/${id}/pdf`, { responseType: 'blob' }),
};

export const invoiceService = {
  getAll:      async ()                            => (await api.get('/invoices')).data,
  getById:     async (id: string)                  => (await api.get(`/invoices/${id}`)).data,
  create:      async (data: unknown)               => (await api.post('/invoices', data)).data,
  update:      async (id: string, data: unknown)   => (await api.put(`/invoices/${id}`, data)).data,
  delete:      async (id: string)                  => (await api.delete(`/invoices/${id}`)).data,
  markAsPaid:  async (id: string, amountPaid?: number) => (await api.patch(`/invoices/${id}/pay`, { amountPaid })).data,
};

export const projectService = {
  getAll:          async ()                                          => (await api.get('/projects')).data,
  getById:         async (id: string)                               => (await api.get(`/projects/${id}`)).data,
  create:          async (data: unknown)                            => (await api.post('/projects', data)).data,
  update:          async (id: string, data: unknown)                => (await api.put(`/projects/${id}`, data)).data,
  delete:          async (id: string)                               => (await api.delete(`/projects/${id}`)).data,
  updateTask:      async (projectId: string, taskId: string, isCompleted: boolean) => (await api.patch(`/projects/${projectId}/tasks/${taskId}`, { isCompleted })).data,
  updateProgress:  async (id: string, progress: number)            => (await api.patch(`/projects/${id}/progress`, { progress })).data,
  getExpenses:     async (id: string)                               => (await api.get(`/projects/${id}/expenses`)).data,
  createExpense:   async (id: string, data: unknown)               => (await api.post(`/projects/${id}/expenses`, data)).data,
  updateExpense:   async (id: string, expenseId: string, data: unknown) => (await api.put(`/projects/${id}/expenses/${expenseId}`, data)).data,
  deleteExpense:   async (id: string, expenseId: string)           => (await api.delete(`/projects/${id}/expenses/${expenseId}`)).data,
  getNotes:        async (id: string)                               => (await api.get(`/projects/${id}/notes`)).data,
  createNote:      async (id: string, data: unknown)               => (await api.post(`/projects/${id}/notes`, data)).data,
  updateNote:      async (id: string, noteId: string, data: unknown) => (await api.put(`/projects/${id}/notes/${noteId}`, data)).data,
  deleteNote:      async (id: string, noteId: string)              => (await api.delete(`/projects/${id}/notes/${noteId}`)).data,
  getReport:       async (id: string)                               => (await api.get(`/projects/${id}/report`)).data,
  getFinancialSummary: async (id: string) => {
    const { data } = await api.get(`/projects/${id}/report`);
    return data?.statistics ?? data;
  },
};

export const expenseService = {
  getAll:              async ()                          => (await api.get('/expenses')).data,
  getById:             async (id: string)               => (await api.get(`/expenses/${id}`)).data,
  create:              async (data: unknown)            => (await api.post('/expenses', data)).data,
  update:              async (id: string, data: unknown) => (await api.put(`/expenses/${id}`, data)).data,
  delete:              async (id: string)               => (await api.delete(`/expenses/${id}`)).data,
  getByCategoryReport: async (params?: Record<string, string>) => (await api.get('/expenses/reports/by-category', { params })).data,
};

export const stockService = {
  getCategories:     async ()                            => (await api.get('/stock/categories')).data,
  createCategory:    async (data: unknown)              => (await api.post('/stock/categories', data)).data,
  updateCategory:    async (id: string, data: unknown)  => (await api.put(`/stock/categories/${id}`, data)).data,
  deleteCategory:    async (id: string)                 => (await api.delete(`/stock/categories/${id}`)).data,
  getItems:          async (params?: Record<string, unknown>) => (await api.get('/stock/items', { params })).data,
  getItemById:       async (id: string)                 => (await api.get(`/stock/items/${id}`)).data,
  createItem:        async (data: unknown)              => (await api.post('/stock/items', data)).data,
  updateItem:        async (id: string, data: unknown)  => (await api.put(`/stock/items/${id}`, data)).data,
  deleteItem:        async (id: string)                 => (await api.delete(`/stock/items/${id}`)).data,
  getMovements:      async (params?: Record<string, unknown>) => (await api.get('/stock/movements', { params })).data,
  createMovement:    async (data: unknown)              => (await api.post('/stock/movements', data)).data,
  getStockReport:    async ()                           => (await api.get('/stock/reports/stock')).data,
  getMovementsReport: async (params?: Record<string, unknown>) => (await api.get('/stock/reports/movements', { params })).data,
};

export const settingsService = {
  getSettings:    async ()               => (await api.get('/settings')).data,
  updateSettings: async (data: unknown)  => (await api.put('/settings', data)).data,
};

export const workOrderService = {
  getAll:  async ()                          => (await api.get('/work-orders')).data,
  create:  async (data: unknown)             => (await api.post('/work-orders', data)).data,
  update:  async (id: string, data: unknown) => (await api.put(`/work-orders/${id}`, data)).data,
  delete:  async (id: string)               => (await api.delete(`/work-orders/${id}`)).data,
};

export default api;
