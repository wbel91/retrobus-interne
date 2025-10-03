import { apiClient } from './config.js';
const express = require("express");
const router = express.Router();

let vehicles = [
  { id: "bus920", name: "RétroBus 920" },
];

// API pour les véhicules
export const vehiculesAPI = {
  // Récupérer tous les véhicules
  getAll: async () => {
    return apiClient.get('/vehicles');
  },
  
  // Récupérer un véhicule par parc (l'API utilise parc, pas id)
  getByParc: async (parc) => {
    return apiClient.get(`/vehicles/${parc}`);
  },
  
  // Créer un nouveau véhicule
  create: async (vehiculeData) => {
    return apiClient.post('/vehicles', vehiculeData);
  },
  
  // Mettre à jour un véhicule
  update: async (parc, vehiculeData) => {
    return apiClient.put(`/vehicles/${parc}`, vehiculeData);
  },
  
  // Supprimer un véhicule
  delete: async (parc) => {
    return apiClient.delete(`/vehicles/${parc}`);
  },
  
  // Upload galerie
  uploadGallery: async (parc, files) => {
    const formData = new FormData();
    files.forEach(file => formData.append('images', file));
    
    const token = localStorage.getItem('token');
    const response = await fetch(`${import.meta.env.VITE_API_URL}/vehicles/${parc}/gallery`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return;
      }
      throw new Error(`Upload failed: ${response.status}`);
    }
    
    return response.json();
  },
  
  // Upload background
  uploadBackground: async (parc, file) => {
    const formData = new FormData();
    formData.append('image', file);
    
    const token = localStorage.getItem('token');
    const response = await fetch(`${import.meta.env.VITE_API_URL}/vehicles/${parc}/background`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return;
      }
      throw new Error(`Upload failed: ${response.status}`);
    }
    
    return response.json();
  },
  
  // Générer QR Code
  generateQR: async (parc) => {
    return apiClient.get(`/vehicles/${parc}/qr`);
  },
  
  // Gestion des utilisations
  getUsages: async (parc) => {
    return apiClient.get(`/vehicles/${parc}/usages`);
  },
  
  createUsage: async (parc, usageData) => {
    return apiClient.post(`/vehicles/${parc}/usages`, usageData);
  },
  
  updateUsage: async (id, usageData) => {
    return apiClient.put(`/usages/${id}`, usageData);
  },
  
  deleteUsage: async (id) => {
    return apiClient.delete(`/usages/${id}`);
  },
  
  // Gestion des rapports
  getReports: async (parc) => {
    return apiClient.get(`/vehicles/${parc}/reports`);
  },
  
  createReport: async (parc, reportData) => {
    return apiClient.post(`/vehicles/${parc}/reports`, reportData);
  },
  
  updateReport: async (id, reportData) => {
    return apiClient.put(`/reports/${id}`, reportData);
  },
  
  deleteReport: async (id) => {
    return apiClient.delete(`/reports/${id}`);
  }
};

// GET tous les véhicules
router.get("/", (req, res) => res.json(vehicles));

// POST ajouter un véhicule
router.post("/", (req, res) => {
  vehicles.push(req.body);
  res.status(201).json(req.body);
});

module.exports = router;