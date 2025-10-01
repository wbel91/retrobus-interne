// Configuration de base pour les API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// Token d'autorisation pour l'API interne
const AUTH_TOKEN = 'Bearer creator123';

// Headers par défaut avec authentification
const getDefaultHeaders = (options = {}) => ({
  'Content-Type': 'application/json',
  'Authorization': AUTH_TOKEN,
  ...options.headers,
});

// Instance Axios ou fetch personnalisée
export const apiClient = {
  get: async (url, options = {}) => {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'GET',
      headers: getDefaultHeaders(options),
      ...options,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  },
  
  post: async (url, data, options = {}) => {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'POST',
      headers: getDefaultHeaders(options),
      body: JSON.stringify(data),
      ...options,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  },
  
  put: async (url, data, options = {}) => {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'PUT',
      headers: getDefaultHeaders(options),
      body: JSON.stringify(data),
      ...options,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  },
  
  delete: async (url, options = {}) => {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'DELETE',
      headers: getDefaultHeaders(options),
      ...options,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  }
};

export { API_BASE_URL };
apiClient.baseURL = API_BASE_URL;
apiClient.authHeader = 'Bearer creator123';

