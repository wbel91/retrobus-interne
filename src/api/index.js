const express = require("express");
const cors = require("cors");
const eventsRouter = require("./events");
const vehiclesRouter = require("./vehicles");

const app = express();
app.use(cors());
app.use(express.json());

// Routes API
app.use("/api/events", eventsRouter);
app.use("/api/vehicles", vehiclesRouter);

// Route de test
app.get("/api", (req, res) => res.json({ status: "API RBE OK" }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API RBE running on port ${PORT}`));

// Export de toutes les API
export { apiClient, API_BASE_URL } from './config.js';
export { authAPI } from './auth.js';
export { eventsAPI } from './events.js';
export { vehiculesAPI } from './vehicles.js';
export { membersAPI } from './members.js';
export { documentsAPI } from './documents.js';
export { newsletterAPI } from './newsletter.js';
export { myRBEAPI } from './myrbe.js';
export { flashAPI } from './flash.js';

// Export par défaut de toutes les API
export default {
  auth: authAPI,
  events: eventsAPI,
  vehicules: vehiculesAPI,
  members: membersAPI,
  documents: documentsAPI,
  newsletter: newsletterAPI,
  myrbe: myRBEAPI,
  flash: flashAPI
};