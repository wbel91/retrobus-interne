import { apiClient } from './config.js';

const toQuery = (params = {}) => {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (typeof value === 'string' && value.trim() === '') return;
    sp.append(key, String(value));
  });
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
};

export const stocksAPI = {
  // Liste avec filtres/pagination: { page, limit, category, status, search, lowStock, sort }
  getAll: (params = {}) => apiClient.get(`/api/stocks${toQuery(params)}`),

  // Un article par id
  getById: (id) => apiClient.get(`/api/stocks/${id}`),

  // Création d’un article
  create: (data) => apiClient.post('/api/stocks', data),

  // Mise à jour d’un article
  update: (id, data) => apiClient.put(`/api/stocks/${id}`, data),

  // Suppression d’un article
  delete: (id) => apiClient.delete(`/api/stocks/${id}`),

  // Mouvement de stock: { type: 'IN'|'OUT'|'ADJUSTMENT', quantity, reason?, notes? }
  addMovement: (stockId, movement) =>
    apiClient.post(`/api/stocks/${stockId}/movement`, movement),

  // Historique des mouvements: { page, limit }
  getMovements: (stockId, params = {}) =>
    apiClient.get(`/api/stocks/${stockId}/movements${toQuery(params)}`),

  // Statistiques globales
  getStats: () => apiClient.get('/api/stocks/stats'),

  // Catégories (avec compte)
  getCategories: () => apiClient.get('/api/stocks/categories'),
};

// Optionnel: export par défaut
export default stocksAPI;