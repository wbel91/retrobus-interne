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
  getStats: async () => {
    try {
      return await apiClient.get('/api/members/stats');
    } catch (e) {
      // En production, certains déploiements peuvent ne pas exposer cette route.
      // Si 404, retourner des stats vides pour éviter les erreurs UI.
      if (e && typeof e.message === 'string' && e.message.includes('404')) {
        return {
          totalMembers: 0,
          activeMembers: 0,
          expiredMembers: 0,
          pendingMembers: 0,
          membersWithInternalAccess: 0,
          recentJoins: 0,
          drivers: 0
        };
      }
      throw e;
    }
  },

  // Profil du membre courant
  getMe: () => apiClient.get('/api/me')
};
