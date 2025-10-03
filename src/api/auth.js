export const USERS = {
  "w.belaidi": {
    password: "Waiyl9134#",
    prenom: "Waiyl",
    nom: "BELAIDI",
    roles: ["ADMIN"]
  },
  "m.ravichandran": {
    password: "RBE2025",
    prenom: "Méthusan",
    nom: "RAVICHANDRAN",
    roles: ["MEMBER"]
  },
  "g.champenois": {
    password: "RBE2026",
    prenom: "Gaëlle",
    nom: "CHAMPENOIS",
    roles: ["MEMBER"]
  },
  "n.tetillon": {
    password: "RBE185C",
    prenom: "Nathan",
    nom: "TETILLON",
    roles: ["MEMBER"]
  }
};

export async function login(username, password) {
  const base = import.meta.env.VITE_API_URL;
  if (!base) throw new Error('API non configurée (VITE_API_URL manquante)');
  
  const res = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  
  if (!res.ok) {
    let msg = 'Échec de connexion';
    try {
      const j = await res.json();
      if (j.error) msg = j.error;
    } catch {}
    throw new Error(msg);
  }
  
  return res.json();
}