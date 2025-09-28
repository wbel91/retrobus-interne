import { createContext, useContext, useEffect, useMemo, useState } from "react";

const UserContext = createContext(null);

// Annuaire minimal
const DIRECTORY = {
  "g.champenois":   { prenom: "Gaëlle",   nom: "CHAMPENOIS" },
  "n.tetillon":     { prenom: "Nathan",   nom: "TETILLON" },
  "w.belaidi":      { prenom: "Waiyl",    nom: "BELAIDI" },
  "m.ravichandran": { prenom: "Methusan", nom: "RAVICHANDRAN" },
};

// Base de données des mots de passe
const USER_PASSWORDS = {
  "g.champenois":   "RBE2025TEST",
  "n.tetillon":     "RBE2025TEST",
  "w.belaidi":      "RBE2025TEST", 
  "m.ravichandran": "RBE2025TEST",
};

// Liste courte d'administrateurs
const ADMIN_USERS = new Set([
  "w.belaidi",  // Seul administrateur autorisé
]);

// Fonction de validation des identifiants
export const validateCredentials = (matricule, password) => {
  const normalizedMatricule = String(matricule || "").toLowerCase();
  
  if (!DIRECTORY[normalizedMatricule]) {
    return { isValid: false, error: "Utilisateur non trouvé" };
  }
  
  if (USER_PASSWORDS[normalizedMatricule] !== password) {
    return { isValid: false, error: "Mot de passe incorrect" };
  }
  
  return { isValid: true, error: null };
};

export function UserProvider({ children }) {
  const [matricule, setMatricule] = useState(() => localStorage.getItem("matricule") || "");

  useEffect(() => {
    if (matricule) localStorage.setItem("matricule", matricule);
  }, [matricule]);

  const { prenom, nom } = useMemo(() => {
    const key = String(matricule || "").toLowerCase();
    const entry = DIRECTORY[key];
    return {
      prenom: entry?.prenom || "",
      nom: entry?.nom || "",
    };
  }, [matricule]);

  const isAdmin = useMemo(() => {
    if (!matricule) return false;
    return ADMIN_USERS.has(String(matricule).toLowerCase());
  }, [matricule]);

  const value = useMemo(
    () => ({ matricule, setMatricule, prenom, nom, isAdmin }),
    [matricule, prenom, nom, isAdmin]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  return useContext(UserContext);
}
