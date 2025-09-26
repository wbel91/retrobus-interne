import { apiClient } from './config.js';

export const flashAPI = {
  // Récupérer tous les flashs actifs
  getActive: async () => {
    return await apiClient.get('/flashes');
  },

  // Récupérer tous les flashs (admin)
  getAll: async () => {
    return await apiClient.get('/flashes/all');
  },

  // Créer un nouveau flash
  create: async (flashData) => {
    return await apiClient.post('/flashes', flashData);
  },

  // Modifier un flash
  update: async (id, flashData) => {
    return await apiClient.put(`/flashes/${id}`, flashData);
  },

  // Supprimer un flash
  delete: async (id) => {
    return await apiClient.delete(`/flashes/${id}`);
  }
};