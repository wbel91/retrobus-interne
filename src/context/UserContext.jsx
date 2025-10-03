import { createContext, useContext, useEffect, useMemo, useState } from "react";

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  });

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  const isAuthenticated = !!token;
  const username = user?.username || '';
  const prenom = user?.prenom || '';
  const nom = user?.nom || '';
  const roles = user?.roles || [];
  const isAdmin = roles.includes('ADMIN');
  const matricule = user?.username || '';

  const logout = () => {
    setToken('');
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const value = useMemo(
    () => ({
      token,
      setToken,
      user,
      setUser,
      isAuthenticated,
      username,
      prenom,
      nom,
      roles,
      isAdmin,
      matricule,
      logout
    }),
    [token, user, isAuthenticated, username, prenom, nom, roles, isAdmin, matricule]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}

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