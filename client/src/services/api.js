import axios from 'axios';

const rawEnvUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
const API_BASE_URL = rawEnvUrl
  ? rawEnvUrl.endsWith('/api')
    ? rawEnvUrl
    : `${rawEnvUrl}/api`
  : '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor: attach Bearer token if present in localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('agri_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle unauthorized and standardize errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred. Please try again.';
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('agri_token');
      localStorage.removeItem('agri_user');
    }
    return Promise.reject(new Error(message));
  }
);

// API Service modules
export const authService = {
  getProviders: () => api.get('/auth/providers'),
  register: (data) => api.post('/auth/register', data),
  login: (credentials) => api.post('/auth/login', credentials),
  firebasePhoneLogin: (data) => api.post('/auth/firebase-phone', data),
  linkPhone: (data) => api.put('/auth/link-phone', data),
  googleLogin: (data) => api.post('/auth/google', data),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout')
};

export const userService = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
  changePassword: (data) => api.put('/users/change-password', data),
  submitVerification: (formData) =>
    api.post('/users/verify', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
};

export const cropService = {
  getCrops: (params) => api.get('/crops', { params }),
  getCropById: (id) => api.get(`/crops/${id}`),
  getMyCrops: () => api.get('/crops/my'),
  createCrop: (formData) =>
    api.post('/crops', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  updateCrop: (id, formData) =>
    api.put(`/crops/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  deleteCrop: (id) => api.delete(`/crops/${id}`),
  getMandiPrice: (name, state) => api.get('/crops/mandi-price', { params: { name, state } }),
  getNearbyCrops: (params) => api.get('/crops/nearby', { params }),
  getTransportEstimate: (id, params) => api.get(`/crops/${id}/transport-estimate`, { params })
};

export const priceService = {
  getPrices: (params) => api.get('/prices', { params }),
  getTrend: (params) => api.get('/prices/trend', { params })
};

export const orderService = {
  createOrder: (data) => api.post('/orders', data),
  getMyOrders: () => api.get('/orders/my'),
  getFarmerOrders: () => api.get('/orders/farmer'),
  updateOrderStatus: (id, status) => api.put(`/orders/${id}/status`, { status }),
  cancelOrder: (id) => api.put(`/orders/${id}/cancel`),
  submitOffer: (id, data) => api.post(`/orders/${id}/negotiate`, data),
  respondToOffer: (id, offerId, action) =>
    api.put(`/orders/${id}/offer/${offerId}/respond`, { action }),
  // Integration 9: Direct UPI QR & Farmer Mark Paid
  getUpiQr: (id) => api.get(`/orders/${id}/upi-qr`),
  markPaid: (id) => api.put(`/orders/${id}/mark-paid`),
  // Integration 10: PDF Invoice download
  downloadInvoice: async (id, invoiceNumber = '') => {
    const res = await api.get(`/orders/${id}/invoice`, { responseType: 'blob' });
    const blob = new Blob([res.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `AgriConnect-${invoiceNumber || id.slice(-6)}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }
};

export const reviewService = {
  createReview: (data) => api.post('/reviews', data),
  getFarmerReviews: (farmerId) => api.get(`/reviews/farmer/${farmerId}`)
};

export const adminService = {
  getUsers: (params) => api.get('/admin/users', { params }),
  toggleBlockUser: (id) => api.put(`/admin/users/${id}/block`),
  getCrops: (params) => api.get('/admin/crops', { params }),
  deleteCrop: (id) => api.delete(`/admin/crops/${id}`),
  getStats: () => api.get('/admin/stats'),
  getFarmerStats: () => api.get('/admin/farmer-stats'),
  getPendingVerifications: () => api.get('/admin/verifications'),
  reviewVerification: (id, data) => api.put(`/admin/verifications/${id}`, data),
  getAdminAnalytics: () => api.get('/admin/analytics'),
  getFarmerAnalytics: () => api.get('/admin/farmer-analytics')
};

export const chatService = {
  getConversations: () => api.get('/chat/conversations'),
  getOrCreateConversation: (data) => api.post('/chat/conversations', data),
  getMessages: (convId, params) => api.get(`/chat/conversations/${convId}/messages`, { params }),
  sendMessage: (convId, text) => api.post(`/chat/conversations/${convId}/messages`, { text })
};

export const notificationService = {
  getNotifications: (params) => api.get('/notifications', { params }),
  getChannels: () => api.get('/notifications/channels'),
  updatePreferences: (data) => api.put('/notifications/preferences', data),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  deleteNotification: (id) => api.delete(`/notifications/${id}`)
};

// AI & Multi-Provider LLM Service (Integrations 1, 2, 3, 4)
export const aiService = {
  getHealth: () => api.get('/ai/health'),
  getChatHistory: () => api.get('/ai/chat/history'),
  clearChatHistory: () => api.delete('/ai/chat/history'),
  sendChat: (data) => api.post('/ai/chat', data),
  streamChat: async ({
    message,
    language = 'en',
    history = [],
    onToken,
    onToolActivity,
    onDone,
    onError
  }) => {
    const token = localStorage.getItem('agri_token');
    try {
      const response = await fetch(`${API_BASE_URL}/ai/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ message, language, history })
      });

      if (!response.ok || !response.body) {
        const fallback = await api.post('/ai/chat', { message, language, history });
        const d = fallback.data.data;
        if (onToken && d.reply) onToken(d.reply);
        if (onDone) onDone(d);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let currentEvent = 'message';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line) continue;
          if (line.startsWith('event:')) {
            currentEvent = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            const dataStr = line.slice(5).trim();
            try {
              const payload = JSON.parse(dataStr);
              if (currentEvent === 'tool_activity' && onToolActivity) {
                onToolActivity(payload);
              } else if (currentEvent === 'token' && payload.token && onToken) {
                onToken(payload.token);
              } else if (currentEvent === 'done' && onDone) {
                onDone(payload);
              } else if (currentEvent === 'error' && onError) {
                onError(new Error(payload.message || 'AI stream error'));
              }
            } catch {
              // ignore partial SSE line
            }
          }
        }
      }
    } catch (err) {
      if (onError) onError(err);
    }
  },
  checkDisease: (formData) =>
    api.post('/ai/disease-check', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  getDiseaseHistory: () => api.get('/ai/disease-check/history'),
  autoListFromPhoto: (formData) =>
    api.post('/ai/auto-list-photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
};

// Reverse Marketplace Service (Integration 11)
export const requirementService = {
  getRequirements: (params) => api.get('/requirements', { params }),
  getMyRequirements: () => api.get('/requirements/my'),
  getMyQuotes: () => api.get('/requirements/quotes/my'),
  createRequirement: (data) => api.post('/requirements', data),
  createQuote: (id, data) => api.post(`/requirements/${id}/quotes`, data),
  acceptQuote: (id, quoteId) => api.put(`/requirements/${id}/quotes/${quoteId}/accept`)
};

// Government Schemes & Weather Services (Integration 12)
export const schemeService = {
  getSchemes: () => api.get('/schemes'),
  createScheme: (data) => api.post('/schemes', data),
  updateScheme: (id, data) => api.put(`/schemes/${id}`, data),
  deleteScheme: (id) => api.delete(`/schemes/${id}`)
};

export const weatherService = {
  getWeather: (params) => api.get('/weather', { params })
};

export default api;
