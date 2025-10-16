// Export de toutes les API clients
export { apiClient, API_BASE_URL } from './config.js';
export { authAPI } from './auth.js';
export { eventsAPI } from './events.js';
export { vehiculesAPI } from './vehicles.js';
export { membersAPI } from './members.js';
export { documentsAPI } from './documents.js';
export { newsletterAPI } from './newsletter.js';
export { myRBEAPI } from './myrbe.js';
export { flashAPI } from './flash.js';
export { stocksAPI } from './stocks.js';

// Import des API pour l'export par défaut
import { authAPI } from './auth.js';
import { eventsAPI } from './events.js';
import { vehiculesAPI } from './vehicles.js';
import { membersAPI } from './members.js';
import { documentsAPI } from './documents.js';
import { newsletterAPI } from './newsletter.js';
import { myRBEAPI } from './myrbe.js';
import { flashAPI } from './flash.js';
import { stocksAPI } from './stocks.js';

// Alias pour compatibility
export const api = {
  get: (url, options) => apiClient.get(url, options),
  post: (url, data, options) => apiClient.post(url, data, options),
  put: (url, data, options) => apiClient.put(url, data, options),
  delete: (url, options) => apiClient.delete(url, options),
};

// Export par défaut de toutes les API
export default {
  auth: authAPI,
  events: eventsAPI,
  vehicules: vehiculesAPI,
  members: membersAPI,
  documents: documentsAPI,
  newsletter: newsletterAPI,
  myrbe: myRBEAPI,
  flash: flashAPI,
  stocks: stocksAPI
};