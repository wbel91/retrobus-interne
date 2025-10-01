const express = require("express");
const router = express.Router();

// Stockage en mémoire (remplace par une base plus tard)
let events = [
  {
    id: "halloween2025",
    title: "RétroWouh ! Halloween",
    date: "2025-10-31",
    time: "20:00",
    location: "Salle des Fêtes de Villebon",
    adultPrice: 15,
    childPrice: 8,
    description: "Soirée spéciale Halloween avec animations, musique et surprises !",
    helloAssoUrl: "https://www.helloasso.com/associations/rbe/evenements/halloween2025",
    vehicleId: "bus920",
  },
];

// GET tous les événements
router.get("/", (req, res) => res.json(events));

// POST ajouter un événement
router.post("/", (req, res) => {
  events.push(req.body);
  res.status(201).json(req.body);
});

// PUT modifier un événement
router.put("/:id", (req, res) => {
  const idx = events.findIndex(e => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Not found" });
  events[idx] = req.body;
  res.json(events[idx]);
});

// DELETE supprimer un événement
router.delete("/:id", (req, res) => {
  events = events.filter(e => e.id !== req.params.id);
  res.status(204).end();
});

module.exports = router;