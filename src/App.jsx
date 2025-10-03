import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { useUser } from "./context/UserContext";
import Header from "./components/Header";
import ProtectedRoute from "./components/ProtectedRoute";

// Pages principales
import Dashboard from "./pages/Dashboard";
import DashboardHome from "./pages/DashboardHome";
import MyRBE from "./pages/MyRBE";
import MyRBEActions from "./pages/MyRBEActions";
import Vehicules from "./pages/Vehicules";  // PAGE 1: Liste + QR
import VehiculeShow from "./pages/VehiculeShow";  // PAGE 2: Suivi + Édition
import Evenements from "./pages/Evenements"; // PAGE: Gestion des événements
import Adhesion from "./pages/Adhesion";
import Login from "./pages/Login";
import MobileVehicle from "./pages/MobileVehicle";
import Retromail from "./pages/Retromail";

export default function App() {
  const { isAuthenticated } = useUser();
  const location = useLocation();
  
  // N'afficher le header que si l'utilisateur est connecté et pas sur la page de login
  const showHeader = isAuthenticated && location.pathname !== '/login';

  return (
    <>
      {showHeader && <Header />}
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Toutes les autres routes sont protégées */}
        <Route path="/dashboard/*" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/dashboard/home" element={<ProtectedRoute><DashboardHome /></ProtectedRoute>} />
        <Route path="/dashboard/myrbe" element={<ProtectedRoute><MyRBE /></ProtectedRoute>} />
        <Route path="/dashboard/myrbe/:parc" element={<ProtectedRoute><MyRBEActions /></ProtectedRoute>} />
        
        {/* VÉHICULES: 2 pages consolidées */}
        <Route path="/dashboard/vehicules" element={<ProtectedRoute><Vehicules /></ProtectedRoute>} />
        <Route path="/dashboard/vehicules/:parc" element={<ProtectedRoute><VehiculeShow /></ProtectedRoute>} />
        
        {/* ÉVÉNEMENTS: Gestion des événements */}
        <Route path="/dashboard/evenements" element={<ProtectedRoute><Evenements /></ProtectedRoute>} />
        
        <Route path="/adhesion" element={<ProtectedRoute><Adhesion /></ProtectedRoute>} />
        <Route path="/mobile/v/:parc" element={<ProtectedRoute><MobileVehicle /></ProtectedRoute>} />
        <Route path="/retromail" element={<ProtectedRoute><Retromail /></ProtectedRoute>} />
        
        {/* Redirection par défaut vers le dashboard si connecté, sinon vers login */}
        <Route path="*" element={<ProtectedRoute><DashboardHome /></ProtectedRoute>} />
      </Routes>
    </>
  );
}