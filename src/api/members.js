import { apiClient } from './config.js';

export const membersAPI = {
  // Récupérer tous les adhérents avec pagination et filtres
  getAll: (params) => apiClient.get('/api/members', { params }),
  
  // Récupérer un adhérent par ID
  getById: async (id) => {
    return apiClient.get(`/api/members/${id}`);
  },
  
  // Créer un nouvel adhérent
  create: (data) => apiClient.post('/api/members', data),
  
  // Mettre à jour un adhérent
  update: (id, data) => apiClient.put(`/api/members/${id}`, data),
  
  // Supprimer un adhérent
  delete: (id) => apiClient.delete(`/api/members/${id}`),
  
  // Récupérer les statistiques
  getStats: () => apiClient.get('/api/members/stats')
};