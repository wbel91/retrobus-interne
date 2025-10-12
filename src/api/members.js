import { apiClient, API_BASE_URL } from './config.js';

export const membersAPI = {
  baseURL: API_BASE_URL,
  
  async getAll() {
    const response = await apiClient.get('/members');
    return response.data;
  },

  async getById(id) {
    const response = await apiClient.get(`/members/${id}`);
    return response.data;
  },

  async createWithLogin(memberData) {
    const response = await apiClient.post('/members/create-with-login', memberData);
    return response.data;
  },

  async update(id, updates) {
    const response = await apiClient.patch(`/members/${id}`, updates);
    return response.data;
  },

  async resetPassword(id) {
    const response = await apiClient.post(`/members/${id}/reset-password`);
    return response.data;
  },

  async delete(id) {
    await apiClient.delete(`/members/${id}`);
  }
};
