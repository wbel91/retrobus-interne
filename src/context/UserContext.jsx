import { createContext, useContext, useEffect, useMemo, useState } from "react";

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('authToken') || '');
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('authUser');
    return raw ? JSON.parse(raw) : null;
  });

  useEffect(() => {
    if (token) localStorage.setItem('authToken', token);
    else localStorage.removeItem('authToken');
  }, [token]);

  useEffect(() => {
    if (user) localStorage.setItem('authUser', JSON.stringify(user));
    else localStorage.removeItem('authUser');
  }, [user]);

  const isAuthenticated = !!token;
  const username = user?.username || '';
  const prenom = user?.prenom || '';
  const nom = user?.nom || '';
  const roles = user?.roles || [];
  const isAdmin = roles.includes('ADMIN');

  const logout = () => {
    setToken('');
    setUser(null);
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
      logout
    }),
    [token, user, isAuthenticated, username, prenom, nom, roles, isAdmin]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  return useContext(UserContext);
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