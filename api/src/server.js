// Load env early
import 'dotenv/config';

import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import multer from 'multer';
import QRCode from 'qrcode';
import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';

// Local modules
import { documentsAPI as docsAPI, upload as documentsUpload } from './documents.js';
import * as newsletterService from './newsletter-service.js';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
app.set('trust proxy', 1);

// SMTP (optionnel: ne bloque pas si non configuré)
const mailer = (process.env.SMTP_HOST && process.env.SMTP_USER)
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: String(process.env.SMTP_SECURE || 'false') === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    })
  : null;

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

// POST /auth/change-password - Changer le mot de passe membre
app.post('/auth/change-password', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Mot de passe actuel et nouveau requis' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Le nouveau mot de passe doit faire au moins 6 caractères' });
    }

    // Vérifier si c'est un membre connecté
    if (req.user.type === 'member') {
      const member = await prisma.member.findUnique({ where: { id: req.user.userId } });
      if (!member) {
        return res.status(404).json({ error: 'Membre non trouvé' });
      }

      // Vérifier le mot de passe actuel
      const passwordToCheck = member.temporaryPassword || member.internalPassword;
      if (!passwordToCheck || !(await verifyPassword(currentPassword, passwordToCheck))) {
        return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
      }

      // Hasher le nouveau mot de passe
      const hashedNewPassword = await hashPassword(newPassword);

      // Mettre à jour le mot de passe
      await prisma.member.update({
        where: { id: member.id },
        data: {
          internalPassword: hashedNewPassword,
          temporaryPassword: null,
          mustChangePassword: false,
          passwordChangedAt: new Date()
        }
      });

      res.json({ message: 'Mot de passe changé avec succès' });
    } else {
      res.status(403).json({ error: 'Cette fonction est réservée aux membres' });
    }

  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Erreur lors du changement de mot de passe' });
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
      history: 'history',   // accepte « history » (front)
      histoire: 'history'   // et « histoire » (FR)
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
app.post('/vehicles/:parc/gallery', requireAuth, uploadGallery.array('images', 10), async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const { parc } = req.params;
    const v = await prisma.vehicle.findUnique({ where: { parc } });
    if (!v) return res.status(404).json({ error: 'Vehicle not found' });

    const existingGallery = parseJsonField(v.gallery);
    const existing = Array.isArray(existingGallery) ? existingGallery : [];

    const files = req.files || [];
    if (files.length === 0) return res.status(400).json({ error: 'Aucun fichier reçu' });

    const added = files.map(file => {
      const base64 = file.buffer.toString('base64');
      const mimeType = file.mimetype || 'image/jpeg';
      return `data:${mimeType};base64,${base64}`;
    });

    const MAX_GALLERY_IMAGES = 12;
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

app.post('/vehicles/:parc/background', requireAuth, uploadGallery.single('image'), async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const { parc } = req.params;
    if (!req.file) return res.status(400).json({ error: 'image requis' });

    const v = await prisma.vehicle.findUnique({ where: { parc } });
    if (!v) return res.status(404).json({ error: 'Vehicle not found' });

    const base64 = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype || 'image/jpeg';
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

// Liste des stocks avec filtres (search, category, status, lowStock)
app.get('/api/stocks', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const { search, category, status, lowStock } = req.query;

    const where = {};
    if (category && category !== 'ALL') where.category = String(category);
    if (status && status !== 'ALL') where.status = String(status);
    if (search) {
      const s = String(search).trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { reference: { contains: s, mode: 'insensitive' } },
        { description: { contains: s, mode: 'insensitive' } }
      ];
    }

    const rows = await prisma.stock.findMany({ where, orderBy: { name: 'asc' } });

    const filtered = (String(lowStock) === 'true')
      ? rows.filter(r => (r.quantity ?? 0) <= (r.minQuantity ?? 0))
      : rows;

    res.json({ stocks: filtered.map(transformStock) });
  } catch (e) {
    console.error('stocks list error:', e);
    res.json({ stocks: [] });
  }
});

// Statistiques agrégées
app.get('/api/stocks/stats', requireAuth, async (_req, res) => {
  if (!ensureDB(res)) return;
  try {
    const [totalItems, agg] = await Promise.all([
      prisma.stock.count(),
      prisma.stock.aggregate({ _sum: { quantity: true } })
    ]);

    const all = await prisma.stock.findMany({ select: { quantity: true, minQuantity: true } });
    let lowStockCount = 0;
    let outOfStockCount = 0;
    for (const s of all) {
      if ((s.quantity ?? 0) <= (s.minQuantity ?? 0)) lowStockCount++;
      if ((s.quantity ?? 0) === 0) outOfStockCount++;
    }

    res.json({
      totalItems,
      totalQuantity: agg?._sum?.quantity || 0,
      lowStockCount,
      outOfStockCount
    });
  } catch (e) {
    console.error('stocks/stats error:', e);
    res.json({ totalItems: 0, totalQuantity: 0, lowStockCount: 0, outOfStockCount: 0 });
  }
});

// ---------- Member Helper Functions ----------
function generateTemporaryPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijklmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

async function hashPassword(password) {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

async function verifyPassword(plain, hashed) {
  // tolérance legacy: si hashed semble en clair, comparer direct
  if (!hashed || hashed.length < 40) return plain === hashed;
  try { return await bcrypt.compare(plain, hashed); }
  catch { return false; }
}

function transformMember(member) {
  if (!member) return null;
  
  return {
    id: member.id,
    memberNumber: member.memberNumber,
    matricule: member.matricule,
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
    role: member.role,
    hasInternalAccess: member.hasInternalAccess,
    hasExternalAccess: member.hasExternalAccess,
    loginEnabled: member.loginEnabled,
    mustChangePassword: member.mustChangePassword,
    newsletter: member.newsletter,
    paymentAmount: member.paymentAmount,
    paymentMethod: member.paymentMethod,
    lastPaymentDate: member.lastPaymentDate,
    notes: member.notes,
    createdAt: member.createdAt,
    updatedAt: member.updatedAt,
    createdBy: member.createdBy
  };
}

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
      firstName, lastName, email, matricule, phone, address, city, postalCode,
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

    // Validation du matricule uniquement s'il est fourni (optionnel pour /api/members)
    if (matricule && !/^[a-z]+\.[a-z]+$/.test(matricule)) {
      return res.status(400).json({ error: 'Matricule doit être au format prénom.nom (ex: j.dupont) - lettres minuscules uniquement' });
    }

    // Remplacer par une validation plus flexible :
    if (matricule && !/^[a-z][a-z0-9]*\.[a-z][a-z0-9]*$/.test(matricule)) {
      return res.status(400).json({ error: 'Matricule doit être au format prénom.nom (ex: w.belaidi) - lettres minuscules uniquement' });
    }

    // Vérifier unicité email et matricule
    const whereConditions = [{ email }];
    if (matricule) {
      whereConditions.push({ matricule });
    }

    const existingMember = await prisma.member.findFirst({
      where: { OR: whereConditions }
    });

    if (existingMember) {
      if (existingMember.email === email) {
        return res.status(400).json({ error: 'Email déjà utilisé' });
      }
      if (existingMember.matricule === matricule) {
        return res.status(400).json({ error: 'Matricule déjà utilisé' });
      }
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
        matricule, // Ajouter cette ligne
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
        loginEnabled: matricule ? true : false, // Activer le login seulement si matricule fourni
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

// POST /members/:id/add-login - Ajouter identifiants de connexion à un membre existant
app.post('/members/:id/add-login', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  
  try {
    // Vérifier que l'utilisateur est admin
    if (req.user.role !== 'ADMIN' && !req.user.roles?.includes('ADMIN')) {
      return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    }

    const { id } = req.params;
    const { matricule, role, hasInternalAccess = true } = req.body;

    // Validation du matricule
    if (!matricule) {
      return res.status(400).json({ error: 'Matricule requis' });
    }
    
    // Remplacer par une validation plus flexible :
    if (!/^[a-z][a-z0-9]*\.[a-z][a-z0-9]*$/.test(matricule)) {
      return res.status(400).json({ error: 'Matricule doit être au format prénom.nom (ex: w.belaidi) - lettres minuscules uniquement' });
    }

    // Vérifier que le membre existe
    const member = await prisma.member.findUnique({ where: { id } });
    if (!member) {
      return res.status(404).json({ error: 'Membre non trouvé' });
    }

    // Vérifier que le matricule n'est pas déjà utilisé
    const existingMatricule = await prisma.member.findFirst({
      where: { matricule, id: { not: id } }
    });
    if (existingMatricule) {
      return res.status(400).json({ error: 'Matricule déjà utilisé' });
    }

    // Générer mot de passe temporaire
    const tempPassword = generateTemporaryPassword();
    const hashedPassword = await hashPassword(tempPassword);

    // Mettre à jour le membre
    const updatedMember = await prisma.member.update({
      where: { id },
      data: {
        matricule,
        role: role || member.role,
        hasInternalAccess,
        loginEnabled: true,
        temporaryPassword: hashedPassword,
        mustChangePassword: true,
        passwordChangedAt: new Date()
      }
    });

    res.status(200).json({
      member: transformMember(updatedMember),
      temporaryPassword: tempPassword,
      message: `Identifiants créés pour ${updatedMember.firstName} ${updatedMember.lastName}. Mot de passe temporaire : ${tempPassword}`
    });

  } catch (error) {
    console.error('Error adding login to member:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout des identifiants' });
  }
});

// GET /members - Liste tous les membres (admins seulement)
app.get('/members', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  
  try {
    // Vérifier que l'utilisateur est admin ou a les droits de voir les membres
    if (req.user.role !== 'ADMIN' && !req.user.roles?.includes('ADMIN')) {
      return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    }

    const members = await prisma.member.findMany({
      orderBy: { lastName: 'asc' },
      select: {
        id: true,
        memberNumber: true,
        firstName: true,
        lastName: true,
        email: true,
        matricule: true,
        membershipStatus: true,
        membershipType: true,
        role: true,
        hasInternalAccess: true,
        hasExternalAccess: true,
        joinDate: true,
        renewalDate: true
      }
    });

    res.json(members);

  } catch (error) {
    console.error('Error fetching members:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des membres' });
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
      membershipStatus = 'ACTIVE',
      role = 'MEMBER',
      hasInternalAccess = false,
      hasExternalAccess = false,
      phone,
      address,
      city,
      postalCode,
      birthDate,
      paymentAmount,
      paymentMethod = 'CASH',
      notes,
      newsletter = true
    } = req.body;

    // Validation
    if (!firstName || !lastName || !email) {
      return res.status(400).json({ error: 'Prénom, nom et email requis' });
    }

    // Validation du matricule avec nouveau format
    if (!matricule) {
      return res.status(400).json({ error: 'Matricule requis' });
    }
    
    // Valider le format prénom.nom (lettres minuscules uniquement)
    if (!/^[a-z][a-z0-9]*\.[a-z][a-z0-9]*$/.test(matricule)) {
      return res.status(400).json({ error: 'Matricule doit être au format prénom.nom (ex: w.belaidi) - lettres minuscules uniquement' });
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
        membershipStatus,
        role,
        hasInternalAccess,
        hasExternalAccess,
        loginEnabled: true,
        temporaryPassword: hashedPassword,
        mustChangePassword: true,
        passwordChangedAt: new Date(),
        phone,
        address,
        city,
        postalCode,
        birthDate: birthDate ? new Date(birthDate) : null,
        paymentAmount: paymentAmount ? parseFloat(paymentAmount) : null,
        paymentMethod,
        newsletter,
        notes,
        createdBy: req.user?.username || 'system',
        lastPaymentDate: paymentAmount ? new Date() : null
      }
    });

    res.status(201).json({
      member: transformMember(member),
      temporaryPassword: tempPassword,
      message: `Adhérent créé avec succès. Mot de passe temporaire : ${tempPassword}`
    });

  } catch (error) {
    console.error('Error creating member with login:', error);
    res.status(500).json({ error: 'Erreur lors de la création de l\'adhérent' });
  }
});

// Route pour sauvegarder les paramètres HelloAsso d'un événement
app.post('/api/events/:id/helloasso', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;

  try {
    const { id } = req.params;
    const { eventUrl, organizationSlug, eventSlug, formId } = req.body;

    // Vérifier que l'événement existe
    const event = await prisma.event.findUnique({
      where: { id }
    });

    if (!event) {
      return res.status(404).json({ error: 'Événement non trouvé' });
    }

    // Mettre à jour les paramètres HelloAsso
    const updatedEvent = await prisma.event.update({
      where: { id },
      data: {
        helloAssoUrl: eventUrl,
        helloAssoOrg: organizationSlug,
        helloAssoEvent: eventSlug,
        helloAssoFormId: formId,
        updatedAt: new Date()
      }
    });

    res.json({
      message: 'Paramètres HelloAsso mis à jour',
      event: updatedEvent
    });

  } catch (error) {
    console.error('Error updating HelloAsso settings:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour des paramètres HelloAsso' });
  }
});

// Route pour récupérer les participants HelloAsso d'un événement
app.get('/api/events/:id/helloasso/participants', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;

  try {
    const { id } = req.params;

    // Récupérer l'événement avec ses paramètres HelloAsso
    const event = await prisma.event.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        helloAssoUrl: true,
        helloAssoOrg: true,
        helloAssoEvent: true,
        helloAssoFormId: true
      }
    });

    if (!event) {
      return res.status(404).json({ error: 'Événement non trouvé' });
    }

    if (!event.helloAssoOrg || !event.helloAssoEvent) {
      return res.status(400).json({ error: 'Paramètres HelloAsso non configurés pour cet événement' });
    }

    // Ici, vous pourriez implémenter la logique côté serveur pour récupérer les participants HelloAsso
    // Pour l'instant, on retourne les paramètres pour que le client fasse l'appel

    res.json({
      event: {
        id: event.id,
        title: event.title,
        helloAssoOrg: event.helloAssoOrg,
        helloAssoEvent: event.helloAssoEvent,
        helloAssoUrl: event.helloAssoUrl
      }
    });

  } catch (error) {
    console.error('Error fetching HelloAsso participants:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des participants HelloAsso' });
  }
});

// ---------- Retromail (public) ----------
const RETROMAIL_DIR = path.join(process.cwd(), 'retromail');

// Middleware pour créer le dossier Retromail s'il n'existe pas
app.use(async (req, res, next) => {
  try {
    await fs.mkdir(RETROMAIL_DIR, { recursive: true });
    next();
  } catch (e) {
    console.error('Error creating Retromail directory:', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

async function retroMailPublish({ title, summary, body, tags = [], audience = 'ALL', from = 'system', attachments = [] }) {
  const ts = new Date();
  const stamp = ts.toISOString().replace(/[-:]/g, '').replace(/\..+/, '');
  const baseName = `${stamp}-${(title || 'message').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;
  const jsonName = `${baseName}.json`;

  const json = { id: baseName, date: ts.toISOString(), title, summary: summary || '', body: body || '', from, tags, audience, attachments };
  await fs.writeFile(path.join(RETROMAIL_DIR, jsonName), JSON.stringify(json, null, 2), 'utf-8');
  return { id: baseName, jsonName };
}

async function retroMailSavePdf(buffer, suggestedName) {
  const safe = (suggestedName || `document-${Date.now()}`).replace(/[^a-z0-9._-]/gi, '_');
  const pdfName = safe.endsWith('.pdf') ? safe : `${safe}.pdf`;
  await fs.writeFile(path.join(RETROMAIL_DIR, pdfName), buffer);
  return { fileName: pdfName, url: `/retromail/${pdfName}` };
}

// ...placer ceci au-dessus des routes /api/stocks/:id/movement...

async function generateMovementPDF({ stock, movement, actor, member }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 36 });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).text('Fiche Mouvement de Stock', { align: 'center' }).moveDown(0.5);
    doc.fontSize(10)
      .text(`Date: ${new Date().toLocaleString('fr-FR')}`)
      .text(`Acteur: ${actor?.display || '-'}`)
      .text(`Membre: ${member?.fullName || '-'} (${member?.email || '-'})`)
      .moveDown();

    doc.fontSize(14).text('Article', { underline: true }).moveDown(0.2);
    doc.fontSize(11)
      .text(`Nom: ${stock?.name || '-'}`)
      .text(`Référence: ${stock?.reference || '-'}`)
      .text(`Catégorie: ${stock?.category || '-'}`)
      .text(`Emplacement: ${stock?.location || '-'}`)
      .moveDown();

    doc.fontSize(14).text('Mouvement', { underline: true }).moveDown(0.2);
    doc.fontSize(11)
      .text(`Type: ${movement?.type || '-'}`)
      .text(`Quantité: ${movement?.quantity ?? '-'}`)
      .text(`Quantité précédente: ${movement?.previousQuantity ?? '-'}`)
      .text(`Nouvelle quantité: ${movement?.newQuantity ?? '-'}`)
      .text(`Raison: ${movement?.reason || '-'}`)
      .text(`Notes: ${movement?.notes || '-'}`)
      .moveDown();

    doc.moveDown().fontSize(9).fillColor('#666')
      .text('Document généré automatiquement par MyRBE • RBE', { align: 'center' });
    doc.end();
  });
}

async function sendMovementEmail({ stock, movement, actor, member }) {
  if (!mailer) return; // SMTP non configuré
  const subject = `Mouvement ${movement.type} – ${stock.name} (${stock.reference || 'n/r'})`;
  const pdfBuffer = await generateMovementPDF({ stock, movement, actor, member });

  const to = [];
  const cc = [];
  if (member?.email) to.push(member.email);
  if (process.env.PRESIDENT_EMAIL) cc.push(process.env.PRESIDENT_EMAIL);
  if (to.length === 0 && cc.length === 0 && process.env.SMTP_USER) cc.push(process.env.SMTP_USER);

  const textBody =
    `Bonjour,\n\n` +
    `Un mouvement de stock a été enregistré:\n` +
    `- Article: ${stock.name} (${stock.reference || 'n/r'})\n` +
    `- Type: ${movement.type}\n` +
    `- Quantité: ${movement.quantity}\n` +
    `- Ancienne quantité: ${movement.previousQuantity}\n` +
    `- Nouvelle quantité: ${movement.newQuantity}\n` +
    `- Raison: ${movement.reason || '-'}\n` +
    `- Notes: ${movement.notes || '-'}\n` +
    `- Par: ${actor?.display || '-'}\n\n` +
    `Le PDF récapitulatif est joint en pièce-jointe.\n\n` +
    `— MyRBE`;

  await mailer.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: to.join(', '),
    cc: cc.join(', '),
    subject,
    text: textBody,
    attachments: [{ filename: `mouvement-${movement.id || Date.now()}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }]
  });
}

// Historique (plural)
app.get('/api/stocks/:id/movements', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const stockId = parseInt(req.params.id, 10);
    const stock = await prisma.stock.findUnique({ where: { id: stockId } });
    if (!stock) return res.status(404).json({ error: 'Stock not found' });

    const movements = await prisma.stockMovement.findMany({
      where: { stockId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(movements);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch movements' });
  }
});

// Compat GET (singulier)
app.get('/api/stocks/:id/movement', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const stockId = parseInt(req.params.id, 10);
    const stock = await prisma.stock.findUnique({ where: { id: stockId } });
    if (!stock) return res.status(404).json({ error: 'Stock not found' });

    const movements = await prisma.stockMovement.findMany({
      where: { stockId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(movements);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch movements' });
  }
});

app.post('/api/stocks/:id/movement', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const stockId = parseInt(req.params.id, 10);
    const { type, quantity, reason, notes } = req.body || {};

    if (!['IN','OUT','ADJUSTMENT'].includes(type)) return res.status(400).json({ error: 'Type invalide' });
    const qty = parseInt(quantity, 10);
    if (!Number.isFinite(qty) || qty <= 0) return res.status(400).json({ error: 'Quantité invalide' });

    const stock = await prisma.stock.findUnique({ where: { id: stockId } });
    if (!stock) return res.status(404).json({ error: 'Stock not found' });

    let newQuantity = stock.quantity;
    if (type === 'IN') newQuantity = stock.quantity + qty;
    else if (type === 'OUT') newQuantity = stock.quantity - qty;
    else if (type === 'ADJUSTMENT') newQuantity = qty;

    const actorId = req.user?.username || req.user?.sub || 'system';
    const actorDisplay = actorId;

    const result = await prisma.$transaction(async (tx) => {
      const movement = await tx.stockMovement.create({
        data: {
          stockId,
          type,
          quantity: type === 'ADJUSTMENT' ? Math.abs(newQuantity - stock.quantity) : qty,
          previousQuantity: stock.quantity,
          newQuantity,
          reason: reason || null,
          notes: notes || null,
          userId: actorId
        }
      });

      const updated = await tx.stock.update({
        where: { id: stockId },
        data: {
          quantity: newQuantity,
          lastRestockDate: type === 'IN' ? new Date() : stock.lastRestockDate
        }
      });

      return { movement, updatedStock: updated };
    });

    // Infos membre pour l'email/PDF
    let memberInfo = null;
    if (req.user?.type === 'member' && req.user?.userId) {
      try {
        const m = await prisma.member.findUnique({ where: { id: req.user.userId } });
        if (m) memberInfo = { email: m.email, fullName: `${m.firstName} ${m.lastName}`.trim() };
      } catch {}
    }

    const pdfBuffer = await generateMovementPDF({
      stock,
      movement: result.movement,
      actor: { display: actorDisplay },
      member: memberInfo
    });

    const pdfFile = await retroMailSavePdf(
      pdfBuffer,
      `mouvement-${result.movement.id}-${stock.reference || stock.id}`
    );

    await retroMailPublish({
      title: `Mouvement ${type} – ${stock.name} (${stock.reference || 'n/r'})`,
      summary: `Mouvement ${type}: ${qty} • après: ${result.movement.newQuantity}`,
      body:
        `Article: ${stock.name} (${stock.reference || 'n/r'})\n` +
        `Type: ${type}\n` +
        `Quantité: ${qty}\n` +
        `Avant: ${result.movement.previousQuantity}\n` +
        `Après: ${result.movement.newQuantity}\n` +
        `Raison: ${reason || '-'}\n` +
        `Notes: ${notes || '-'}\n` +
        `Par: ${actorDisplay}\n`,
      tags: ['stock','movement'],
      audience: 'ALL',
      from: actorDisplay,
      attachments: [{ name: pdfFile.fileName, url: pdfFile.url }]
    });

    // Email optionnel (existant)
    sendMovementEmail({
      stock: result.updatedStock,
      movement: result.movement,
      actor: { display: actorDisplay },
      member: memberInfo
    }).catch(err => console.error('Erreur envoi email mouvement:', err));

    res.json({ movement: result.movement, stock: transformStock(result.updatedStock) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Create movement failed' });
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
    res.status(500).json({ error: 'Failed to fetch newsletter stats' });
  }
});

const uploadGallery = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if ((file.mimetype || '').startsWith('image/')) return cb(null, true);
    cb(new Error('Seules les images sont acceptées'), false);
  }
});

const transformStock = (s) => ({
  id: s.id,
  reference: s.reference,
  name: s.name,
  description: s.description,
  category: s.category,
  subcategory: s.subcategory,
  quantity: s.quantity,
  minQuantity: s.minQuantity,
  unit: s.unit,
  location: s.location,
  supplier: s.supplier,
  purchasePrice: s.purchasePrice,
  salePrice: s.salePrice,
  status: s.status,
  lastRestockDate: s.lastRestockDate,
  expiryDate: s.expiryDate,
  notes: s.notes,
  createdBy: s.createdBy,
  createdAt: s.createdAt,
  updatedAt: s.updatedAt
});