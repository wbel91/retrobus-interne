import { apiClient } from './config.js';

export const flashAPI = {
  // Récupérer tous les flashs actifs
  getActive: async () => {
    console.log("📡 API: getActive flashs...");
    const result = await apiClient.get('/flashes');
    console.log("📡 API: getActive result:", result);
    return result;
  },

  // Récupérer tous les flashs (admin)
  getAll: async () => {
    console.log("📡 API: getAll flashs...");
    const result = await apiClient.get('/flashes/all');
    console.log("📡 API: getAll result:", result);
    return result;
  },

  // Créer un nouveau flash
  create: async (flashData) => {
    console.log("📡 API: create flash:", flashData);
    const result = await apiClient.post('/flashes', flashData);
    console.log("📡 API: create result:", result);
    return result;
  },

  // Modifier un flash
  update: async (id, flashData) => {
    console.log("📡 API: update flash:", id, flashData);
    const result = await apiClient.put(`/flashes/${id}`, flashData);
    console.log("📡 API: update result:", result);
    return result;
  },

  // Supprimer un flash
  delete: async (id) => {
    console.log("📡 API: delete flash:", id);
    const result = await apiClient.delete(`/flashes/${id}`);
    console.log("📡 API: delete result:", result);
    return result;
  }
};