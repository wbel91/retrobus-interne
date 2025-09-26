import { apiClient } from './config.js';

// API pour l'authentification
export const authAPI = {
  // Connexion
  login: async (credentials) => {
    return apiClient.post('/auth/login', credentials);
  },
  
  // Déconnexion
  logout: async () => {
    return apiClient.post('/auth/logout');
  },
  
  // Vérifier le token
  verifyToken: async (token) => {
    return apiClient.get('/auth/verify', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  },
  
  // Récupérer les informations de l'utilisateur
  getUser: async () => {
    return apiClient.get('/auth/me');
  },
  
  // Rafraîchir le token
  refreshToken: async (refreshToken) => {
    return apiClient.post('/auth/refresh', { refreshToken });
  }
};