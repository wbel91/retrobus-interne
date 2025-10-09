import { apiClient } from './config.js';

export const documentsAPI = {
  // Récupérer les documents d'un membre
  getByMember: (memberId) => apiClient.get(`/api/documents/member/${memberId}`),
  
  // Supprimer un document
  delete: (documentId) => apiClient.delete(`/api/documents/${documentId}`),
  
  // Mettre à jour le statut d'un document
  updateStatus: (documentId, data) => apiClient.put(`/api/documents/${documentId}/status`, data),
  
  // Récupérer les documents expirant bientôt
  getExpiring: (days = 60) => apiClient.get(`/api/documents/expiring?days=${days}`)
};