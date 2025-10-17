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
import AdminFinance from "./pages/AdminFinance";
import AdminGeneral from "./pages/AdminGeneral";
import Vehicules from "./pages/Vehicules";
import VehiculeShow from "./pages/VehiculeShow";
import Evenements from "./pages/Evenements";
import EventsManagement from "./pages/EventsManagement";
import EventsCreation from "./pages/EventsCreation";
import TestEventsPage from "./pages/TestEventsPage";
import SiteManagement from "./pages/SiteManagement";
import StockManagement from "./pages/StockManagement";
import FlashManagement from "./pages/FlashManagement";
import Adhesion from "./pages/Adhesion";
import Login from "./pages/Login";
import MobileVehicle from "./pages/MobileVehicle";
import Retromail from "./pages/Retromail";
import Newsletter from "./pages/Newsletter";
import Members from "./pages/Members";
import MembersManagement from "./pages/MembersManagement";

export default function App() {
  const { isAuthenticated } = useUser();
  const location = useLocation();
  
  // Debug: afficher la route actuelle
  console.log('🛣️ Current route:', location.pathname);
  
  const showHeader = isAuthenticated && location.pathname !== '/login';

  return (
    <>
      {showHeader && <Header />}
      <Routes>
        {/* Route de connexion */}
        <Route path="/login" element={<Login />} />
        
        {/* Routes du dashboard principal */}
        <Route path="/dashboard/*" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/dashboard/home" element={<ProtectedRoute><DashboardHome /></ProtectedRoute>} />
        <Route path="/dashboard/myrbe" element={<ProtectedRoute><MyRBE /></ProtectedRoute>} />
        <Route path="/dashboard/myrbe/:parc" element={<ProtectedRoute><MyRBEActions /></ProtectedRoute>} />
        
        {/* 🏦 Routes pour la gestion administrative et financière */}
        <Route path="/admin/finance" element={<ProtectedRoute><AdminFinance /></ProtectedRoute>} />
        <Route path="/admin/administrative" element={<ProtectedRoute><AdminGeneral /></ProtectedRoute>} />
        {/* Route legacy pour compatibilité - redirige vers finance */}
        <Route path="/admin" element={<ProtectedRoute><AdminFinance /></ProtectedRoute>} />
        
        {/* 🚗 Routes des véhicules */}
        <Route path="/dashboard/vehicules" element={<ProtectedRoute><Vehicules /></ProtectedRoute>} />
        <Route path="/dashboard/vehicules/:parc" element={<ProtectedRoute><VehiculeShow /></ProtectedRoute>} />
        
        {/* 📅 Routes des événements */}
        <Route path="/dashboard/evenements" element={<ProtectedRoute><Evenements /></ProtectedRoute>} />
        <Route path="/dashboard/events-management" element={<ProtectedRoute><EventsManagement /></ProtectedRoute>} />
        <Route path="/dashboard/events-creation" element={<ProtectedRoute><EventsCreation /></ProtectedRoute>} />
        {/* Route de test pour diagnostiquer */}
        <Route path="/dashboard/test-events" element={<ProtectedRoute><TestEventsPage /></ProtectedRoute>} />
        
        {/* 🌐 Gestion du site et contenu */}
        <Route path="/dashboard/site-management" element={<ProtectedRoute><SiteManagement /></ProtectedRoute>} />
        <Route path="/dashboard/flash-management" element={<ProtectedRoute><FlashManagement /></ProtectedRoute>} />
        
        {/* 📦 Gestion des stocks */}
        <Route path="/dashboard/stock-management" element={<ProtectedRoute><StockManagement /></ProtectedRoute>} />
        
        {/* 👥 Gestion des membres */}
        <Route path="/dashboard/members-management" element={<ProtectedRoute><MembersManagement /></ProtectedRoute>} />
        <Route path="/members" element={<ProtectedRoute><Members /></ProtectedRoute>} />
        <Route path="/adhesion" element={<ProtectedRoute><Adhesion /></ProtectedRoute>} />
        
        {/* 📧 Communication */}
        <Route path="/dashboard/newsletter" element={<ProtectedRoute><Newsletter /></ProtectedRoute>} />
        <Route path="/retromail" element={<ProtectedRoute><Retromail /></ProtectedRoute>} />
        
        {/* 📱 Version mobile */}
        <Route path="/mobile/v/:parc" element={<ProtectedRoute><MobileVehicle /></ProtectedRoute>} />
        
        {/* Route par défaut - redirige vers le dashboard home */}
        <Route path="/" element={<ProtectedRoute><DashboardHome /></ProtectedRoute>} />
        <Route path="*" element={<ProtectedRoute><DashboardHome /></ProtectedRoute>} />
      </Routes>
    </>
  );
}