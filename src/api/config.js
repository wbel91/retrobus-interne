// Configuration de base pour les API
const API_BASE_URL = import.meta.env.VITE_API_URL;

if (!API_BASE_URL) {
  throw new Error('API non configurée (VITE_API_URL manquante)');
}

// Headers par défaut
const getDefaultHeaders = (options = {}) => ({
  'Content-Type': 'application/json',
  ...options.headers,
});

// Headers avec authentification JWT
const getAuthHeaders = (token, options = {}) => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`,
  ...options.headers,
});

// Instance API client avec support JWT
export const apiClient = {
  get: async (url, options = {}) => {
    const token = localStorage.getItem('token');
    const headers = token 
      ? getAuthHeaders(token, options)
      : getDefaultHeaders(options);

    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'GET',
      headers,
      ...options,
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        // Token expiré, nettoyer le localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  },
  
  post: async (url, data, options = {}) => {
    const token = localStorage.getItem('token');
    const headers = token 
      ? getAuthHeaders(token, options)
      : getDefaultHeaders(options);

    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
      ...options,
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        // Token expiré, nettoyer le localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  },
  
  put: async (url, data, options = {}) => {
    const token = localStorage.getItem('token');
    const headers = token 
      ? getAuthHeaders(token, options)
      : getDefaultHeaders(options);

    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
      ...options,
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        // Token expiré, nettoyer le localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  },

  delete: async (url, options = {}) => {
    const token = localStorage.getItem('token');
    const headers = token 
      ? getAuthHeaders(token, options)
      : getDefaultHeaders(options);

    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'DELETE',
      headers,
      ...options,
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        // Token expiré, nettoyer le localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  }
};

// Export de l'URL de base pour les autres modules
export { API_BASE_URL };

