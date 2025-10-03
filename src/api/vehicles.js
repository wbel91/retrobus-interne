import { apiClient } from './config.js';

// API pour les véhicules
export const vehiculesAPI = {
  // Récupérer tous les véhicules
  getAll: async () => {
    return apiClient.get('/vehicles');
  },
  
  // Récupérer un véhicule par parc
  getByParc: async (parc) => {
    return apiClient.get(`/vehicles/${parc}`);
  },
  
  // Créer un nouveau véhicule
  create: async (vehiculeData) => {
    return apiClient.post('/vehicles', vehiculeData);
  },
  
  // Mettre à jour un véhicule
  update: async (parc, vehiculeData) => {
    return apiClient.put(`/vehicles/${parc}`, vehiculeData);
  },
  
  // Supprimer un véhicule
  delete: async (parc) => {
    return apiClient.delete(`/vehicles/${parc}`);
  }
};