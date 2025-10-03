import { apiClient } from './config.js';

// API pour les événements
export const eventsAPI = {
  // Récupérer tous les événements
  getAll: async () => {
    return apiClient.get('/events');
  },
  
  // Récupérer un événement par ID
  getById: async (id) => {
    return apiClient.get(`/events/${id}`);
  },
  
  // Créer un nouvel événement
  create: async (eventData) => {
    return apiClient.post('/events', eventData);
  },
  
  // Mettre à jour un événement
  update: async (id, eventData) => {
    return apiClient.put(`/events/${id}`, eventData);
  },
  
  // Supprimer un événement
  delete: async (id) => {
    return apiClient.delete(`/events/${id}`);
  },
  
  // Publier/dépublier un événement
  publish: async (id, status) => {
    return apiClient.put(`/events/${id}`, { status });
  }
};