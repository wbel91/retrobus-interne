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

// Déclaration du middleware d'upload (multer)
const uploadGallery = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if ((file.mimetype || '').startsWith('image/')) return cb(null, true);
    return cb(new Error('Seules les images sont acceptées pour la galerie'), false);
  }
});

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

const transformStock = (s) => {
  if (!s) return null;
  return {
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
    const { identifier, matricule, password } = req.body;
    const loginIdentifier = identifier || matricule;

    if (!loginIdentifier || !password) {
      return res.status(400).json({ error: 'Identifiant et mot de passe requis' });
    }

    console.log('🔐 Tentative de connexion membre:', loginIdentifier);

    // Trouver le membre par matricule ou email
    const member = await prisma.member.findFirst({
      where: {
        OR: [
          { matricule: loginIdentifier },
          { email: loginIdentifier }
        ]
      }
    });

    console.log('👤 Membre trouvé:', member ? `${member.firstName} ${member.lastName} (${member.matricule})` : 'Aucun');

    if (!member) {
      return res.status(401).json({ error: 'Identifiant invalide' });
    }

    if (!member.loginEnabled) {
      return res.status(401).json({ 
        error: 'Accès MyRBE non activé. Contactez un administrateur.' 
      });
    }

    // Vérifier verrouillage
    if (member.lockedUntil && member.lockedUntil > new Date()) {
      return res.status(423).json({ 
        error: 'Compte temporairement verrouillé. Réessayez plus tard.' 
      });
    }

    // Vérifier mot de passe
    const passwordToCheck = member.temporaryPassword || member.internalPassword;
    
    if (!passwordToCheck) {
      return res.status(401).json({ 
        error: 'Mot de passe non configuré. Contactez un administrateur.' 
      });
    }

    let passwordValid = false;
    
    // Si c'est un mot de passe temporaire en clair, comparer directement
    if (member.temporaryPassword && password === member.temporaryPassword) {
      passwordValid = true;
    } else if (member.internalPassword) {
      // Sinon, vérifier le mot de passe hashé
      passwordValid = await verifyPassword(password, member.internalPassword);
    }

    if (!passwordValid) {
      // Incrémenter tentatives échouées
      const attempts = member.loginAttempts + 1;
      const lockedUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;

      await prisma.member.update({
        where: { id: member.id },
        data: {
          loginAttempts: attempts,
          lockedUntil
        }
      });

      console.log('❌ Mot de passe incorrect pour:', loginIdentifier);
      return res.status(401).json({ error: 'Mot de passe incorrect' });
    }

    // Connexion réussie - réinitialiser tentatives
    await prisma.member.update({
      where: { id: member.id },
      data: {
        loginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        // Si c'était un mot de passe temporaire, forcer le changement
        mustChangePassword: !!member.temporaryPassword
      }
    });

    console.log('✅ Connexion réussie pour:', member.matricule);

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
        mustChangePassword: member.mustChangePassword || !!member.temporaryPassword,
        roles: [member.role],
        type: 'member'
      }
    });

  } catch (error) {
    console.error('❌ Erreur connexion membre:', error);
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

// ========== ENDPOINTS OPÉRATIONS PROGRAMMÉES ==========
app.get('/finance/scheduled-operations', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const operations = await prisma.scheduledOperation.findMany({
      orderBy: { dueDate: 'asc' }
    });
    res.json({ operations });
  } catch (error) {
    console.error('Erreur récupération opérations programmées:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/finance/scheduled-operations', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const { type, description, amount, dueDate, category, recurring, notes } = req.body;
    
    const operation = await prisma.scheduledOperation.create({
      data: {
        type,
        description,
        amount: parseFloat(amount),
        dueDate: dueDate ? new Date(dueDate) : null,
        category,
        recurring: recurring || 'none',
        notes,
        createdBy: req.user?.email || 'system'
      }
    });
    
    res.json(operation);
  } catch (error) {
    console.error('Erreur création opération programmée:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ========== ENDPOINTS RETROREPORTS ==========
app.get('/admin/retro-reports', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const reports = await prisma.retroReport.findMany({
      include: {
        comments: {
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ reports });
  } catch (error) {
    console.error('Erreur récupération RétroReports:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/admin/retro-reports', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  
  console.log('📝 === DÉBUT CRÉATION RÉTRO REPORT ===');
  console.log('👤 User:', req.user);
  console.log('📦 Body reçu:', req.body);
  
  try {
    const { title, description, category, priority, type } = req.body;
    
    // Validation des données
    if (!title || !description) {
      console.log('❌ Validation échouée: titre ou description manquant');
      return res.status(400).json({ 
        error: 'Titre et description requis',
        received: { title: !!title, description: !!description }
      });
    }
    
    // Préparation des données
    const reportData = {
      title: String(title).trim(),
      description: String(description).trim(),
      category: category ? String(category).trim() : null,
      priority: priority || 'medium',
      type: type || 'bug',
      status: 'open',
      createdBy: req.user?.email || req.user?.matricule || 'system'
    };
    
    console.log('📝 Données à insérer:', reportData);
    
    // Vérification de la connexion Prisma
    console.log('🔌 Test connexion Prisma...');
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Prisma connecté');
    
    // Création du report
    console.log('💾 Création en base...');
    const report = await prisma.retroReport.create({
      data: reportData,
      include: {
        comments: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    
    console.log('✅ RétroReport créé avec succès:', {
      id: report.id,
      title: report.title,
      status: report.status
    });
    
    res.status(201).json(report);
    
  } catch (error) {
    console.error('❌ === ERREUR CRÉATION RÉTRO REPORT ===');
    console.error('Type:', error.constructor.name);
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    
    if (error.code) {
      console.error('Code Prisma:', error.code);
    }
    
    // Gestion spécifique des erreurs Prisma
    if (error.code === 'P2002') {
      res.status(400).json({ 
        error: 'Contrainte d\'unicité violée',
        details: error.meta 
      });
    } else if (error.code === 'P2025') {
      res.status(404).json({ 
        error: 'Enregistrement non trouvé',
        details: error.meta 
      });
    } else if (error.code && error.code.startsWith('P')) {
      res.status(500).json({ 
        error: 'Erreur base de données',
        code: error.code,
        details: error.meta 
      });
    } else {
      res.status(500).json({ 
        error: 'Erreur serveur lors de la création',
        message: error.message,
        type: error.constructor.name
      });
    }
  } finally {
    console.log('📝 === FIN CRÉATION RÉTRO REPORT ===\n');
  }
});

app.post('/admin/retro-reports/:id/comments', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const { id } = req.params;
    const { message, status } = req.body;
    
    // Créer le commentaire
    const comment = await prisma.retroReportComment.create({
      data: {
        reportId: id,
        message,
        author: req.user?.email || 'system'
      }
    });
    
    // Mettre à jour le statut si fourni
    if (status) {
      await prisma.retroReport.update({
        where: { id },
        data: { status }
      });
    }
    
    res.json(comment);
  } catch (error) {
    console.error('Erreur ajout commentaire RétroReport:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ========== ENDPOINTS RETROREPORTS POUR RAILWAY ==========

// Endpoint de vérification santé
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'RétroBus API',
    version: '1.0.0'
  });
});

// Setup/Initialisation RétroReports (doit être AVANT l'endpoint générique)
app.post('/admin/retro-reports/setup', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    console.log('🚀 Initialisation RétroReports sur Railway...');

    const { resetData } = req.body;
    if (resetData) {
      await prisma.retroReportComment.deleteMany({});
      await prisma.retroReport.deleteMany({});
      console.log('🗑️ Données existantes supprimées');
    }

    // Tickets d'exemple
    const sampleReports = [
      {
        title: 'Connexion Railway lente',
        description: 'La connexion à la base de données Railway est parfois lente lors des pics de trafic.',
        category: 'Infrastructure',
        priority: 'high',
        type: 'performance',
        status: 'open',
        createdBy: req.user?.email || 'system@retrobus-essonne.fr',
      },
      {
        title: 'Interface gestion membres à améliorer',
        description: 'L\'interface de gestion des membres nécessite une refonte complète pour une meilleure UX.',
        category: 'Interface',
        priority: 'critical',
        type: 'feature',
        status: 'open',
        createdBy: req.user?.email || 'admin@retrobus-essonne.fr',
      },
      {
        title: 'Optimisation requêtes vehicules',
        description: 'Les requêtes sur la table vehicules sont lentes avec beaucoup d\'entrées.',
        category: 'Performance',
        priority: 'medium',
        type: 'performance',
        status: 'in_progress',
        createdBy: req.user?.email || 'dev@retrobus-essonne.fr',
      },
      {
        title: 'Mise à jour sécurité authentification',
        description: 'Les tokens JWT doivent être renforcés avec une rotation automatique.',
        category: 'Sécurité',
        priority: 'high',
        type: 'security',
        status: 'open',
        createdBy: req.user?.email || 'security@retrobus-essonne.fr',
      }
    ];

    const createdReports = [];
    for (const report of sampleReports) {
      const created = await prisma.retroReport.create({
        data: report,
        include: { comments: true }
      });
      createdReports.push(created);
    }

    // Commentaires d'exemple
    if (createdReports.length > 0) {
      await prisma.retroReportComment.create({
        data: {
          reportId: createdReports[0].id,
          message: 'Investigation en cours sur les timeouts de connexion Railway. Monitoring mis en place.',
          author: req.user?.email || 'devops@retrobus-essonne.fr'
        }
      });

      if (createdReports.length > 2) {
        await prisma.retroReportComment.create({
          data: {
            reportId: createdReports[2].id,
            message: 'Optimisation des index terminée. Performance améliorée de 60% sur Railway.',
            author: req.user?.email || 'performance@retrobus-essonne.fr'
          }
        });
      }
    }

    console.log(`✅ ${createdReports.length} RétroReports créés sur Railway`);
    
    res.json({
      success: true,
      message: `RétroReports initialisé avec ${createdReports.length} tickets sur Railway`,
      reports: createdReports,
      environment: 'Railway Production'
    });

  } catch (error) {
    console.error('❌ Erreur initialisation RétroReports Railway:', error);
    res.status(500).json({ 
      error: 'Erreur serveur lors de l\'initialisation',
      details: error.message,
      environment: 'Railway Production'
    });
  }
});

// GET - Récupérer tous les RétroReports
app.get('/admin/retro-reports', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    console.log('📋 Récupération RétroReports Railway...');
    
    const reports = await prisma.retroReport.findMany({
      include: {
        comments: {
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`✅ ${reports.length} RétroReports récupérés de Railway`);
    res.json({ 
      reports,
      environment: 'Railway Production',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erreur récupération RétroReports Railway:', error);
    res.status(500).json({ 
      error: 'Erreur serveur lors de la récupération',
      details: error.message,
      environment: 'Railway Production'
    });
  }
});

// POST - Créer un nouveau RétroReport
app.post('/admin/retro-reports', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  
  console.log('📝 === CRÉATION RÉTRO REPORT RAILWAY ===');
  console.log('👤 User:', req.user);
  console.log('📦 Body:', req.body);
  
  try {
    const { title, description, category, priority, type } = req.body;
    
    if (!title || !description) {
      console.log('❌ Validation échouée sur Railway');
      return res.status(400).json({ 
        error: 'Titre et description requis',
        environment: 'Railway Production'
      });
    }
    
    const reportData = {
      title: String(title).trim(),
      description: String(description).trim(),
      category: category ? String(category).trim() : null,
      priority: priority || 'medium',
      type: type || 'bug',
      status: 'open',
      createdBy: req.user?.email || req.user?.matricule || 'system@railway'
    };
    
    console.log('📝 Données pour Railway:', reportData);
    
    const report = await prisma.retroReport.create({
      data: reportData,
      include: {
        comments: { orderBy: { createdAt: 'desc' } }
      }
    });
    
    console.log('✅ RétroReport créé sur Railway:', {
      id: report.id,
      title: report.title,
      status: report.status
    });
    
    res.status(201).json({
      ...report,
      environment: 'Railway Production'
    });
    
  } catch (error) {
    console.error('❌ === ERREUR CRÉATION RAILWAY ===');
    console.error('Message:', error.message);
    console.error('Code:', error.code);
    
    if (error.code === 'P2002') {
      res.status(400).json({ 
        error: 'Contrainte d\'unicité violée',
        environment: 'Railway Production'
      });
    } else if (error.code && error.code.startsWith('P')) {
      res.status(500).json({ 
        error: 'Erreur base de données Railway',
        code: error.code,
        environment: 'Railway Production'
      });
    } else {
      res.status(500).json({ 
        error: 'Erreur serveur Railway lors de la création',
        message: error.message,
        environment: 'Railway Production'
      });
    }
  }
});

// POST - Ajouter un commentaire à un RétroReport
app.post('/admin/retro-reports/:id/comments', requireAuth, async (req, res) => {
  if (!ensureDB(res)) return;
  try {
    const { id } = req.params;
    const { message, status } = req.body;
    
    console.log('💬 Ajout commentaire Railway:', { reportId: id, message, status });
    
    if (!message) {
      return res.status(400).json({ 
        error: 'Message requis',
        environment: 'Railway Production'
      });
    }
    
    const comment = await prisma.retroReportComment.create({
      data: {
        reportId: id,
        message,
        author: req.user?.email || req.user?.matricule || 'system@railway'
      }
    });
    
    if (status) {
      await prisma.retroReport.update({
        where: { id },
        data: { status }
      });
    }
    
    console.log('✅ Commentaire ajouté sur Railway:', comment.id);
    res.json({
      ...comment,
      environment: 'Railway Production'
    });
    
  } catch (error) {
    console.error('❌ Erreur ajout commentaire Railway:', error);
    res.status(500).json({ 
      error: 'Erreur serveur Railway lors de l\'ajout du commentaire',
      message: error.message,
      environment: 'Railway Production'
    });
  }
});

// Endpoint de debug pour Railway
app.get('/admin/retro-reports/debug', requireAuth, async (req, res) => {
  try {
    console.log('🔍 Debug RétroReports Railway');
    
    const dbTest = await prisma.$queryRaw`SELECT 1 as test`;
    const reportCount = await prisma.retroReport.count();
    const commentCount = await prisma.retroReportComment.count();
    
    const lastReports = await prisma.retroReport.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' },
      include: { comments: true }
    });

    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: 'Railway Production',
      database: {
        connected: !!dbTest,
        reportCount,
        commentCount,
        url: process.env.DATABASE_URL ? 'Configurée' : 'Non configurée'
      },
      auth: {
        user: req.user,
        hasToken: !!req.headers.authorization
      },
      lastReports: lastReports.map(r => ({
        id: r.id,
        title: r.title,
        status: r.status,
        createdAt: r.createdAt,
        commentsCount: r.comments.length
      }))
    };

    console.log('✅ Debug Railway terminé');
    res.json(debugInfo);
    
  } catch (error) {
    console.error('❌ Erreur debug Railway:', error);
    res.status(500).json({
      error: 'Erreur debug Railway',
      message: error.message,
      environment: 'Railway Production'
    });
  }
});

// ========== FIN ENDPOINTS RETROREPORTS RAILWAY ==========

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server listening on http://0.0.0.0:${PORT}`);
});