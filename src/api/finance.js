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

  // Définir le solde bancaire
  setBankBalance: async (amount) => {
    try {
      const response = await apiClient.post('/finance/bank-balance', { amount });
      return response.data;
    } catch (error) {
      console.error('Erreur définition solde bancaire:', error);
      throw error;
    }
  },

  // Récupérer les dépenses programmées
  getScheduledExpenses: async (months = 6) => {
    try {
      const response = await apiClient.get('/finance/scheduled-expenses', {
        params: { months }
      });
      return response.data;
    } catch (error) {
      console.error('Erreur récupération dépenses programmées:', error);
      throw error;
    }
  },

  // Créer une dépense programmée
  createScheduledExpense: async (expenseData) => {
    try {
      const response = await apiClient.post('/finance/scheduled-expenses', expenseData);
      return response.data;
    } catch (error) {
      console.error('Erreur création dépense programmée:', error);
      throw error;
    }
  },

  // Mettre à jour une dépense programmée
  updateScheduledExpense: async (id, expenseData) => {
    try {
      const response = await apiClient.put(`/finance/scheduled-expenses/${id}`, expenseData);
      return response.data;
    } catch (error) {
      console.error('Erreur mise à jour dépense programmée:', error);
      throw error;
    }
  },

  // Supprimer une dépense programmée
  deleteScheduledExpense: async (id) => {
    try {
      const response = await apiClient.delete(`/finance/scheduled-expenses/${id}`);
      return response.data;
    } catch (error) {
      console.error('Erreur suppression dépense programmée:', error);
      throw error;
    }
  },
  
  // Récupérer les transactions (existant)
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
  
  // Créer une nouvelle transaction (existant)
  createTransaction: async (transactionData) => {
    try {
      const response = await apiClient.post('/finance/transactions', transactionData);
      return response.data;
    } catch (error) {
      console.error('Erreur création transaction:', error);
      throw error;
    }
  },

  // Synchroniser avec les adhésions (existant)
  syncMemberships: async () => {
    try {
      const response = await apiClient.post('/finance/sync/memberships');
      return response.data;
    } catch (error) {
      console.error('Erreur sync adhésions:', error);
      throw error;
    }
  },

  // Export fonctionnalité
  exportData: async (format = 'csv', filters = {}) => {
    try {
      const response = await apiClient.get('/finance/export', { 
        params: { format, ...filters },
        responseType: 'blob'
      });
      
      // Créer un lien de téléchargement
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `comptabilite_${new Date().toISOString().split('T')[0]}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return { success: true, message: 'Export téléchargé' };
    } catch (error) {
      console.error('Erreur export données:', error);
      // Fallback : générer un CSV simple côté client
      return financeAPI.generateCSVExport();
    }
  },

  // Génération de rapport
  generateReport: async (reportType = 'monthly', filters = {}) => {
    try {
      const [stats, transactions, scheduledExpenses] = await Promise.all([
        financeAPI.getStats(),
        financeAPI.getTransactions({ limit: 100 }),
        financeAPI.getScheduledExpenses(6)
      ]);

      const report = {
        type: reportType,
        generatedAt: new Date().toISOString(),
        period: filters.period || 'current_month',
        stats,
        transactions: transactions.transactions || [],
        scheduledExpenses: scheduledExpenses.expenses || [],
        summary: {
          totalRevenue: stats.monthlyRevenue,
          totalExpenses: stats.monthlyExpenses,
          netIncome: parseFloat(stats.monthlyRevenue.replace(/[^\d,-]/g, '').replace(',', '.')) - 
                   parseFloat(stats.monthlyExpenses.replace(/[^\d,-]/g, '').replace(',', '.')),
          bankBalance: stats.bankBalance
        }
      };

      return report;
    } catch (error) {
      console.error('Erreur génération rapport:', error);
      throw error;
    }
  },

  // Génération CSV côté client (fallback)
  generateCSVExport: async () => {
    try {
      const [transactions, expenses] = await Promise.all([
        financeAPI.getTransactions({ limit: 1000 }),
        financeAPI.getScheduledExpenses(12)
      ]);

      const csvData = [];
      
      // En-tête
      csvData.push(['Type', 'Date', 'Description', 'Catégorie', 'Montant', 'Source']);
      
      // Transactions
      (transactions.transactions || []).forEach(t => {
        csvData.push([
          t.type,
          new Date(t.date).toLocaleDateString('fr-FR'),
          t.description,
          t.category,
          t.amount,
          'Transaction'
        ]);
      });
      
      // Dépenses programmées
      (expenses.expenses || []).forEach(e => {
        csvData.push([
          'dépense programmée',
          new Date(e.scheduledDate).toLocaleDateString('fr-FR'),
          e.description,
          e.category,
          e.amount,
          'Programmée'
        ]);
      });
      
      const csvContent = csvData.map(row => row.join(';')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `comptabilite_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return { success: true, message: 'Export CSV généré' };
    } catch (error) {
      console.error('Erreur génération CSV:', error);
      throw error;
    }
  }
};