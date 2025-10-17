import { apiClient } from './config.js';

// API pour la gestion financière
export const financeAPI = {
  // Récupérer les statistiques financières
  getStats: async () => {
    try {
      const response = await apiClient.get('/finance/stats');
      return response.data;
    } catch (error) {
      console.error('Erreur récupération stats finance:', error);
      throw error;
    }
  },

  // Gestion du solde bancaire
  getBankBalance: async () => {
    try {
      const response = await apiClient.get('/finance/bank-balance');
      return response.data;
    } catch (error) {
      console.error('Erreur récupération solde bancaire:', error);
      throw error;
    }
  },

  setBankBalance: async (balance) => {
    try {
      const response = await apiClient.post('/finance/bank-balance', { balance });
      return response.data;
    } catch (error) {
      console.error('Erreur mise à jour solde bancaire:', error);
      throw error;
    }
  },

  // Gestion des dépenses programmées
  getScheduledExpenses: async () => {
    try {
      const response = await apiClient.get('/finance/scheduled-expenses');
      return response.data;
    } catch (error) {
      console.error('Erreur récupération dépenses programmées:', error);
      throw error;
    }
  },

  createScheduledExpense: async (expenseData) => {
    try {
      const response = await apiClient.post('/finance/scheduled-expenses', expenseData);
      return response.data;
    } catch (error) {
      console.error('Erreur création dépense programmée:', error);
      throw error;
    }
  },
  
  // Récupérer les transactions
  getTransactions: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value);
        }
      });
      
      const response = await apiClient.get(`/finance/transactions?${params}`);
      return response.data;
    } catch (error) {
      console.error('Erreur récupération transactions:', error);
      throw error;
    }
  },
  
  // Créer une nouvelle transaction
  createTransaction: async (transactionData) => {
    try {
      const response = await apiClient.post('/finance/transactions', transactionData);
      return response.data;
    } catch (error) {
      console.error('Erreur création transaction:', error);
      throw error;
    }
  },
  
  // Synchroniser avec les adhésions
  syncMemberships: async () => {
    try {
      const response = await apiClient.post('/finance/sync/memberships');
      return response.data;
    } catch (error) {
      console.error('Erreur sync adhésions:', error);
      throw error;
    }
  },

  // Récupérer les catégories
  getCategories: async () => {
    try {
      const response = await apiClient.get('/finance/categories');
      return response.data;
    } catch (error) {
      console.error('Erreur récupération catégories:', error);
      // Retourner des catégories par défaut si l'endpoint n'existe pas
      return {
        categories: [
          { id: 'adhesions', name: 'Adhésions', type: 'recette' },
          { id: 'evenements', name: 'Événements', type: 'recette' },
          { id: 'carburant', name: 'Carburant', type: 'depense' },
          { id: 'maintenance', name: 'Maintenance', type: 'depense' },
          { id: 'assurance', name: 'Assurance', type: 'depense' },
          { id: 'materiel', name: 'Matériel', type: 'depense' },
          { id: 'frais_admin', name: 'Frais administratifs', type: 'depense' },
          { id: 'autres', name: 'Autres', type: 'both' }
        ]
      };
    }
  },

  // Récupérer les données par catégorie
  getCategoryBreakdown: async (period = 'month') => {
    try {
      const response = await apiClient.get('/finance/category-breakdown', {
        params: { period }
      });
      return response.data;
    } catch (error) {
      console.error('Erreur breakdown catégories:', error);
      throw error;
    }
  },

  // Actions rapides (exports, imports, rapports)
  exportData: async (format = 'csv', filters = {}) => {
    try {
      const response = await apiClient.get('/finance/export', { 
        params: { format, ...filters },
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Erreur export données:', error);
      // Simuler un export pour l'instant
      const csvContent = 'Date,Type,Description,Montant\n2024-01-15,Recette,Adhésion Test,60.00\n';
      const blob = new Blob([csvContent], { type: 'text/csv' });
      return blob;
    }
  }
};