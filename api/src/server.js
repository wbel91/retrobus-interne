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
import { documentsAPI, upload } from './documents.js';
import { passwordResetAPI } from './password-reset.js';

const app = express();
const PORT = process.env.PORT || 4000;

// Config
app.use(express.json());
app.use(cors({
  origin: (origin, cb) => {
    const allowed = [
      'http://localhost:5173',     // ✅ Déjà présent
      'http://localhost:4173',
      'http://localhost:3000',
      'http://localhost:5174',
      'https://www.association-rbe.fr',
      'https://association-rbe.fr',
      'https://retrobus-interne.fr',
      'https://www.retrobus-interne.fr',
      'https://refreshing-adaptation-rbe-serveurs.up.railway.app',
      'https://retrobus-essonne.fr',
      'https://www.retrobus-essonne.fr'
    ];
    console.log('🌍 CORS origin:', origin); // DEBUG
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

// Add this alias to fix route usage below
const authenticateToken = requireAuth;

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
        vehicleId: b.vehicleId || null,
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
        description: b.description ?? existing.description,
        helloAssoUrl: b.helloAssoUrl ?? existing.helloAssoUrl,
        adultPrice: b.adultPrice ?? existing.adultPrice,
        childPrice: b.childPrice ?? existing.childPrice,
        vehicleId: b.vehicleId ?? existing.vehicleId,
        status: b.status ?? existing.status,
        layout: b.layout ?? existing.layout,
        extras: b.extras ? JSON.stringify(b.extras) : existing.extras
      }
    });
    res.json(transformEvent(updated));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Event update failed' });
  }
});

app.delete('/events/:id', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    await prisma.event.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Event delete failed' });
  }
});

// ---------- Events (public) ----------
app.get('/public/events', async (_req, res) => {
  if (!ensureDB(res)) return;
  try {
    const rows = await prisma.event.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { date: 'asc' }
    });
    res.json(rows.map(transformEvent));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Public events fetch failed' });
  }
});

app.get('/public/events/:id', async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const evt = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!evt || evt.status !== 'PUBLISHED') return res.status(404).json({ error: 'Not found' });
    res.json(transformEvent(evt));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Public event fetch failed' });
  }
});

// ---------- Newsletter (Prisma) ----------
const transformSubscriber = (s) => ({
  id: s.id,
  email: s.email,
  status: s.status,
  createdAt: s.createdAt,
  updatedAt: s.updatedAt
});

// Liste complète (interne, protégée)
app.get('/newsletter', requireAuth, async (_req, res) => {
  if (!ensureDB(res)) return;
  try {
    const rows = await prisma.newsletterSubscriber.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(rows.map(transformSubscriber));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Fetch failed' });
  }
});

// Inscription publique (externe)
app.post('/newsletter/subscribe', async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const { email } = req.body || {};
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Email invalide' });
    }
    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email: email.toLowerCase() }
    });
    if (existing) {
      return res.json({ ok: true, duplicated: true, subscriber: transformSubscriber(existing) });
    }
    const created = await prisma.newsletterSubscriber.create({
      data: { email: email.toLowerCase(), status: 'CONFIRMED' }
    });
    res.json({ ok: true, subscriber: transformSubscriber(created) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Subscribe failed' });
  }
});

// Ajout manuel interne
app.post('/newsletter', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const { email, status } = req.body || {};
    if (!email || !email.includes('@')) return res.status(400).json({ error: 'Email invalide' });
    const created = await prisma.newsletterSubscriber.create({
      data: { email: email.toLowerCase(), status: status || 'CONFIRMED' }
    });
    res.json(transformSubscriber(created));
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Existe déjà' });
    console.error(e);
    res.status(500).json({ error: 'Create failed' });
  }
});

app.delete('/newsletter/:id', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    await prisma.newsletterSubscriber.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// ---------- API Members Management ----------

// GET /api/members - List all members with pagination and filters
app.get('/api/members', authenticateToken, async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const { page = 1, limit = 20, status, search, sort = 'lastName', role } = req.query;
    const offset = (page - 1) * limit;

    // Build filters
    const where = {};
    if (status && status !== 'ALL') where.membershipStatus = status;
    if (role && role !== 'ALL') where.role = role;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { memberNumber: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Define sort order
    const orderBy = {};
    if (sort === 'lastName') orderBy.lastName = 'asc';
    else if (sort === 'joinDate') orderBy.joinDate = 'desc';
    else if (sort === 'renewalDate') orderBy.renewalDate = 'asc';
    else if (sort === 'memberNumber') orderBy.memberNumber = 'asc';
    else if (sort === 'role') orderBy.role = 'asc';

    const [members, total] = await Promise.all([
      prisma.member.findMany({
        where,
        orderBy,
        skip: parseInt(offset),
        take: parseInt(limit),
        select: {
          id: true,
          memberNumber: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          membershipType: true,
          membershipStatus: true,
          role: true,
          joinDate: true,
          renewalDate: true,
          hasExternalAccess: true,
          hasInternalAccess: true,
          newsletter: true,
          lastPaymentDate: true,
          paymentAmount: true,
          paymentMethod: true,
          licenseExpiryDate: true,
          driverLicense: true
        }
      }),
      prisma.member.count({ where })
    ]);

    res.json({
      members,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (e) {
    console.error('Erreur récupération adhérents (/api):', e);
    res.status(500).json({ error: 'Erreur lors de la récupération des adhérents' });
  }
});

// POST /api/members - Create new member
app.post('/api/members', authenticateToken, async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const {
      firstName, lastName, email, phone, address, city, postalCode,
      birthDate, membershipType = 'STANDARD', membershipStatus = 'PENDING',
      renewalDate, paymentAmount, paymentMethod, hasExternalAccess = false,
      hasInternalAccess = false, newsletter = true, notes, role = 'MEMBER',
      driverLicense, licenseExpiryDate, medicalCertificateDate,
      emergencyContact, emergencyPhone, driverCertifications = [],
      vehicleAuthorizations = [], maxPassengers, driverNotes
    } = req.body;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({ error: 'Prénom, nom et email requis' });
    }

    // Check if email already exists
    const existingMember = await prisma.member.findUnique({ where: { email } });
    if (existingMember) {
      return res.status(409).json({ error: 'Un adhérent avec cet email existe déjà' });
    }

    // Generate unique member number
    const year = new Date().getFullYear();
    const lastMember = await prisma.member.findFirst({
      where: { memberNumber: { startsWith: `${year}-` } },
      orderBy: { memberNumber: 'desc' }
    });

    let memberNumber = `${year}-001`;
    if (lastMember) {
      const lastNumber = parseInt(lastMember.memberNumber.split('-')[1]);
      memberNumber = `${year}-${String(lastNumber + 1).padStart(3, '0')}`;
    }

    const member = await prisma.member.create({
      data: {
        memberNumber,
        firstName,
        lastName,
        email,
        phone,
        address,
        city,
        postalCode,
        birthDate: birthDate ? new Date(birthDate) : null,
        membershipType,
        membershipStatus,
        renewalDate: renewalDate ? new Date(renewalDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        paymentAmount: paymentAmount ? parseFloat(paymentAmount) : null,
        paymentMethod,
        hasExternalAccess,
        hasInternalAccess,
        newsletter,
        notes,
        role,
        driverLicense,
        licenseExpiryDate: licenseExpiryDate ? new Date(licenseExpiryDate) : null,
        medicalCertificateDate: medicalCertificateDate ? new Date(medicalCertificateDate) : null,
        emergencyContact,
        emergencyPhone,
        driverCertifications,
        vehicleAuthorizations,
        maxPassengers: maxPassengers ? parseInt(maxPassengers) : null,
        driverNotes,
        createdBy: req.user?.username || 'system',
        lastPaymentDate: paymentAmount ? new Date() : null
      }
    });

    // Don't return password
    const { internalPassword, ...memberData } = member;
    res.status(201).json(memberData);
  } catch (e) {
    console.error('Erreur création adhérent (/api):', e);
    res.status(500).json({ error: 'Erreur lors de la création de l\'adhérent' });
  }
});

// PUT /api/members/:id - Update member
app.put('/api/members/:id', authenticateToken, async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Convert dates if necessary
    if (updateData.birthDate) updateData.birthDate = new Date(updateData.birthDate);
    if (updateData.renewalDate) updateData.renewalDate = new Date(updateData.renewalDate);
    if (updateData.licenseExpiryDate) updateData.licenseExpiryDate = new Date(updateData.licenseExpiryDate);
    if (updateData.medicalCertificateDate) updateData.medicalCertificateDate = new Date(updateData.medicalCertificateDate);
    if (updateData.paymentAmount) updateData.paymentAmount = parseFloat(updateData.paymentAmount);
    if (updateData.maxPassengers) updateData.maxPassengers = parseInt(updateData.maxPassengers);

    // Don't allow modification of member number via this route
    delete updateData.memberNumber;
    delete updateData.internalPassword; // Security

    const member = await prisma.member.update({
      where: { id },
      data: updateData
    });

    const { internalPassword, ...memberData } = member;
    res.json(memberData);
  } catch (e) {
    console.error('Erreur mise à jour adhérent (/api):', e);
    if (e.code === 'P2025') {
      return res.status(404).json({ error: 'Adhérent non trouvé' });
    }
    res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'adhérent' });
  }
});

app.delete('/api/members/:id', authenticateToken, async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    await prisma.member.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true });
  } catch (e) {
    console.error('Erreur suppression adhérent (/api):', e);
    if (e.code === 'P2025') {
      return res.status(404).json({ error: 'Adhérent non trouvé' });
    }
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'adhérent' });
  }
});

app.get('/api/members/:id', authenticateToken, async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const member = await prisma.member.findUnique({
      where: { id: req.params.id }
    });

    if (!member) {
      return res.status(404).json({ error: 'Adhérent non trouvé' });
    }

    const { internalPassword, ...memberData } = member;
    res.json(memberData);
  } catch (e) {
    console.error('Erreur récupération adhérent (/api):', e);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'adhérent' });
  }
});

// GET /api/members/stats - Member statistics
app.get('/api/members/stats', authenticateToken, async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const [
      totalMembers,
      activeMembers,
      expiredMembers,
      pendingMembers,
      membersWithInternalAccess,
      recentJoins,
      drivers
    ] = await Promise.all([
      prisma.member.count(),
      prisma.member.count({ where: { membershipStatus: 'ACTIVE' } }),
      prisma.member.count({ where: { membershipStatus: 'EXPIRED' } }),
      prisma.member.count({ where: { membershipStatus: 'PENDING' } }),
      prisma.member.count({ where: { hasInternalAccess: true } }),
      prisma.member.count({
        where: { joinDate: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
      }),
      prisma.member.count({ where: { role: 'DRIVER' } })
    ]);

    res.json({
      totalMembers,
      activeMembers,
      expiredMembers,
      pendingMembers,
      membersWithInternalAccess,
      recentJoins,
      drivers
    });
  } catch (e) {
    console.error('Erreur statistiques adhérents (/api):', e);
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
  }
});

// Routes pour les documents
app.get('/api/documents/member/:memberId', authenticateToken, documentsAPI.getByMember);
app.post('/api/documents/member/:memberId/upload', authenticateToken, upload.single('document'), documentsAPI.upload);
app.get('/api/documents/:documentId/download', authenticateToken, documentsAPI.download);
app.put('/api/documents/:documentId/status', authenticateToken, documentsAPI.updateStatus);
app.delete('/api/documents/:documentId', authenticateToken, documentsAPI.delete);
app.get('/api/documents/expiring', authenticateToken, documentsAPI.getExpiring);

// Routes pour la réinitialisation de mot de passe
app.post('/api/password-reset/request/:memberId', authenticateToken, passwordResetAPI.requestReset);
app.get('/api/password-reset/validate/:token', passwordResetAPI.validateToken);
app.post('/api/password-reset/reset/:token', passwordResetAPI.resetPassword);
app.post('/api/password-reset/generate-temporary/:memberId', authenticateToken, passwordResetAPI.generateTemporaryPassword);

// ---------- Server start ----------
app.listen(PORT, () => {
  console.log(`🚀 API Server running on http://localhost:${PORT}`);
  console.log('Boot API (newsletter debug) build=', new Date().toISOString());
});

export default app;

// ---------- Inscriptions et billets ----------

// Modèle pour les inscriptions
// Vous devez d'abord ajouter cette table à votre schema.prisma :
/*
model EventRegistration {
  id                String   @id @default(cuid())
  eventId           String
  participantName   String
  participantEmail  String
  helloAssoOrderId  String?  // ID de commande HelloAsso
  helloAssoStatus   String?  // PENDING, VALIDATED, CANCELLED
  adultTickets      Int      @default(0)
  childTickets      Int      @default(0)
  totalAmount       Float?
  paymentMethod     String   // "helloasso", "internal", "free"
  registrationDate  DateTime @default(now())
  ticketSent        Boolean  @default(false)
  qrCodeData        String?  // JSON du QR code
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  @@index([eventId])
  @@index([participantEmail])
  @@index([helloAssoOrderId])
}
*/

// Endpoint pour créer une inscription
app.post('/registrations', async (req, res) => {
  try {
    const { eventId, participantName, participantEmail, adultTickets = 1, childTickets = 0, paymentMethod = 'internal' } = req.body;
    
    if (!eventId || !participantName || !participantEmail) {
      return res.status(400).json({ error: 'Données manquantes' });
    }
    
    // Vérifier que l'événement existe et est accessible
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return res.status(404).json({ error: 'Événement non trouvé' });
    }
    
    // Calculer le montant total
    const totalAmount = (event.adultPrice || 0) * adultTickets + (event.childPrice || 0) * childTickets;
    
    // Créer l'inscription
    const registration = await prisma.eventRegistration.create({
      data: {
        eventId,
        participantName,
        participantEmail,
        adultTickets,
        childTickets,
        totalAmount,
        paymentMethod,
        helloAssoStatus: paymentMethod === 'helloasso' ? 'PENDING' : 'VALIDATED'
      }
    });
    
    // Si c'est gratuit ou interne, générer le billet immédiatement
    if (paymentMethod === 'free' || paymentMethod === 'internal') {
      await generateAndSendTicket(registration.id);
    }
    
    res.status(201).json({
      registrationId: registration.id,
      helloAssoUrl: paymentMethod === 'helloasso' ? event.helloAssoUrl : null,
      totalAmount,
      status: registration.helloAssoStatus
    });
    
  } catch (e) {
    console.error('Erreur création inscription:', e);
    res.status(500).json({ error: 'Erreur lors de la création de l\'inscription' });
  }
});

// Webhook HelloAsso (appelé par HelloAsso après un paiement)
app.post('/webhooks/helloasso', async (req, res) => {
  try {
    console.log('🔔 Webhook HelloAsso reçu:', req.body);
    
    const { data } = req.body;
    const { order } = data;
    
    if (!order || !order.id) {
      return res.status(400).json({ error: 'Données webhook invalides' });
    }
    
    // Trouver l'inscription correspondante
    const registration = await prisma.eventRegistration.findFirst({
      where: { helloAssoOrderId: order.id.toString() }
    });
    
    if (!registration) {
      console.log('⚠️ Inscription non trouvée pour order ID:', order.id);
      return res.status(404).json({ error: 'Inscription non trouvée' });
    }
    
    // Mettre à jour le statut selon HelloAsso
    const newStatus = order.state === 'Authorized' ? 'VALIDATED' : 'PENDING';
    
    await prisma.eventRegistration.update({
      where: { id: registration.id },
      data: { helloAssoStatus: newStatus }
    });
    
    // Si validé, générer et envoyer le billet
    if (newStatus === 'VALIDATED' && !registration.ticketSent) {
      await generateAndSendTicket(registration.id);
    }
    
    res.status(200).json({ success: true });
    
  } catch (e) {
    console.error('Erreur webhook HelloAsso:', e);
    res.status(500).json({ error: 'Erreur traitement webhook' });
  }
});

// Endpoint pour vérifier le statut d'une inscription
app.get('/registrations/:id/status', async (req, res) => {
  try {
    const registration = await prisma.eventRegistration.findUnique({
      where: { id: req.params.id },
      include: {
        event: {
          select: { title: true, date: true, time: true, location: true }
        }
      }
    });
    
    if (!registration) {
      return res.status(404).json({ error: 'Inscription non trouvée' });
    }
    
    res.json({
      id: registration.id,
      status: registration.helloAssoStatus,
      ticketSent: registration.ticketSent,
      event: registration.event,
      qrCode: registration.qrCodeData
    });
    
  } catch (e) {
    console.error('Erreur vérification statut:', e);
    res.status(500).json({ error: 'Erreur lors de la vérification' });
  }
});

// Fonction pour générer et envoyer un billet
async function generateAndSendTicket(registrationId) {
  try {
    const registration = await prisma.eventRegistration.findUnique({
      where: { id: registrationId },
      include: { event: true }
    });
    
    if (!registration || registration.ticketSent) {
      return;
    }
    
    // Générer les données du QR Code
    const qrCodeData = {
      registrationId: registration.id,
      eventId: registration.eventId,
      eventTitle: registration.event.title,
      eventDate: registration.event.date,
      eventTime: registration.event.time,
      eventLocation: registration.event.location,
      participantName: registration.participantName,
      participantEmail: registration.participantEmail,
      adultTickets: registration.adultTickets,
      childTickets: registration.childTickets,
      totalAmount: registration.totalAmount,
      validationCode: generateValidationCode(),
      issueDate: new Date().toISOString()
    };
    
    // Sauvegarder les données du QR Code
    await prisma.eventRegistration.update({
      where: { id: registrationId },
      data: { 
        qrCodeData: JSON.stringify(qrCodeData),
        ticketSent: true 
      }
    });
    
    // Envoyer l'email avec le billet
    await sendTicketEmail(registration, qrCodeData);
    
    console.log(`✅ Billet envoyé pour inscription ${registrationId}`);
    
  } catch (e) {
    console.error('Erreur génération billet:', e);
  }
}

// Fonction pour générer un code de validation unique
function generateValidationCode() {
  return `RBE-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
}

// Fonction pour envoyer l'email avec le billet
async function sendTicketEmail(registration, qrCodeData) {
  try {
    // URL du QR Code généré
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=512x512&format=png&data=${encodeURIComponent(JSON.stringify(qrCodeData))}`;
    
    // Template d'email pour le billet
    const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Votre billet RétroBus Essonne</title>
        <style>
            body { font-family: 'Montserrat', Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #be003c 0%, #e40045 100%); color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; }
            .ticket-info { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .qr-section { text-align: center; margin: 30px 0; }
            .qr-code { border: 3px solid #be003c; border-radius: 12px; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎫 Votre Billet RétroBus</h1>
                <p>Association RétroBus Essonne</p>
            </div>
            
            <div class="content">
                <h2>Bonjour ${registration.participantName},</h2>
                <p>Votre inscription à l'événement <strong>${registration.event.title}</strong> a été confirmée !</p>
                
                <div class="ticket-info">
                    <h3>📅 Détails de votre réservation</h3>
                    <p><strong>Événement :</strong> ${registration.event.title}</p>
                    <p><strong>Date :</strong> ${registration.event.date} ${registration.event.time ? `à ${registration.event.time}` : ''}</p>
                    <p><strong>Lieu :</strong> ${registration.event.location || 'À préciser'}</p>
                    <p><strong>Nombre de billets :</strong> ${registration.adultTickets} adulte(s) + ${registration.childTickets} enfant(s)</p>
                    ${registration.totalAmount > 0 ? `<p><strong>Montant payé :</strong> ${registration.totalAmount}€</p>` : '<p><strong>Événement gratuit</strong></p>'}
                    <p><strong>Code de validation :</strong> ${qrCodeData.validationCode}</p>
                </div>
                
                <div class="qr-section">
                    <h3>🎫 Votre billet électronique</h3>
                    <p>Présentez ce QR Code à l'entrée de l'événement :</p>
                    <img src="${qrCodeUrl}" alt="QR Code billet" class="qr-code" width="256" height="256">
                </div>
                
                <p><strong>Important :</strong> Conservez ce billet et présentez-le à l'entrée. Une pièce d'identité pourra vous être demandée.</p>
            </div>
            
            <div class="footer">
                <p>Association RétroBus Essonne | Email: association.rbe@gmail.com</p>
                <p>Ce billet est personnel et non transférable.</p>
            </div>
        </div>
    </body>
    </html>
    `;
    
    // Ici, vous devriez utiliser votre service d'email (Nodemailer, SendGrid, etc.)
    console.log('📧 Email billet préparé pour:', registration.participantEmail);
    console.log('QR Code URL:', qrCodeUrl);
    
    // Simulation de l'envoi d'email
    // await emailService.send({
    //   to: registration.participantEmail,
    //   subject: `🎫 Votre billet - ${registration.event.title}`,
    //   html: emailHtml
    // });
    
  } catch (e) {
    console.error('Erreur envoi email billet:', e);
  }
}

// ---------- Gestion des Adhérents ----------

// Récupérer tous les adhérents avec pagination et filtres
app.get('/members', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const { page = 1, limit = 20, status, search, sort = 'lastName' } = req.query;
    const offset = (page - 1) * limit;
    
    // Construire les filtres
    const where = {};
    if (status && status !== 'ALL') where.membershipStatus = status;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { memberNumber: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    // Définir l'ordre de tri
    const orderBy = {};
    if (sort === 'lastName') orderBy.lastName = 'asc';
    else if (sort === 'joinDate') orderBy.joinDate = 'desc';
    else if (sort === 'renewalDate') orderBy.renewalDate = 'asc';
    else if (sort === 'memberNumber') orderBy.memberNumber = 'asc';
    
    const [members, total] = await Promise.all([
      prisma.member.findMany({
        where,
        orderBy,
        skip: parseInt(offset),
        take: parseInt(limit),
        select: {
          id: true,
          memberNumber: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          membershipType: true,
          membershipStatus: true,
          joinDate: true,
          renewalDate: true,
          hasExternalAccess: true,
          hasInternalAccess: true,
          newsletter: true,
          lastPaymentDate: true,
          paymentAmount: true,
          paymentMethod: true
        }
      }),
      prisma.member.count({ where })
    ]);
    
    res.json({
      members,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (e) {
    console.error('Erreur récupération adhérents:', e);
    res.status(500).json({ error: 'Erreur lors de la récupération des adhérents' });
  }
});

// Créer un nouvel adhérent
app.post('/members', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const {
      firstName, lastName, email, phone, address, city, postalCode,
      birthDate, membershipType = 'STANDARD', membershipStatus = 'PENDING',
      renewalDate, paymentAmount, paymentMethod, hasExternalAccess = false,
      hasInternalAccess = false, newsletter = true, notes
    } = req.body;
    
    if (!firstName || !lastName || !email) {
      return res.status(400).json({ error: 'Prénom, nom et email requis' });
    }
    
    // Vérifier si l'email existe déjà
    const existingMember = await prisma.member.findUnique({
      where: { email }
    });
    
    if (existingMember) {
      return res.status(409).json({ error: 'Un adhérent avec cet email existe déjà' });
    }
    
    // Générer un numéro d'adhérent unique
    const year = new Date().getFullYear();
    const lastMember = await prisma.member.findFirst({
      where: { memberNumber: { startsWith: `${year}-` } },
      orderBy: { memberNumber: 'desc' }
    });
    
    let memberNumber;
    if (lastMember) {
      const lastNumber = parseInt(lastMember.memberNumber.split('-')[1]);
      memberNumber = `${year}-${String(lastNumber + 1).padStart(3, '0')}`;
    } else {
      memberNumber = `${year}-001`;
    }
    
    const member = await prisma.member.create({
      data: {
        memberNumber,
        firstName,
        lastName,
        email,
        phone,
        address,
        city,
        postalCode,
        birthDate: birthDate ? new Date(birthDate) : null,
        membershipType,
        membershipStatus,
        renewalDate: renewalDate ? new Date(renewalDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // +1 an par défaut
        paymentAmount: paymentAmount ? parseFloat(paymentAmount) : null,
        paymentMethod,
        hasExternalAccess,
        hasInternalAccess,
        newsletter,
        notes,
        createdBy: req.user?.username || 'system',
        lastPaymentDate: paymentAmount ? new Date() : null
      }
    });
    
    // Ne pas renvoyer le mot de passe
    const { internalPassword, ...memberData } = member;
    res.status(201).json(memberData);
  } catch (e) {
    console.error('Erreur création adhérent:', e);
    res.status(500).json({ error: 'Erreur lors de la création de l\'adhérent' });
  }
});

// Mettre à jour un adhérent
app.put('/members/:id', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    
    // Convertir les dates si nécessaire
    if (updateData.birthDate) updateData.birthDate = new Date(updateData.birthDate);
    if (updateData.renewalDate) updateData.renewalDate = new Date(updateData.renewalDate);
    if (updateData.paymentAmount) updateData.paymentAmount = parseFloat(updateData.paymentAmount);
    
    // Ne pas permettre la modification du numéro d'adhérent via cette route
    delete updateData.memberNumber;
    delete updateData.internalPassword; // Sécurité
    
    const member = await prisma.member.update({
      where: { id },
      data: updateData
    });
    
    const { internalPassword, ...memberData } = member;
    res.json(memberData);
  } catch (e) {
    console.error('Erreur mise à jour adhérent:', e);
    if (e.code === 'P2025') {
      return res.status(404).json({ error: 'Adhérent non trouvé' });
    }
    res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'adhérent' });
  }
});

app.delete('/members/:id', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    await prisma.member.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true });
  } catch (e) {
    console.error('Erreur suppression adhérent:', e);
    if (e.code === 'P2025') {
      return res.status(404).json({ error: 'Adhérent non trouvé' });
    }
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'adhérent' });
  }
});

// --- API-prefixed aliases for production proxies ---

app.get('/api/members', authenticateToken, async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const { page = 1, limit = 20, status, search, sort = 'lastName' } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (status && status !== 'ALL') where.membershipStatus = status;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { memberNumber: { contains: search, mode: 'insensitive' } }
      ];
    }

    const orderBy = {};
    if (sort === 'lastName') orderBy.lastName = 'asc';
    else if (sort === 'joinDate') orderBy.joinDate = 'desc';
    else if (sort === 'renewalDate') orderBy.renewalDate = 'asc';
    else if (sort === 'memberNumber') orderBy.memberNumber = 'asc';

    const [members, total] = await Promise.all([
      prisma.member.findMany({
        where,
        orderBy,
        skip: parseInt((page - 1) * limit),
        take: parseInt(limit),
        select: {
          id: true,
          memberNumber: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          membershipType: true,
          membershipStatus: true,
          joinDate: true,
          renewalDate: true,
          hasExternalAccess: true,
          hasInternalAccess: true,
          newsletter: true,
          lastPaymentDate: true,
          paymentAmount: true,
          paymentMethod: true
        }
      }),
      prisma.member.count({ where })
    ]);

    res.json({
      members,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (e) {
    console.error('Erreur récupération adhérents (/api):', e);
    res.status(500).json({ error: 'Erreur lors de la récupération des adhérents' });
  }
});

app.post('/api/members', authenticateToken, async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const {
      firstName, lastName, email, phone, address, city, postalCode,
      birthDate, membershipType = 'STANDARD', membershipStatus = 'PENDING',
      renewalDate, paymentAmount, paymentMethod, hasExternalAccess = false,
      hasInternalAccess = false, newsletter = true, notes
    } = req.body;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({ error: 'Prénom, nom et email requis' });
    }

    const existingMember = await prisma.member.findUnique({ where: { email } });
    if (existingMember) return res.status(409).json({ error: 'Un adhérent avec cet email existe déjà' });

    const year = new Date().getFullYear();
    const lastMember = await prisma.member.findFirst({
      where: { memberNumber: { startsWith: `${year}-` } },
      orderBy: { memberNumber: 'desc' }
    });
    let memberNumber = `${year}-001`;
    if (lastMember) {
      const lastNumber = parseInt(lastMember.memberNumber.split('-')[1]);
      memberNumber = `${year}-${String(lastNumber + 1).padStart(3, '0')}`;
    }

    const member = await prisma.member.create({
      data: {
        memberNumber,
        firstName,
        lastName,
        email,
        phone,
        address,
        city,
        postalCode,
        birthDate: birthDate ? new Date(birthDate) : null,
        membershipType,
        membershipStatus,
        renewalDate: renewalDate ? new Date(renewalDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        paymentAmount: paymentAmount ? parseFloat(paymentAmount) : null,
        paymentMethod,
        hasExternalAccess,
        hasInternalAccess,
        newsletter,
        notes,
        createdBy: req.user?.username || 'system',
        lastPaymentDate: paymentAmount ? new Date() : null
      }
    });

    const { internalPassword, ...memberData } = member;
    res.status(201).json(memberData);
  } catch (e) {
    console.error('Erreur création adhérent (/api):', e);
    res.status(500).json({ error: 'Erreur lors de la création de l\'adhérent' });
  }
});

app.put('/api/members/:id', authenticateToken, async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    if (updateData.birthDate) updateData.birthDate = new Date(updateData.birthDate);
    if (updateData.renewalDate) updateData.renewalDate = new Date(updateData.renewalDate);
    if (updateData.paymentAmount) updateData.paymentAmount = parseFloat(updateData.paymentAmount);
    delete updateData.memberNumber;
    delete updateData.internalPassword;

    const member = await prisma.member.update({ where: { id }, data: updateData });
    const { internalPassword, ...memberData } = member;
    res.json(memberData);
  } catch (e) {
    console.error('Erreur mise à jour adhérent (/api):', e);
    if (e.code === 'P2025') return res.status(404).json({ error: 'Adhérent non trouvé' });
    res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'adhérent' });
  }
});

app.delete('/api/members/:id', authenticateToken, async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    await prisma.member.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) {
    console.error('Erreur suppression adhérent (/api):', e);
    if (e.code === 'P2025') return res.status(404).json({ error: 'Adhérent non trouvé' });
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'adhérent' });
  }
});

app.get('/api/members/stats', authenticateToken, async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const [
      totalMembers,
      activeMembers,
      expiredMembers,
      pendingMembers,
      membersWithInternalAccess,
      recentJoins,
      drivers
    ] = await Promise.all([
      prisma.member.count(),
      prisma.member.count({ where: { membershipStatus: 'ACTIVE' } }),
      prisma.member.count({ where: { membershipStatus: 'EXPIRED' } }),
      prisma.member.count({ where: { membershipStatus: 'PENDING' } }),
      prisma.member.count({ where: { hasInternalAccess: true } }),
      prisma.member.count({
        where: { joinDate: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
      }),
      prisma.member.count({ where: { role: 'DRIVER' } })
    ]);

    res.json({
      totalMembers,
      activeMembers,
      expiredMembers,
      pendingMembers,
      membersWithInternalAccess,
      recentJoins,
      drivers
    });
  } catch (e) {
    console.error('Erreur statistiques adhérents (/api):', e);
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
  }
});

// Routes pour les documents
app.get('/api/documents/member/:memberId', authenticateToken, documentsAPI.getByMember);
app.post('/api/documents/member/:memberId/upload', authenticateToken, upload.single('document'), documentsAPI.upload);
app.get('/api/documents/:documentId/download', authenticateToken, documentsAPI.download);
app.put('/api/documents/:documentId/status', authenticateToken, documentsAPI.updateStatus);
app.delete('/api/documents/:documentId', authenticateToken, documentsAPI.delete);
app.get('/api/documents/expiring', authenticateToken, documentsAPI.getExpiring);

// Routes pour la réinitialisation de mot de passe
app.post('/api/password-reset/request/:memberId', authenticateToken, passwordResetAPI.requestReset);
app.get('/api/password-reset/validate/:token', passwordResetAPI.validateToken);
app.post('/api/password-reset/reset/:token', passwordResetAPI.resetPassword);
app.post('/api/password-reset/generate-temporary/:memberId', authenticateToken, passwordResetAPI.generateTemporaryPassword);
