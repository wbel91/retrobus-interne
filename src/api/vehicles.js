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
    return apiClient.get('/vehicules');
  },
  
  // Récupérer un véhicule par ID
  getById: async (id) => {
    return apiClient.get(`/vehicules/${id}`);
  },
  
  // Créer un nouveau véhicule
  create: async (vehiculeData) => {
    return apiClient.post('/vehicules', vehiculeData);
  },
  
  // Mettre à jour un véhicule
  update: async (id, vehiculeData) => {
    return apiClient.put(`/vehicules/${id}`, vehiculeData);
  },
  
  // Supprimer un véhicule
  delete: async (id) => {
    return apiClient.delete(`/vehicules/${id}`);
  },
  
  // Rechercher des véhicules
  search: async (query) => {
    return apiClient.get(`/vehicules/search?q=${encodeURIComponent(query)}`);
  },
  
  // Récupérer les véhicules par parc
  getByParc: async (parc) => {
    return apiClient.get(`/vehicules/parc/${parc}`);
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