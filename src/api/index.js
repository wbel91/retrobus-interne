// Export de toutes les API
export { apiClient, API_BASE_URL } from './config.js';
export { authAPI } from './auth.js';
export { vehiculesAPI } from './vehicules.js';
export { myRBEAPI } from './myrbe.js';

// Export par défaut de toutes les API
export default {
  auth: authAPI,
  vehicules: vehiculesAPI,
  myrbe: myRBEAPI
};