import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import QRCode from 'qrcode';
import jwt from 'jsonwebtoken';
import { USERS } from './auth/users.js';

const app = express();
const PORT = process.env.PORT || 4000;

// Config
app.use(express.json());
app.use(cors({
  origin: (origin, cb) => {
    const allowed = [
      'http://localhost:5173',
      'http://localhost:4173',
      'http://localhost:3000',
      'http://localhost:5174',
      'https://www.association-rbe.fr',
      'https://association-rbe.fr',
      'https://retrobus-interne.fr',
      'https://www.retrobus-interne.fr',
      'https://refreshing-adaptation-rbe-serveurs.up.railway.app'
    ];
    if (!origin || allowed.includes(origin)) return cb(null, true);
    return cb(new Error('Origin not allowed'));
  },
  credentials: true
}));

let prisma;
try {
  prisma = new PrismaClient();
  console.log('✅ Prisma Client initialized');
} catch (error) {
  console.error('❌ Failed to initialize Prisma Client:', error);
  prisma = null;
}

// Helper functions for JSON handling
const parseJsonField = (field) => {
  if (!field) return null;
  if (typeof field === 'string') {
    try {
      return JSON.parse(field);
    } catch {
      return null;
    }
  }
  return field;
};

const stringifyJsonField = (field) => {
  if (!field) return null;
  if (typeof field === 'string') return field;
  try {
    return JSON.stringify(field);
  } catch {
    return null;
  }
};

const API_BASE = process.env.PUBLIC_API_BASE || '';

function absolutize(path) {
  if (!path) return path;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (!API_BASE) return path;
  return `${API_BASE}${path}`;
}

// Transform vehicle data for API responses
const transformVehicle = (vehicle) => {
  if (!vehicle) return null;
  let caract = [];
  try { caract = vehicle.caracteristiques ? JSON.parse(vehicle.caracteristiques) : []; } catch {}
  const gallery = parseJsonField(vehicle.gallery) || [];
  return {
    id: vehicle.id,
    parc: vehicle.parc,
    type: vehicle.type,
    modele: vehicle.modele,
    marque: vehicle.marque,
    subtitle: vehicle.subtitle,
    immat: vehicle.immat,
    etat: vehicle.etat,
    miseEnCirculation: vehicle.miseEnCirculation,
    energie: vehicle.energie,
    description: vehicle.description,
    history: vehicle.history,
    backgroundImage: absolutize(vehicle.backgroundImage),
    backgroundPosition: vehicle.backgroundPosition,
    gallery: gallery.map(absolutize),
    caracteristiques: caract
  };
};

const transformEvent = (evt) => {
  if (!evt) return null;
  return {
    id: evt.id,
    title: evt.title,
    date: evt.date,
    time: evt.time,
    location: evt.location,
    description: evt.description,
    helloAssoUrl: evt.helloAssoUrl,
    adultPrice: evt.adultPrice,
    childPrice: evt.childPrice,
    vehicleId: evt.vehicleId,        // ← Ajouté
    status: evt.status,              // ← Ajouté (CRUCIAL pour le bouton)
    layout: evt.layout,
    extras: evt.extras,
    createdAt: evt.createdAt,
    updatedAt: evt.updatedAt
  };
};

// ---------- Utils ----------
const ensureDB = (res) => {
  if (!prisma) {
    console.error('Prisma non initialisé');
    res.status(500).json({ error: 'Database not initialized' });
    return false;
  }
  return true;
};

// Auth JWT
const AUTH_SECRET = process.env.AUTH_SECRET || 'dev_insecure_secret';
const TOKEN_TTL = process.env.TOKEN_TTL || '12h';

function issueToken(payload) {
  return jwt.sign(payload, AUTH_SECRET, { expiresIn: TOKEN_TTL });
}

function verifyToken(token) {
  return jwt.verify(token, AUTH_SECRET);
}

function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }
  const token = auth.slice(7);
  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Auth route
app.post('/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'username & password requis' });
  }
  const u = USERS[username.toLowerCase()];
  if (!u || u.password !== password) {
    return res.status(401).json({ error: 'Identifiants invalides' });
  }
  const token = issueToken({
    sub: username.toLowerCase(),
    prenom: u.prenom,
    nom: u.nom,
    roles: u.roles
  });
  res.json({
    token,
    user: {
      username: username.toLowerCase(),
      prenom: u.prenom,
      nom: u.nom,
      roles: u.roles
    }
  });
});

// ---------- File upload setup ----------
const galleryStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(process.cwd(), 'uploads', 'vehicles');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const uploadGallery = multer({ storage: galleryStorage });

// ---------- Vehicle CRUD ----------
app.get('/vehicles', requireAuth, async (_req, res) => {
  if (!ensureDB(res)) return;
  try {
    const vehicles = await prisma.vehicle.findMany({
      orderBy: { parc: 'asc' }
    });
    const transformedVehicles = vehicles.map(transformVehicle);
    res.json(transformedVehicles);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch vehicles' });
  }
});

app.get('/vehicles/:parc', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const { parc } = req.params;
    const vehicle = await prisma.vehicle.findUnique({ where: { parc } });
    if (!vehicle) return res.status(404).json({ error: 'Véhicule introuvable' });
    res.json(transformVehicle(vehicle));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch vehicle' });
  }
});

app.post('/vehicles', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const {
      parc, etat = 'disponible', immat, energie, miseEnCirculation,
      modele = '', type = 'Bus', marque, subtitle, description, history,
      caracteristiques, gallery
    } = req.body || {};

    if (!parc) return res.status(400).json({ error: 'Le champ "parc" est requis' });

    const data = {
      parc, etat, modele, type,
      immat: immat || null,
      energie: energie || null,
      marque: marque || null,
      subtitle: subtitle || null,
      description: description || null,
      history: history || null,
      caracteristiques: stringifyJsonField(caracteristiques),
      gallery: stringifyJsonField(gallery),
      miseEnCirculation: miseEnCirculation ? new Date(miseEnCirculation) : null
    };

    const created = await prisma.vehicle.create({ data });
    res.json(transformVehicle(created));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Create failed' });
  }
});

app.put('/vehicles/:parc', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const { parc } = req.params;
    const body = { ...req.body };

    const existing = await prisma.vehicle.findUnique({ where: { parc } });
    if (!existing) return res.status(404).json({ error: 'Véhicule introuvable' });

    let caract = {};
    if (existing.caracteristiques) {
      try { caract = JSON.parse(existing.caracteristiques); } catch {}
    }

    const caractKeys = [
      'fleetNumbers','constructeur','miseEnCirculationTexte',
      'longueur','placesAssises','placesDebout','ufr',
      'preservePar','normeEuro','moteur','boiteVitesses',
      'nombrePortes','livree','girouette','climatisation'
    ];

    const directMap = {
      modele: 'modele',
      marque: 'marque',
      subtitle: 'subtitle',
      immat: 'immat',
      etat: 'etat',
      type: 'type',
      energie: 'energie',
      description: 'description',
      histoire: 'history'
    };

    const dataUpdate = {};

    Object.entries(directMap).forEach(([frontKey, dbKey]) => {
      if (body[frontKey] !== undefined) {
        dataUpdate[dbKey] = body[frontKey] === '' ? null : body[frontKey];
        delete body[frontKey];
      }
    });

    if (body.miseEnCirculation !== undefined) {
      dataUpdate.miseEnCirculation = body.miseEnCirculation
        ? new Date(body.miseEnCirculation)
        : null;
      delete body.miseEnCirculation;
    }

    caractKeys.forEach(k => {
      if (body[k] !== undefined) {
        if (body[k] === '' || body[k] === null) {
          delete caract[k];
        } else {
          caract[k] = body[k];
        }
        delete body[k];
      }
    });

    if (Array.isArray(body.caracteristiques)) {
      dataUpdate.caracteristiques = JSON.stringify(body.caracteristiques);
      delete body.caracteristiques;
    }

    if (body.backgroundImage !== undefined) {
      dataUpdate.backgroundImage = body.backgroundImage;
      delete body.backgroundImage;
    }
    if (body.backgroundPosition !== undefined) {
      dataUpdate.backgroundPosition = body.backgroundPosition;
      delete body.backgroundPosition;
    }

    dataUpdate.caracteristiques = Object.keys(caract).length
      ? JSON.stringify(caract)
      : null;

    const updated = await prisma.vehicle.update({
      where: { parc },
      data: dataUpdate
    });

    res.json(transformVehicle(updated));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Update failed' });
  }
});

app.delete('/vehicles/:parc', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const { parc } = req.params;
    await prisma.vehicle.delete({ where: { parc } });
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// ---------- Galerie upload ----------
app.use('/media/vehicles', express.static(path.join(process.cwd(), 'uploads', 'vehicles')));

app.post('/vehicles/:parc/gallery', requireAuth, uploadGallery.array('images', 10), async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const { parc } = req.params;
    const v = await prisma.vehicle.findUnique({ where: { parc } });
    if (!v) return res.status(404).json({ error: 'Véhicule introuvable' });

    const existingGallery = parseJsonField(v.gallery);
    const existing = Array.isArray(existingGallery) ? existingGallery : [];
    const added = (req.files || []).map(f => `/media/vehicles/${f.filename}`);
    const gallery = existing.concat(added);

    const updated = await prisma.vehicle.update({
      where: { parc },
      data: { gallery: stringifyJsonField(gallery) }
    });
    res.json({ gallery: parseJsonField(updated.gallery) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Upload gallery failed' });
  }
});

app.post('/vehicles/:parc/background', requireAuth, uploadGallery.single('image'), async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const { parc } = req.params;
    if (!req.file) return res.status(400).json({ error: 'Fichier manquant' });
    const v = await prisma.vehicle.findUnique({ where: { parc } });
    if (!v) return res.status(404).json({ error: 'Véhicule introuvable' });

    const updated = await prisma.vehicle.update({
      where: { parc },
      data: { backgroundImage: `/media/vehicles/${req.file.filename}` }
    });
    res.json({ backgroundImage: updated.backgroundImage });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Upload background failed' });
  }
});

app.delete('/vehicles/:parc/gallery', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const { parc } = req.params;
    const { image } = req.body || {};
    if (!image) return res.status(400).json({ error: 'image manquante' });
    const v = await prisma.vehicle.findUnique({ where: { parc } });
    if (!v) return res.status(404).json({ error: 'Véhicule introuvable' });

    let galleryArr = [];
    try { galleryArr = JSON.parse(v.gallery || '[]'); } catch {}
    const filtered = galleryArr.filter(g => g !== image);

    await prisma.vehicle.update({
      where: { parc },
      data: { gallery: JSON.stringify(filtered) }
    });
    res.json({ gallery: filtered });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Delete gallery image failed' });
  }
});

// ---------- Endpoints publics (lecture seule) ----------
app.get('/public/vehicles', async (_req, res) => {
  if (!ensureDB(res)) return;
  try {
    const vehicles = await prisma.vehicle.findMany({
      select: {
        parc: true, type: true, modele: true, marque: true, subtitle: true,
        immat: true, etat: true, miseEnCirculation: true, energie: true,
        description: true, history: true,
        caracteristiques: true, gallery: true,
        backgroundImage: true, backgroundPosition: true
      }
    });
    const transformedVehicles = vehicles.map(transformVehicle);
    res.json(transformedVehicles);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch public vehicles' });
  }
});

app.get('/public/vehicles/:parc', async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const { parc } = req.params;
    const vehicle = await prisma.vehicle.findUnique({
      where: { parc },
      select: {
        parc: true, type: true, modele: true, marque: true, subtitle: true,
        immat: true, etat: true, miseEnCirculation: true, energie: true,
        description: true, history: true,
        caracteristiques: true, gallery: true,
        backgroundImage: true, backgroundPosition: true
      }
    });
    if (!vehicle) return res.status(404).json({ error: 'Véhicule introuvable' });
    res.json(transformVehicle(vehicle));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch public vehicle' });
  }
});

// ---------- QR Code ----------
app.get('/vehicles/:parc/qr', requireAuth, async (req, res) => {
  try {
    const { parc } = req.params;
    const url = `http://localhost:5173/vehicule/${parc}`;
    const qr = await QRCode.toDataURL(url);
    res.json({ qrCode: qr, url });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'QR generation failed' });
  }
});

// ---------- Usage tracking ----------
app.get('/vehicles/:parc/usages', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const { parc } = req.params;
    const usages = await prisma.usage.findMany({
      where: { parc },
      orderBy: { startedAt: 'desc' }
    });
    res.json(usages);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch usages' });
  }
});

app.post('/vehicles/:parc/usages', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const { parc } = req.params;
    const { startedAt, endedAt, conducteur, participants, note, relatedTo } = req.body || {};

    if (!startedAt) return res.status(400).json({ error: 'startedAt requis' });

    const data = {
      parc,
      startedAt: new Date(startedAt),
      endedAt: endedAt ? new Date(endedAt) : null,
      conducteur: conducteur || null,
      participants: participants || null,
      note: note || null,
      relatedTo: relatedTo || null
    };

    const created = await prisma.usage.create({ data });
    res.json(created);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Usage creation failed' });
  }
});

app.put('/usages/:id', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const { id } = req.params;
    const { startedAt, endedAt, conducteur, participants, note, relatedTo } = req.body || {};

    const data = {};
    if (startedAt !== undefined) data.startedAt = new Date(startedAt);
    if (endedAt !== undefined) data.endedAt = endedAt ? new Date(endedAt) : null;
    if (conducteur !== undefined) data.conducteur = conducteur || null;
    if (participants !== undefined) data.participants = participants || null;
    if (note !== undefined) data.note = note || null;
    if (relatedTo !== undefined) data.relatedTo = relatedTo || null;

    const updated = await prisma.usage.update({
      where: { id: parseInt(id) },
      data
    });
    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Usage update failed' });
  }
});

app.delete('/usages/:id', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const { id } = req.params;
    await prisma.usage.delete({ where: { id: parseInt(id) } });
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Usage deletion failed' });
  }
});

// ---------- Maintenance reports ----------
app.get('/vehicles/:parc/reports', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const { parc } = req.params;
    const reports = await prisma.report.findMany({
      where: { parc },
      orderBy: { createdAt: 'desc' }
    });
    res.json(reports);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

app.post('/vehicles/:parc/reports', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const { parc } = req.params;
    const { description, usageId, filesMeta } = req.body || {};

    const data = {
      parc,
      description: description || null,
      usageId: usageId || null,
      filesMeta: filesMeta || null
    };

    const created = await prisma.report.create({ data });
    res.json(created);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Report creation failed' });
  }
});

app.put('/reports/:id', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const { id } = req.params;
    const { description, usageId, filesMeta } = req.body || {};

    const data = {};
    if (description !== undefined) data.description = description || null;
    if (usageId !== undefined) data.usageId = usageId || null;
    if (filesMeta !== undefined) data.filesMeta = filesMeta || null;

    const updated = await prisma.report.update({
      where: { id: parseInt(id) },
      data
    });
    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Report update failed' });
  }
});

app.delete('/reports/:id', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const { id } = req.params;
    await prisma.report.delete({ where: { id: parseInt(id) } });
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Report deletion failed' });
  }
});

// ---------- Flash messages ----------
app.get('/flashes/all', async (_req, res) => {
  if (!ensureDB(res)) return;
  try {
    const flashes = await prisma.flash.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(flashes);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch flashes' });
  }
});

// ---------- Events (privé) ----------
app.get('/events', requireAuth, async (_req, res) => {
  if (!ensureDB(res)) return;
  try {
    const rows = await prisma.event.findMany({ orderBy: { date: 'asc' } });
    res.json(rows.map(transformEvent));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Events fetch failed' });
  }
});

app.get('/events/:id', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const evt = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!evt) return res.status(404).json({ error: 'Not found' });
    res.json(transformEvent(evt));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Event fetch failed' });
  }
});

app.post('/events', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const b = req.body || {};
    if (!b.id) return res.status(400).json({ error: 'id requis (slug)' });
    const created = await prisma.event.create({
      data: {
        id: b.id,
        title: b.title || '',
        date: b.date ? new Date(b.date) : new Date(),
        time: b.time || null,
        location: b.location || null,
        description: b.description || null,
        helloAssoUrl: b.helloAssoUrl || null,
        adultPrice: b.adultPrice ?? null,
        childPrice: b.childPrice ?? null,
        status: b.status || 'DRAFT',
        layout: b.layout || null,
        extras: b.extras ? JSON.stringify(b.extras) : null
      }
    });
    res.status(201).json(transformEvent(created));
  } catch (e) {
    console.error(e);
    if (e.code === 'P2002') return res.status(409).json({ error: 'ID déjà utilisé' });
    res.status(500).json({ error: 'Event create failed' });
  }
});

app.put('/events/:id', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const existing = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const b = req.body || {};
    const updated = await prisma.event.update({
      where: { id: req.params.id },
      data: {
        title: b.title ?? existing.title,
        date: b.date ? new Date(b.date) : existing.date,
        time: b.time ?? existing.time,
        location: b.location ?? existing.location,
        extras: b.extras ? JSON.stringify(b.extras) : existing.extras
      } helloAssoUrl: b.helloAssoUrl ?? existing.helloAssoUrl,
    }); adultPrice: b.adultPrice ?? existing.adultPrice,
    res.json(transformEvent(updated));isting.childPrice,
  } catch (e) { b.status ?? existing.status,
    console.error(e);out ?? existing.layout,
    res.status(500).json({ error: 'Event update failed' });ing.extras
  }   }
}); });
    res.json(transformEvent(updated));
app.delete('/events/:id', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  try {.status(500).json({ error: 'Event update failed' });
    await prisma.event.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (e) {
    console.error(e);id', requireAuth, async (req, res) => {
    res.status(500).json({ error: 'Event delete failed' });
  }ry {
}); await prisma.event.delete({ where: { id: req.params.id } });
    res.status(204).end();
// ---------- Events (public) ----------
app.get('/public/events', async (_req, res) => {
  if (!ensureDB(res)) return;ror: 'Event delete failed' });
  try {
    const rows = await prisma.event.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { date: 'asc' }----------
    });('/public/events', async (_req, res) => {
    res.json(rows.map(transformEvent));
  } catch (e) {
    console.error(e);t prisma.event.findMany({
    res.status(500).json({ error: 'Public events fetch failed' });
  }   orderBy: { date: 'asc' }
}); });
    res.json(rows.map(transformEvent));
app.get('/public/events/:id', async (req, res) => {
  if (!ensureDB(res)) return;
  try {.status(500).json({ error: 'Public events fetch failed' });
    const evt = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!evt || evt.status !== 'PUBLISHED') return res.status(404).json({ error: 'Not found' });
    res.json(transformEvent(evt));
  } catch (e) {c/events/:id', async (req, res) => {
    console.error(e); return;
    res.status(500).json({ error: 'Public event fetch failed' });
  } const evt = await prisma.event.findUnique({ where: { id: req.params.id } });
}); if (!evt || evt.status !== 'PUBLISHED') return res.status(404).json({ error: 'Not found' });
    res.json(transformEvent(evt));
// ---------- Server start ----------
app.listen(PORT, () => {
  console.log(`🚀 API Server running on http://localhost:${PORT}`);
});
});
export default app;
// ---------- Server start ----------
app.listen(PORT, () => {
  console.log(`🚀 API Server running on http://localhost:${PORT}`);
});

export default app;
