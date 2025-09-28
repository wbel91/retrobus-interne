// api/events.js
app.get("/api/events", (req, res) => {
  res.json(events); // events = liste des événements
});
app.post("/api/events", (req, res) => {
  // Ajout d'un événement
});