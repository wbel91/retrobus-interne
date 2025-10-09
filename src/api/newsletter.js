import { apiClient } from './config.js';

export const newsletterAPI = {
  // Gestion des abonnés
  getAll: () => apiClient.get('/newsletter'),
  create: (data) => apiClient.post('/newsletter', data),
  delete: (id) => apiClient.delete(`/newsletter/${id}`),
  updateStatus: (id, status) => apiClient.put(`/newsletter/${id}/status`, { status }),
  getStats: () => apiClient.get('/newsletter/stats'),
  export: (format = 'csv') => apiClient.get(`/newsletter/export?format=${format}`),

  // Gestion des campagnes
  campaigns: {
    getAll: (filters) => apiClient.get('/newsletter/campaigns', { params: filters }),
    getById: (id) => apiClient.get(`/newsletter/campaigns/${id}`),
    create: (data) => apiClient.post('/newsletter/campaigns', data),
    update: (id, data) => apiClient.put(`/newsletter/campaigns/${id}`, data),
    delete: (id) => apiClient.delete(`/newsletter/campaigns/${id}`),
    
    // Actions sur les campagnes
    preview: (id) => apiClient.get(`/newsletter/campaigns/${id}/preview`),
    sendTest: (id, email) => apiClient.post(`/newsletter/campaigns/${id}/test`, { email }),
    prepare: (id) => apiClient.post(`/newsletter/campaigns/${id}/prepare`),
    send: (id) => apiClient.post(`/newsletter/campaigns/${id}/send`),
    getStats: (id) => apiClient.get(`/newsletter/campaigns/${id}/stats`)
  }
};