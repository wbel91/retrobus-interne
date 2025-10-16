import { apiClient } from './config.js';

export const stocksAPI = {
  // Liste des stocks avec filtres
  getAll: (params = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value);
      }
    });
    return apiClient.get(`/api/stocks?${searchParams.toString()}`);
  },

  // Récupérer un stock par ID
  getById: (id) => apiClient.get(`/api/stocks/${id}`),

  // Créer un nouveau stock
  create: (stockData) => apiClient.post('/api/stocks', stockData),

  // Mettre à jour un stock
  update: (id, stockData) => apiClient.put(`/api/stocks/${id}`, stockData),

  // Supprimer un stock
  delete: (id) => apiClient.delete(`/api/stocks/${id}`),

  // Enregistrer un mouvement de stock
  addMovement: (stockId, movementData) => 
    apiClient.post(`/api/stocks/${stockId}/movement`, movementData),

  // Récupérer l'historique des mouvements
  getMovements: (stockId, params = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value);
      }
    });
    return apiClient.get(`/api/stocks/${stockId}/movements?${searchParams.toString()}`);
  },

  // Récupérer les statistiques
  getStats: () => apiClient.get('/api/stocks/stats'),

  // Récupérer les catégories
  getCategories: () => apiClient.get('/api/stocks/categories'),

  // Export des données
  export: (format = 'csv') => {
    return apiClient.get(`/api/stocks/export?format=${format}`, {
      responseType: 'blob'
    });
  }
};