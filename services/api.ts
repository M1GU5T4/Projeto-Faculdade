import axios, { AxiosError } from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'token';
const USER_KEY = 'currentUser';
const DEFAULT_API_PORT = '3002';
const rawConfiguredApiUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
const expoHost = Constants.executionEnvironment !== 'standalone'
  ? (Constants.expoConfig?.hostUri ?? Constants.platform?.hostUri ?? Constants.linkingUri)
  : null;
const resolvedExpoHost = expoHost
  ? expoHost.replace(/^[a-z]+:\/\//i, '').split('/')[0].split(':')[0]
  : null;
const shouldReplaceLocalhost = !rawConfiguredApiUrl || /(^|\/\/)(localhost|127\.0\.0\.1)(:\d+)?($|\/)/.test(rawConfiguredApiUrl);
const rawApiUrl = shouldReplaceLocalhost && resolvedExpoHost
  ? `http://${resolvedExpoHost}:${DEFAULT_API_PORT}`
  : (rawConfiguredApiUrl || `http://localhost:${DEFAULT_API_PORT}`);
export const API_URL = rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl}/api`;

const api = axios.create({
  baseURL: API_URL,
});

const getStoredToken = async () => AsyncStorage.getItem(TOKEN_KEY);
const getStoredUser = async () => {
  const rawUser = await AsyncStorage.getItem(USER_KEY);
  return rawUser ? JSON.parse(rawUser) : null;
};

const persistSession = async (token: string, user?: unknown) => {
  await AsyncStorage.setItem(TOKEN_KEY, token);
  if (user) {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  }
};

const clearSession = async () => {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
};

const normalizeError = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const apiMessage = error.response?.data?.error || error.response?.data?.message || error.message;
    return new Error(apiMessage || 'Erro ao comunicar com a API.');
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error('Erro inesperado.');
};

api.interceptors.request.use(async (config) => {
  const token = await getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      await clearSession();
    }
    return Promise.reject(normalizeError(error));
  }
);

export const validateAuth = async () => Boolean(await getStoredToken());

export const authService = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.token) {
      await persistSession(response.data.token, response.data.user);
    }
    return response.data;
  },
  register: async (name: string, email: string, password: string) => {
    const response = await api.post('/auth/register', { name, email, password });
    if (response.data.token) {
      await persistSession(response.data.token, response.data.user);
    }
    return response.data;
  },
  logout: async () => {
    await clearSession();
  },
  getCurrentUser: async () => getStoredUser(),
};

export const clientService = {
  getAll: async () => (await api.get('/clients')).data,
  create: async (data: any) => (await api.post('/clients', data)).data,
  update: async (id: string, data: any) => (await api.put(`/clients/${id}`, data)).data,
  delete: async (id: string) => (await api.delete(`/clients/${id}`)).data,
};

export const workOrderService = {
  getAll: async () => (await api.get('/work-orders')).data,
  create: async (data: any) => (await api.post('/work-orders', data)).data,
  update: async (id: string, data: any) => (await api.put(`/work-orders/${id}`, data)).data,
  delete: async (id: string) => (await api.delete(`/work-orders/${id}`)).data,
};

export const quoteService = {
  getAll: async () => (await api.get('/quotes')).data,
  getById: async (id: string) => (await api.get(`/quotes/${id}`)).data,
  create: async (data: any) => (await api.post('/quotes', data)).data,
  update: async (id: string, data: any) => (await api.put(`/quotes/${id}`, data)).data,
  delete: async (id: string) => (await api.delete(`/quotes/${id}`)).data,
  convertToProject: async (id: string, data: any) => (await api.post(`/quotes/${id}/convert-to-project`, data)).data,
  generatePDF: async (id: string) => api.get(`/quotes/${id}/pdf`, { responseType: 'blob' }),
};

export const invoiceService = {
  getAll: async () => (await api.get('/invoices')).data,
  getById: async (id: string) => (await api.get(`/invoices/${id}`)).data,
  create: async (data: any) => (await api.post('/invoices', data)).data,
  update: async (id: string, data: any) => (await api.put(`/invoices/${id}`, data)).data,
  delete: async (id: string) => (await api.delete(`/invoices/${id}`)).data,
  markAsPaid: async (id: string, amountPaid?: number) => (await api.patch(`/invoices/${id}/pay`, { amountPaid })).data,
};

export const projectService = {
  getAll: async () => (await api.get('/projects')).data,
  getById: async (id: string) => (await api.get(`/projects/${id}`)).data,
  create: async (data: any) => (await api.post('/projects', data)).data,
  update: async (id: string, data: any) => (await api.put(`/projects/${id}`, data)).data,
  delete: async (id: string) => (await api.delete(`/projects/${id}`)).data,
  updateTask: async (projectId: string, taskId: string, isCompleted: boolean) => (await api.patch(`/projects/${projectId}/tasks/${taskId}`, { isCompleted })).data,
  updateProgress: async (id: string, progress: number) => (await api.patch(`/projects/${id}/progress`, { progress })).data,
  getExpenses: async (id: string) => (await api.get(`/projects/${id}/expenses`)).data,
  createExpense: async (id: string, data: any) => (await api.post(`/projects/${id}/expenses`, data)).data,
  updateExpense: async (id: string, expenseId: string, data: any) => (await api.put(`/projects/${id}/expenses/${expenseId}`, data)).data,
  deleteExpense: async (id: string, expenseId: string) => (await api.delete(`/projects/${id}/expenses/${expenseId}`)).data,
  getNotes: async (id: string) => (await api.get(`/projects/${id}/notes`)).data,
  createNote: async (id: string, data: any) => (await api.post(`/projects/${id}/notes`, data)).data,
  updateNote: async (id: string, noteId: string, data: any) => (await api.put(`/projects/${id}/notes/${noteId}`, data)).data,
  deleteNote: async (id: string, noteId: string) => (await api.delete(`/projects/${id}/notes/${noteId}`)).data,
  getReport: async (id: string) => (await api.get(`/projects/${id}/report`)).data,
  getFinancialSummary: async (id: string) => {
    const report = await api.get(`/projects/${id}/report`);
    return report.data?.statistics || report.data;
  },
};

export const expenseService = {
  getAll: async () => (await api.get('/expenses')).data,
  getById: async (id: string) => (await api.get(`/expenses/${id}`)).data,
  create: async (data: any) => (await api.post('/expenses', data)).data,
  update: async (id: string, data: any) => (await api.put(`/expenses/${id}`, data)).data,
  delete: async (id: string) => (await api.delete(`/expenses/${id}`)).data,
  getByCategoryReport: async (params?: Record<string, string>) => (await api.get('/expenses/reports/by-category', { params })).data,
};

export const stockService = {
  getCategories: async () => (await api.get('/stock/categories')).data,
  createCategory: async (data: any) => (await api.post('/stock/categories', data)).data,
  updateCategory: async (id: string, data: any) => (await api.put(`/stock/categories/${id}`, data)).data,
  deleteCategory: async (id: string) => (await api.delete(`/stock/categories/${id}`)).data,
  getItems: async (params?: Record<string, any>) => (await api.get('/stock/items', { params })).data,
  getItemById: async (id: string) => (await api.get(`/stock/items/${id}`)).data,
  createItem: async (data: any) => (await api.post('/stock/items', data)).data,
  updateItem: async (id: string, data: any) => (await api.put(`/stock/items/${id}`, data)).data,
  deleteItem: async (id: string) => (await api.delete(`/stock/items/${id}`)).data,
  getMovements: async (params?: Record<string, any>) => (await api.get('/stock/movements', { params })).data,
  createMovement: async (data: any) => (await api.post('/stock/movements', data)).data,
  getStockReport: async () => (await api.get('/stock/reports/stock')).data,
  getMovementsReport: async (params?: Record<string, any>) => (await api.get('/stock/reports/movements', { params })).data,
};

export const settingsService = {
  getSettings: async () => (await api.get('/settings')).data,
  updateSettings: async (data: any) => (await api.put('/settings', data)).data,
  testGeminiToken: async (apiKey: string) => (await api.post('/settings/test-gemini', { apiKey })).data,
  removeGeminiToken: async () => (await api.delete('/settings/gemini-token')).data,
};

export default api;
