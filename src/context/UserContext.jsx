import { createContext, useContext, useEffect, useMemo, useState } from "react";
import ForcePasswordChange from '../components/ForcePasswordChange';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  });
  const [mustChangePassword, setMustChangePassword] = useState(false);

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

  const login = async (username, password) => {
    const base = import.meta.env.VITE_API_URL;
    if (!base) throw new Error('API non configurée (VITE_API_URL manquante)');
    
    const endpoint = /^\d{4}-\d{3}$/.test(username) ? '/auth/member-login' : '/auth/login';
    
    const res = await fetch(`${base}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        [endpoint.includes('member') ? 'matricule' : 'username']: username, 
        password 
      })
    });
    
    if (!res.ok) {
      let msg = 'Échec de connexion';
      try {
        const j = await res.json();
        if (j.error) msg = j.error;
      } catch {}
      throw new Error(msg);
    }
    
    const data = await res.json();
    
    // Vérifier si changement de mot de passe obligatoire
    if (data.user?.mustChangePassword) {
      setMustChangePassword(true);
    }
    
    return data;
  };

  const handlePasswordChanged = () => {
    setMustChangePassword(false);
    // Rafraîchir les données utilisateur
    if (token) {
      fetchUserData();
    }
  };

  // Fonction pour récupérer les données utilisateur
  const fetchUserData = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const userData = await response.json();
      setUser(userData);
      setMustChangePassword(userData.mustChangePassword || false);
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  // Effet pour récupérer les données utilisateur au chargement
  useEffect(() => {
    if (token) {
      fetchUserData();
    }
  }, [token]);

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

  return (
    <UserContext.Provider value={value}>
      {children}
      
      {/* Modal de changement de mot de passe obligatoire */}
      <ForcePasswordChange
        isOpen={mustChangePassword}
        onPasswordChanged={handlePasswordChanged}
      />
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}