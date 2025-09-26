import { apiClient } from './config.js';

// API pour MyRBE
export const myRBEAPI = {
  // Récupérer les actions MyRBE
  getActions: async (parc) => {
    return apiClient.get(`/myrbe/actions/${parc}`);
  },
  
  // Créer une nouvelle action
  createAction: async (actionData) => {
    return apiClient.post('/myrbe/actions', actionData);
  },
  
  // Mettre à jour une action
  updateAction: async (id, actionData) => {
    return apiClient.put(`/myrbe/actions/${id}`, actionData);
  },
  
  // Supprimer une action
  deleteAction: async (id) => {
    return apiClient.delete(`/myrbe/actions/${id}`);
  },
  
  // Récupérer les rapports
  getReports: async () => {
    return apiClient.get('/myrbe/reports');
  },
  
  // Générer un rapport
  generateReport: async (reportData) => {
    return apiClient.post('/myrbe/reports/generate', reportData);
  }
};