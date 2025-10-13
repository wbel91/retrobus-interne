// Load env early
import 'dotenv/config';

import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import multer from 'multer';
import QRCode from 'qrcode';
import { PrismaClient } from '@prisma/client';

// Local modules
import { documentsAPI as docsAPI, upload as documentsUpload } from './documents.js';
import * as newsletterService from './newsletter-service.js';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
app.set('trust proxy', 1);

// ---------- CORS (dynamic + credentials-safe) ----------
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowed = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  // Allow listed origins with credentials; otherwise, allow public but without credentials
  const isAllowed = origin && (allowed.length === 0 || allowed.includes(origin));

  if (isAllowed && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');

  const reqHeaders = req.headers['access-control-request-headers'];
  res.setHeader(
    'Access-Control-Allow-Headers',
    reqHeaders || 'Content-Type, Authorization, X-Requested-With, Accept'
  );

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  return next();
});

// ---------- Parsers ----------
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// ---------- Prisma ----------
let prisma;
try {
  prisma = new PrismaClient();
  console.log('✅ Prisma Client initialized');
} catch (error) {
  console.error('❌ Failed to initialize Prisma Client:', error);
  prisma = null;
}

const ensureDB = (res) => {
  if (!prisma) {
    console.error('Prisma non initialisé');
    res.status(500).json({ error: 'Database not initialized' });
    return false;
  }
  return true;
};

// ---------- Utils JSON ----------
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
  if (field === null || field === undefined) return null;
  if (typeof field === 'string') return field;
  try {
    return JSON.stringify(field);
  } catch {
    return null;
  }
};

const API_BASE = process.env.PUBLIC_API_BASE || '';

function absolutize(p) {
  if (!p) return p;
  if (
    p.startsWith('http://') ||
    p.startsWith('https://') ||
    p.startsWith('data:') ||
    p.startsWith('blob:')
  ) return p;
  if (!API_BASE) return p;
  if (p.startsWith('/')) return `${API_BASE}${p}`;
  return p;
}

// ---------- Auth JWT ----------
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

// Alias conservé
const authenticateToken = requireAuth;

// Optional admin users via ENV (prevents /auth/login crash if called)
let USERS = {};
try {
  USERS = JSON.parse(process.env.ADMIN_USERS || '{}');
} catch {
  USERS = {};
}

// ---------- Health ----------
app.get('/health', async (_req, res) => {
  let db = 'down';
  if (prisma) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      db = 'up';
    } catch {
      db = 'down';
    }
  }
  res.json({ status: 'ok', port: PORT, db });
});

app.get('/public/health', async (_req, res) => {
  let db = 'down';
  if (prisma) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      db = 'up';
    } catch {
      db = 'down';
    }
  }
  res.json({ status: 'ok', port: PORT, db });
});

// Optional ultra-light ping for debugging
app.get('/public/ping', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// ---------- Transforms ----------
function toText(v) {
  if (v == null) return '';
  if (Array.isArray(v)) return v.map(toText).join(', ');
  if (typeof v === 'object') return Object.values(v).map(toText).join(', ');
  return String(v);
}

const transformVehicle = (vehicle) => {
  if (!vehicle) return null;
  let caract = [];
  try { 
    const parsed = vehicle.caracteristiques ? JSON.parse(vehicle.caracteristiques) : [];
    
    if (Array.isArray(parsed)) {
      // Format label/value - garder tel quel en normalisant
      caract = parsed
        .filter(it => it && (it.label != null || it.value != null))
        .map(it => ({ label: toText(it.label), value: toText(it.value) }));
    } else if (typeof parsed === 'object' && parsed) {
      // Format objet legacy -> convertir en label/value en ignorant les clés parasites
      caract = Object.entries(parsed)
        .filter(([key]) => key !== 'label' && key !== 'value')
        .map(([key, value]) => ({
          label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
          value: toText(value)
        }));
    }
  } catch(e) {
    console.error('Erreur parsing caracteristiques:', e);
    caract = [];
  }

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
    vehicleId: evt.vehicleId,
    status: evt.status,
    layout: evt.layout,
    extras: evt.extras,
    createdAt: evt.createdAt,
    updatedAt: evt.updatedAt
  };
};

// ---------- Auth routes ----------
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

// Connexion membre (matricule/email + mot de passe interne)
app.post('/auth/member-login', async (req, res) => {
  if (!ensureDB(res)) return;
  
  try {
    const { matricule, password } = req.body;

    if (!matricule || !password) {
      return res.status(400).json({ error: 'Matricule et mot de passe requis' });
    }

    // Trouver le membre
    const member = await prisma.member.findUnique({
      where: { matricule }
    });

    if (!member || !member.loginEnabled) {
      return res.status(401).json({ error: 'Matricule invalide ou accès désactivé' });
    }

    // Vérifier verrouillage
    if (member.lockedUntil && member.lockedUntil > new Date()) {
      return res.status(423).json({ 
        error: 'Compte temporairement verrouillé. Réessayez plus tard.' 
      });
    }

    // Vérifier mot de passe
    const passwordToCheck = member.temporaryPassword || member.internalPassword;
    if (!passwordToCheck || !(await verifyPassword(password, passwordToCheck))) {
      // Incrémenter tentatives échouées
      const attempts = member.loginAttempts + 1;
      const lockedUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null; // 15 min

      await prisma.member.update({
        where: { id: member.id },
        data: {
          loginAttempts: attempts,
          lockedUntil
        }
      });

      return res.status(401).json({ error: 'Mot de passe incorrect' });
    }

    // Connexion réussie - réinitialiser tentatives
    await prisma.member.update({
      where: { id: member.id },
      data: {
        loginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date()
      }
    });

    // Générer token JWT
    const token = issueToken({
      userId: member.id,
      username: member.matricule,
      role: member.role,
      type: 'member'
    });

    res.json({
      token,
      user: {
        id: member.id,
        username: member.matricule,
        prenom: member.firstName,
        nom: member.lastName,
        email: member.email,
        role: member.role,
        matricule: member.matricule,
        mustChangePassword: member.mustChangePassword,
        roles: [member.role] // Compatibilité avec le système existant
      }
    });

  } catch (error) {
    console.error('Error in member login:', error);
    res.status(500).json({ error: 'Erreur de connexion' });
  }
});

// Profil membre courant
app.get('/api/me', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    if (req.user.type === 'member') {
      // Utilisateur membre connecté via matricule
      const member = await prisma.member.findUnique({ where: { id: req.user.userId } });
      if (!member) return res.status(404).json({ error: 'Membre introuvable' });
      
      res.json({
        id: member.id,
        username: member.matricule,
        prenom: member.firstName,
        nom: member.lastName,
        email: member.email,
        role: member.role,
        matricule: member.matricule,
        mustChangePassword: member.mustChangePassword,
        roles: [member.role]
      });
    } else {
      // Utilisateur admin classique - logique existante
      res.json({
        username: req.user.username,
        prenom: req.user.prenom || '',
        nom: req.user.nom || '',
        roles: req.user.roles || []
      });
    }
  } catch (e) {
    console.error('Erreur /api/me:', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ---------- Vehicles (private) ----------
app.get('/vehicles', requireAuth, async (_req, res) => {
  if (!ensureDB(res)) return;
  try {
    const vehicles = await prisma.vehicle.findMany({ orderBy: { parc: 'asc' } });
    res.json(vehicles.map(transformVehicle));
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
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
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

    if (!parc) return res.status(400).json({ error: 'parc requis' });

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
    if (!existing) return res.status(404).json({ error: 'Vehicle not found' });

    let caract = {};
    if (existing.caracteristiques) {
      try { caract = JSON.parse(existing.caracteristiques) || {}; } catch {}
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
      if (body[frontKey] !== undefined) dataUpdate[dbKey] = body[frontKey] || null;
    });

    if (body.miseEnCirculation !== undefined) {
      dataUpdate.miseEnCirculation = body.miseEnCirculation
        ? new Date(body.miseEnCirculation)
        : null;
    }

    // 1) On met à jour les anciennes clés techniques si présentes (optionnel)
    caractKeys.forEach(k => {
      if (body[k] !== undefined) caract[k] = body[k] || null;
    });

    // 2) NOUVEAU: si on reçoit un tableau [{label, value}], on l’enregistre tel quel
    let wroteArrayCaracteristiques = false;
    if (Array.isArray(body.caracteristiques)) {
      const normalized = body.caracteristiques
        .filter(it => it && (it.label != null || it.value != null))
        .map(it => ({
          label: String(it.label ?? '').trim(),
          value: String(it.value ?? '').trim()
        }));
      dataUpdate.caracteristiques = JSON.stringify(normalized);
      wroteArrayCaracteristiques = true;
    }

    if (body.backgroundImage !== undefined) dataUpdate.backgroundImage = body.backgroundImage || null;
    if (body.backgroundPosition !== undefined) dataUpdate.backgroundPosition = body.backgroundPosition || null;

    // 3) Si on n’a pas écrit le tableau, on retombe sur l’ancien format objet (compat legacy)
    if (!wroteArrayCaracteristiques) {
      dataUpdate.caracteristiques = Object.keys(caract).length
        ? JSON.stringify(caract)
        : null;
    }

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
app.post('/vehicles/:parc/gallery', requireAuth, documentsUpload.array('images', 10), async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const { parc } = req.params;
    const v = await prisma.vehicle.findUnique({ where: { parc } });
    if (!v) return res.status(404).json({ error: 'Vehicle not found' });

    const existingGallery = parseJsonField(v.gallery);
    const existing = Array.isArray(existingGallery) ? existingGallery : [];

    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ error: 'Aucun fichier reçu' });
    }

    const added = files.map(file => {
      const base64 = file.buffer.toString('base64');
      const mimeType = file.mimetype || 'image/jpeg';
      return `data:${mimeType};base64,${base64}`;
    });

    const MAX_GALLERY_IMAGES = 12;
    // dédup simple si jamais une même image est renvoyée plusieurs fois
    const gallery = Array.from(new Set(existing.concat(added))).slice(0, MAX_GALLERY_IMAGES);

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

app.delete('/vehicles/:parc/gallery', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const { parc } = req.params;
    const { image } = req.body || {};
    if (!image) return res.status(400).json({ error: 'image requis' });

    const v = await prisma.vehicle.findUnique({ where: { parc } });
    if (!v) return res.status(404).json({ error: 'Vehicle not found' });

    const existingGallery = parseJsonField(v.gallery);
    const existing = Array.isArray(existingGallery) ? existingGallery : [];
    const updatedGallery = existing.filter(g => g !== image);

    const updated = await prisma.vehicle.update({
      where: { parc },
      data: { gallery: stringifyJsonField(updatedGallery) }
    });

    res.json({ gallery: parseJsonField(updated.gallery) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Delete gallery image failed' });
  }
});

app.post('/vehicles/:parc/background', requireAuth, documentsUpload.single('image'), async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const { parc } = req.params;
    if (!req.file) return res.status(400).json({ error: 'image requis' });

    const v = await prisma.vehicle.findUnique({ where: { parc } });
    if (!v) return res.status(404).json({ error: 'Vehicle not found' });

    const base64 = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype;
    const dataUrl = `data:${mimeType};base64,${base64}`;

    const updated = await prisma.vehicle.update({
      where: { parc },
      data: { backgroundImage: dataUrl }
    });

    res.json({ backgroundImage: updated.backgroundImage });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Upload background failed' });
  }
});

// ---------- Public vehicles ----------
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
    res.json(vehicles.map(transformVehicle));
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
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
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
    // Adjust if needed for prod external site
    const url = `https://www.association-rbe.fr/vehicule/${parc}`;
    const qr = await QRCode.toDataURL(url);
    res.json({ qrCode: qr, url });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'QR generation failed' });
  }
});

// ---------- Usages (private) ----------
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
    if (startedAt !== undefined) data.startedAt = startedAt ? new Date(startedAt) : null;
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

// ---------- Reports (private) ----------
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

// ---------- Flashes (public read) ----------
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

// ---------- Events (private) ----------
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
    if (!evt) return res.status(404).json({ error: 'Event not found' });
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
    if (!b.id) return res.status(400).json({ error: 'id requis' });

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
    if (e.code === 'P2002') return res.status(409).json({ error: 'Duplicate id' });
    res.status(500).json({ error: 'Event create failed' });
  }
});

app.put('/events/:id', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const existing = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Event not found' });
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
    if (!evt || evt.status !== 'PUBLISHED') return res.status(404).json({ error: 'Event not found' });
    res.json(transformEvent(evt));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Public event fetch failed' });
  }
});

// Events by vehicle (public)
app.get('/public/vehicles/:parc/events', async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const { parc } = req.params;
    const vehicle = await prisma.vehicle.findUnique({
      where: { parc },
      select: { parc: true }
    });
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    const events = await prisma.event.findMany({
      where: { vehicleId: parc, status: 'PUBLISHED' },
      orderBy: { date: 'asc' }
    });
    res.json(events.map(transformEvent));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch vehicle events' });
  }
});

// ---------- Newsletter (Prisma minimal) ----------
const transformSubscriber = (s) => ({
  id: s.id,
  email: s.email,
  status: s.status,
  createdAt: s.createdAt,
  updatedAt: s.updatedAt
});

// Liste complète (interne)
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

// Inscription publique
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
      return res.json({ ok: true, subscriber: transformSubscriber(existing) });
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
    if (e.code === 'P2002') return res.status(409).json({ error: 'Email déjà inscrit' });
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

app.get('/newsletter/stats', requireAuth, async (_req, res) => {
  if (!ensureDB(res)) return;
  try {
    const [total, confirmed, pending] = await Promise.all([
      prisma.newsletterSubscriber.count(),
      prisma.newsletterSubscriber.count({ where: { status: 'CONFIRMED' } }),
      prisma.newsletterSubscriber.count({ where: { status: 'PENDING' } })
    ]);
    res.json({ total, confirmed, pending });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Stats fetch failed' });
  }
});

app.put('/newsletter/:id/status', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const { status } = req.body || {};
    if (!['CONFIRMED', 'PENDING'].includes(status)) {
      return res.status(400).json({ error: 'Statut invalide' });
    }
    const updated = await prisma.newsletterSubscriber.update({
      where: { id: req.params.id },
      data: { status }
    });
    res.json(transformSubscriber(updated));
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Abonné introuvable' });
    console.error(e);
    res.status(500).json({ error: 'Status update failed' });
  }
});

app.get('/newsletter/export', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const { format = 'csv' } = req.query;
    const subscribers = await prisma.newsletterSubscriber.findMany({
      orderBy: { createdAt: 'desc' }
    });

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="subscribers.csv"');
      const lines = ['email,status,createdAt,updatedAt']
        .concat(
          subscribers.map(s =>
            [s.email, s.status, s.createdAt.toISOString(), s.updatedAt.toISOString()].join(',')
          )
        );
      res.send(lines.join('\n'));
    } else {
      res.json(subscribers.map(transformSubscriber));
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Export failed' });
  }
});

// ---------- Members API (prefix /api) ----------
app.get('/api/members', authenticateToken, async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const { page = 1, limit = 20, status, search, sort = 'lastName', role } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status && status !== 'ALL') where.membershipStatus = status;
    if (role && role !== 'ALL') where.role = role;
    if (search) {
      const s = String(search).trim();
      where.OR = [
        { firstName: { contains: s, mode: 'insensitive' } },
        { lastName: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
        { memberNumber: { contains: s, mode: 'insensitive' } },
      ];
    }

    const orderBy = {};
    if (sort === 'lastName') orderBy.lastName = 'asc';
    else if (sort === 'firstName') orderBy.firstName = 'asc';
    else orderBy.joinDate = 'desc';

    const [members, total] = await Promise.all([
      prisma.member.findMany({
        where,
        orderBy,
        skip: offset,
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
        pages: Math.ceil(total / parseInt(limit))
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
      hasInternalAccess = false, newsletter = true, notes, role = 'MEMBER',
      driverLicense, licenseExpiryDate, medicalCertificateDate,
      emergencyContact, emergencyPhone, driverCertifications = [],
      vehicleAuthorizations = [], maxPassengers, driverNotes
    } = req.body;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({ error: 'firstName, lastName, email requis' });
    }

    const existingMember = await prisma.member.findUnique({ where: { email } });
    if (existingMember) {
      return res.status(409).json({ error: 'Email déjà utilisé' });
    }

    const year = new Date().getFullYear();
    const lastMember = await prisma.member.findFirst({
      where: { memberNumber: { startsWith: `${year}-` } },
      orderBy: { memberNumber: 'desc' }
    });

    let memberNumber = `${year}-001`;
    if (lastMember) {
      const parts = lastMember.memberNumber.split('-');
      const seq = parseInt(parts[1] || '0') + 1;
      memberNumber = `${year}-${String(seq).padStart(3, '0')}`;
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

    if (updateData.birthDate) updateData.birthDate = updateData.birthDate ? new Date(updateData.birthDate) : null;
    if (updateData.renewalDate) updateData.renewalDate = updateData.renewalDate ? new Date(updateData.renewalDate) : null;
    if (updateData.licenseExpiryDate) updateData.licenseExpiryDate = updateData.licenseExpiryDate ? new Date(updateData.licenseExpiryDate) : null;
    if (updateData.medicalCertificateDate) updateData.medicalCertificateDate = updateData.medicalCertificateDate ? new Date(updateData.medicalCertificateDate) : null;
    if (updateData.paymentAmount) updateData.paymentAmount = parseFloat(updateData.paymentAmount);
    if (updateData.maxPassengers) updateData.maxPassengers = parseInt(updateData.maxPassengers);

    delete updateData.memberNumber;
    delete updateData.internalPassword;

    const member = await prisma.member.update({
      where: { id },
      data: updateData
    });

    const { internalPassword, ...memberData } = member;
    res.json(memberData);
  } catch (e) {
    console.error('Erreur mise à jour adhérent (/api):', e);
    if (e.code === 'P2025') return res.status(404).json({ error: 'Adhérent introuvable' });
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
    if (e.code === 'P2025') return res.status(404).json({ error: 'Adhérent introuvable' });
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'adhérent' });
  }
});

app.get('/api/members/:id', authenticateToken, async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const member = await prisma.member.findUnique({ where: { id: req.params.id } });
    if (!member) return res.status(404).json({ error: 'Adhérent introuvable' });
    const { internalPassword, ...memberData } = member;
    res.json(memberData);
  } catch (e) {
    console.error('Erreur récupération adhérent (/api):', e);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'adhérent' });
  }
});

app.get('/api/members/stats', authenticateToken, async (_req, res) => {
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
      prisma.member.count({ where: { joinDate: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }),
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

// ---------- Documents routes ----------
app.get('/api/documents/member/:memberId', authenticateToken, docsAPI.getByMember);
app.post('/api/documents/member/:memberId/upload', authenticateToken, documentsUpload.single('document'), docsAPI.upload);
app.get('/api/documents/:documentId/download', authenticateToken, docsAPI.download);
app.put('/api/documents/:documentId/status', authenticateToken, docsAPI.updateStatus);
app.delete('/api/documents/:documentId', authenticateToken, docsAPI.delete);
app.get('/api/documents/expiring', authenticateToken, docsAPI.getExpiring);

// ---------- Newsletter Campaigns (squelette) ----------
app.get('/newsletter/campaigns', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const { status } = req.query;
    const campaigns = await newsletterService.getCampaigns({ status });
    res.json(campaigns);
  } catch (e) {
    console.error('Erreur récupération campagnes:', e);
    res.status(500).json({ error: 'Erreur lors de la récupération des campagnes' });
  }
});

// Créer une nouvelle campagne
app.post('/newsletter/campaigns', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const { title, subject, content, scheduledAt } = req.body;
    
    if (!title || !subject || !content) {
      return res.status(400).json({ error: 'Titre, sujet et contenu requis' });
    }

    const campaign = await newsletterService.createCampaign({
      title,
      subject, 
      content,
      scheduledAt,
      createdBy: req.user?.id || 'admin'
    });

    res.status(201).json(campaign);
  } catch (e) {
    console.error('Erreur création campagne:', e);
    res.status(500).json({ error: 'Erreur lors de la création de la campagne' });
  }
});

// Récupérer une campagne spécifique
app.get('/newsletter/campaigns/:id', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const campaign = await newsletterService.getCampaignById(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Campagne non trouvée' });
    res.json(campaign);
  } catch (e) {
    console.error('Erreur récupération campagne:', e);
    res.status(500).json({ error: 'Erreur lors de la récupération de la campagne' });
  }
});

// Prévisualiser une campagne
app.get('/newsletter/campaigns/:id/preview', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const preview = await newsletterService.previewCampaign(req.params.id);
    res.json(preview);
  } catch (e) {
    console.error('Erreur prévisualisation:', e);
    res.status(500).json({ error: e.message });
  }
});

// Envoyer un email de test
app.post('/newsletter/campaigns/:id/test', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Email de test requis' });
    }

    await newsletterService.sendTestEmail(req.params.id, email);
    res.json({ success: true, message: 'Email de test envoyé' });
  } catch (e) {
    console.error('Erreur envoi test:', e);
    res.status(500).json({ error: e.message });
  }
});

// Préparer l'envoi d'une campagne
app.post('/newsletter/campaigns/:id/prepare', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const result = await newsletterService.prepareCampaignSend(req.params.id);
    res.json(result);
  } catch (e) {
    console.error('Erreur préparation envoi:', e);
    res.status(500).json({ error: e.message });
  }
});

// Envoyer une campagne
app.post('/newsletter/campaigns/:id/send', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const result = await newsletterService.sendCampaign(req.params.id);
    res.json(result);
  } catch (e) {
    console.error('Erreur envoi campagne:', e);
    res.status(500).json({ error: e.message });
  }
});

// Récupérer les statistiques d'une campagne
app.get('/newsletter/campaigns/:id/stats', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const stats = await newsletterService.getCampaignStats(req.params.id);
    res.json(stats);
  } catch (e) {
    console.error('Erreur statistiques campagne:', e);
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
  }
});

// Supprimer une campagne
app.delete('/newsletter/campaigns/:id', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    await newsletterService.deleteCampaign(req.params.id);
    res.json({ success: true });
  } catch (e) {
    console.error('Erreur suppression campagne:', e);
    res.status(500).json({ error: 'Erreur lors de la suppression de la campagne' });
  }
});

// ---------- Inscriptions et billets ----------
app.post('/registrations', async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const { eventId, participantName, participantEmail, adultTickets = 1, childTickets = 0, paymentMethod = 'internal' } = req.body || {};
    if (!eventId || !participantName || !participantEmail) {
      return res.status(400).json({ error: 'eventId, participantName, participantEmail requis' });
    }
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return res.status(404).json({ error: 'Événement introuvable' });

    const totalAmount = (event.adultPrice || 0) * adultTickets + (event.childPrice || 0) * childTickets;

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

app.post('/webhooks/helloasso', async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    console.log('🔔 Webhook HelloAsso reçu:', req.body);
    const { data } = req.body || {};
    const { order } = data || {};
    if (!order || !order.id) return res.status(400).json({ error: 'payload invalide' });

    const registration = await prisma.eventRegistration.findFirst({
      where: { helloAssoOrderId: order.id.toString() }
    });
    if (!registration) return res.status(404).json({ error: 'Inscription introuvable' });

    const newStatus = order.state === 'Authorized' ? 'VALIDATED' : 'PENDING';

    await prisma.eventRegistration.update({
      where: { id: registration.id },
      data: { helloAssoStatus: newStatus }
    });

    if (newStatus === 'VALIDATED' && !registration.ticketSent) {
      await generateAndSendTicket(registration.id);
    }

    res.status(200).json({ success: true });
  } catch (e) {
    console.error('Erreur webhook HelloAsso:', e);
    res.status(500).json({ error: 'Erreur traitement webhook' });
  }
});

app.get('/registrations/:id/status', async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const registration = await prisma.eventRegistration.findUnique({
      where: { id: req.params.id },
      include: {
        event: {
          select: { title: true, date: true, time: true, location: true }
        }
      }
    });
    if (!registration) return res.status(404).json({ error: 'Inscription introuvable' });
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

async function generateAndSendTicket(registrationId) {
  try {
    const registration = await prisma.eventRegistration.findUnique({
      where: { id: registrationId },
      include: { event: true }
    });

    if (!registration || registration.ticketSent) return;

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

    await prisma.eventRegistration.update({
      where: { id: registrationId },
      data: {
        qrCodeData: JSON.stringify(qrCodeData),
        ticketSent: true
      }
    });

    await sendTicketEmail(registration, qrCodeData);
    console.log(`✅ Billet envoyé pour inscription ${registrationId}`);
  } catch (e) {
    console.error('Erreur génération billet:', e);
  }
}

function generateValidationCode() {
  return `RBE-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
}

async function sendTicketEmail(registration, qrCodeData) {
  try {
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=512x512&format=png&data=${encodeURIComponent(JSON.stringify(qrCodeData))}`;
    // TODO: plug nodemailer/sendgrid here
    console.log('📧 Email billet préparé pour:', registration.participantEmail);
    console.log('QR Code URL:', qrCodeUrl);
  } catch (e) {
    console.error('Erreur envoi email billet:', e);
  }
}

// ---------- Error handler (AVANT listen) ----------
app.use((err, req, res, _next) => {
  try {
    const origin = req.headers.origin;
    const allowed = isAllowedOrigin(origin);
    const publicPath = isPublicPath(req);

    res.setHeader('X-CORS-MW', 'cors-v3');
    res.setHeader('Access-Control-Expose-Headers', 'X-CORS-MW');

    if (allowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Vary', 'Origin');
    } else if (publicPath) {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      req.headers['access-control-request-headers'] || 'Content-Type, Authorization, X-Requested-With'
    );
  } catch {}

  const status = err?.status || err?.statusCode || 500;
  console.error('❌ Error:', err?.message || err);
  res.status(status).json({ error: err?.message || 'Server error' });
});

// ---------- Start server ----------
app.listen(PORT, () => {
  console.log(`🚀 API Server running on http://localhost:${PORT}`);
  console.log('Boot =', new Date().toISOString());  console.log('Boot =', new Date().toISOString());
});

// Helpers
const parseChanges = (v) => {
  try {
    if (Array.isArray(v)) return v.map(String);
    if (typeof v === 'string') return JSON.parse(v);
  } catch {}
  return [];
};
const serializeChanges = (arr) => JSON.stringify((arr || []).map(String));

// Public: liste (externe)
app.get('/public/changelog', async (_req, res) => {
  if (!ensureDB(res)) return;
  try {
    const rows = await prisma.changelog.findMany({
      orderBy: [{ date: 'desc' }, { id: 'desc' }]
    });
    res.json(rows.map(r => ({
      id: r.id,
      title: r.title,
      version: r.version,
      date: r.date.toISOString().slice(0, 10),
      changes: parseChanges(r.changes)
    })));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch changelog' });
  }
});

// Admin (interne)
app.get('/changelog', requireAuth, async (_req, res) => {
  if (!ensureDB(res)) return;
  const rows = await prisma.changelog.findMany({ orderBy: [{ date: 'desc' }, { id: 'desc' }] });
  res.json(rows.map(r => ({ ...r, changes: parseChanges(r.changes) })));
});

app.post('/changelog', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  const { title, version, date, changes } = req.body || {};
  if (!title || !version) return res.status(400).json({ error: 'title & version requis' });
  const created = await prisma.changelog.create({
    data: {
      title,
      version,
      date: date ? new Date(date) : new Date(),
      changes: serializeChanges(changes)
    }
  });
  res.status(201).json({ ...created, changes: parseChanges(created.changes) });
});

app.put('/changelog/:id', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  const id = parseInt(req.params.id);
  const { title, version, date, changes } = req.body || {};
  const updated = await prisma.changelog.update({
    where: { id },
    data: {
      title: title ?? undefined,
      version: version ?? undefined,
      date: date ? new Date(date) : undefined,
      changes: changes ? serializeChanges(changes) : undefined
    }
  });
  res.json({ ...updated, changes: parseChanges(updated.changes) });
});

app.delete('/changelog/:id', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  const id = parseInt(req.params.id);
  await prisma.changelog.delete({ where: { id } });
  res.status(204).end();
});

// Backward-compatible aliases for old "/api/vehicles" paths
app.get('/api/vehicles', requireAuth, async (_req, res) => {
  if (!ensureDB(res)) return;
  try {
    const vehicles = await prisma.vehicle.findMany({ orderBy: { parc: 'asc' } });
    res.json(vehicles.map(transformVehicle));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch vehicles' });
  }
});

app.get('/api/vehicles/:parc', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const vehicle = await prisma.vehicle.findUnique({ where: { parc: req.params.parc } });
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
    res.json(transformVehicle(vehicle));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch vehicle' });
  }
});

// Fonction utilitaire pour générer un mot de passe temporaire
function generateTemporaryPassword() {
  const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789'; // Exclu O, 0 pour éviter confusion
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Fonction utilitaire pour hasher un mot de passe
async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

// Transformer un membre pour l'API (enlever données sensibles)
function transformMember(member) {
  if (!member) return null;
  return {
    id: member.id,
    memberNumber: member.memberNumber,
    firstName: member.firstName,
    lastName: member.lastName,
    email: member.email,
    phone: member.phone,
    address: member.address,
    city: member.city,
    postalCode: member.postalCode,
    birthDate: member.birthDate,
    membershipType: member.membershipType,
    membershipStatus: member.membershipStatus,
    joinDate: member.joinDate,
    renewalDate: member.renewalDate,
    role: member.role,
    hasExternalAccess: member.hasExternalAccess,
    hasInternalAccess: member.hasInternalAccess,
    matricule: member.matricule,
    loginEnabled: member.loginEnabled,
    mustChangePassword: member.mustChangePassword,
    lastLoginAt: member.lastLoginAt,
    passwordChangedAt: member.passwordChangedAt,
    loginAttempts: member.loginAttempts,
    lockedUntil: member.lockedUntil,
    createdAt: member.createdAt,
    updatedAt: member.updatedAt
  };
}

// GET /members - Liste tous les membres (admins seulement)
app.get('/members', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  
  try {
    // Vérifier que l'utilisateur est admin ou a les droits de voir les membres
    if (req.user.role !== 'ADMIN' && !req.user.roles?.includes('ADMIN')) {
      return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    }

    // Vérifier que la table existe avant de l'interroger
    try {
      const members = await prisma.member.findMany({
        orderBy: { createdAt: 'desc' }
      });

      res.json(members.map(transformMember));
    } catch (dbError) {
      // Si la table n'existe pas, retourner un tableau vide
      if (dbError.code === 'P2021' || dbError.message.includes('does not exist')) {
        console.warn('Table member n\'existe pas encore, retour d\'un tableau vide');
        return res.json([]);
      }
      throw dbError; // Re-throw si c'est une autre erreur
    }

  } catch (error) {
    console.error('Error fetching members:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des membres' });
  }
});

// GET /members/:id - Récupère un membre par ID
app.get('/members/:id', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  
  try {
    const { id } = req.params;
    
    const member = await prisma.member.findUnique({
      where: { id }
    });

    if (!member) {
      return res.status(404).json({ error: 'Membre non trouvé' });
    }

    res.json(transformMember(member));
  } catch (error) {
    console.error('Error fetching member:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du membre' });
  }
});

// POST /members/create-with-login - Créer un adhérent avec identifiants de connexion
app.post('/members/create-with-login', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  
  try {
    // Vérifier que l'utilisateur est admin
    if (req.user.role !== 'ADMIN' && !req.user.roles?.includes('ADMIN')) {
      return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    }

    const {
      firstName,
      lastName,
      email,
      matricule,
      membershipType = 'STANDARD',
      role = 'MEMBER',
      hasInternalAccess = false,
      phone,
      address,
      city,
      postalCode,
      birthDate
    } = req.body;

    // Validation
    if (!firstName || !lastName || !email) {
      return res.status(400).json({ error: 'Prénom, nom et email requis' });
    }

    if (!matricule || !/^\d{4}-\d{3}$/.test(matricule)) {
      return res.status(400).json({ error: 'Matricule requis au format YYYY-XXX (ex: 2025-001)' });
    }

    // Vérifier unicité email et matricule
    const existingMember = await prisma.member.findFirst({
      where: {
        OR: [
          { email },
          { matricule }
        ]
      }
    });

    if (existingMember) {
      return res.status(400).json({ 
        error: existingMember.email === email ? 'Email déjà utilisé' : 'Matricule déjà utilisé' 
      });
    }

    // Générer mot de passe temporaire
    const tempPassword = generateTemporaryPassword();
    const hashedPassword = await hashPassword(tempPassword);

    // Générer numéro d'adhérent unique
    const year = new Date().getFullYear();
    const count = await prisma.member.count() + 1;
    const memberNumber = `${year}-${count.toString().padStart(4, '0')}`;

    // Créer l'adhérent
    const member = await prisma.member.create({
      data: {
        memberNumber,
        firstName,
        lastName,
        email,
        matricule,
        membershipType,
        role,
        hasInternalAccess,
        loginEnabled: true,
        temporaryPassword: hashedPassword,
        mustChangePassword: true,
        passwordChangedAt: new Date(),
        phone,
        address,
        city,
        postalCode,
        birthDate: birthDate ? new Date(birthDate) : null,
        createdBy: req.user?.username || 'system'
      }
    });

    res.status(201).json({
      member: transformMember(member),
      temporaryPassword: tempPassword, // Retourné une seule fois pour l'admin
      message: `Adhérent créé avec succès. Mot de passe temporaire : ${tempPassword}`
    });

  } catch (error) {
    console.error('Error creating member with login:', error);
    res.status(500).json({ error: 'Erreur lors de la création de l\'adhérent' });
  }
});

// PATCH /members/:id - Mettre à jour un membre
app.patch('/members/:id', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  
  try {
    const { id } = req.params;
    const updates = req.body;

    // Vérifier que l'utilisateur est admin
    if (req.user.role !== 'ADMIN' && !req.user.roles?.includes('ADMIN')) {
      return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    }

    // Filtrer les champs autorisés
    const allowedFields = [
      'firstName', 'lastName', 'email', 'phone', 'address', 'city', 'postalCode',
      'membershipType', 'membershipStatus', 'role', 'hasInternalAccess', 
      'hasExternalAccess', 'loginEnabled'
    ];


    const filteredUpdates = Object.keys(updates)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updates[key];
        return obj;
      }, {});

    const updatedMember = await prisma.member.update({
      where: { id },
      data: filteredUpdates
    });

    res.json(transformMember(updatedMember));

  } catch (error) {
    console.error('Error updating member:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Membre non trouvé' });
    }
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
});

// POST /members/:id/reset-password - Réinitialiser le mot de passe d'un adhérent
app.post('/members/:id/reset-password', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  
  try {
    // Vérifier que l'utilisateur est admin
    if (req.user.role !== 'ADMIN' && !req.user.roles?.includes('ADMIN')) {
      return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    }

    const { id } = req.params;
    const member = await prisma.member.findUnique({ where: { id } });

    if (!member) {
      return res.status(404).json({ error: 'Adhérent non trouvé' });
    }

    // Générer nouveau mot de passe temporaire
    const tempPassword = generateTemporaryPassword();
    const hashedPassword = await hashPassword(tempPassword);

    await prisma.member.update({
      where: { id },
      data: {
        temporaryPassword: hashedPassword,
        internalPassword: null,
        mustChangePassword: true,
        loginAttempts: 0,
        lockedUntil: null,
        passwordChangedAt: new Date()
      }
    });

    res.json({
      message: 'Mot de passe réinitialisé',
      temporaryPassword: tempPassword
    });

  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Erreur lors de la réinitialisation' });
  }
});

// DELETE /members/:id - Supprimer un membre
app.delete('/members/:id', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  
  try {
    // Vérifier que l'utilisateur est admin
    if (req.user.role !== 'ADMIN' && !req.user.roles?.includes('ADMIN')) {
      return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    }

    const { id } = req.params;

    await prisma.member.delete({
      where: { id }
    });

    res.json({ message: 'Membre supprimé avec succès' });

  } catch (error) {
    console.error('Error deleting member:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Membre non trouvé' });
    }
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});
