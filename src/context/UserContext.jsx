import { createContext, useContext, useEffect, useMemo, useState } from "react";

const UserContext = createContext(null);

// Annuaire minimal (tu pourras l’étendre)
const DIRECTORY = {
  "m.ravichandran": { prenom: "Méthusan", nom: "RAVICHANDRAN" },
  "w.belaidi":      { prenom: "Waiyl",    nom: "BELAIDI" },
};

// Liste courte d'administrateurs (matricules)
const ADMIN_USERS = new Set([
  "w.belaidi",           // toi (exemple)
  // ajoute d'autres matricules si besoin
]);

export function UserProvider({ children }) {
  const [matricule, setMatricule] = useState(() => localStorage.getItem("matricule") || "");

  useEffect(() => {
    if (matricule) localStorage.setItem("matricule", matricule);
  }, [matricule]);

  // Dérive prénom/nom depuis l’annuaire (fallbacks propres)
  const { prenom, nom } = useMemo(() => {
    const key = String(matricule || "").toLowerCase();
    const entry = DIRECTORY[key];
    return {
      prenom: entry?.prenom || "",
      nom: entry?.nom || "",
    };
  }, [matricule]);

  // boolean rapide pour savoir si l'utilisateur est admin
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

