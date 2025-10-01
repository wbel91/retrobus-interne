import { apiClient } from './config';

export const listVehicles = () => apiClient.get('/vehicles');
export const getVehicle = (parc) => apiClient.get(`/vehicles/${parc}`);
export const updateVehicle = (parc, data) => apiClient.put(`/vehicles/${parc}`, data);
export const createVehicle = (data) => apiClient.post('/vehicles', data);
