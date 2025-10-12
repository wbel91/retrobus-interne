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
import Vehicules from "./pages/Vehicules";
import VehiculeShow from "./pages/VehiculeShow";
import Evenements from "./pages/Evenements";
import EventsManagement from "./pages/EventsManagement";
import TestEventsPage from "./pages/TestEventsPage"; // Page de test
import SiteManagement from "./pages/SiteManagement"; // Gestion du site
import Adhesion from "./pages/Adhesion";
import Login from "./pages/Login";
import MobileVehicle from "./pages/MobileVehicle";
import Retromail from "./pages/Retromail";
import Newsletter from "./pages/Newsletter";
import Members from "./pages/Members";
import MembersManagement from "./pages/MembersManagement.jsx";

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
        <Route path="/login" element={<Login />} />
        
        <Route path="/dashboard/*" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/dashboard/home" element={<ProtectedRoute><DashboardHome /></ProtectedRoute>} />
        <Route path="/dashboard/myrbe" element={<ProtectedRoute><MyRBE /></ProtectedRoute>} />
        <Route path="/dashboard/myrbe/:parc" element={<ProtectedRoute><MyRBEActions /></ProtectedRoute>} />
        
        <Route path="/dashboard/vehicules" element={<ProtectedRoute><Vehicules /></ProtectedRoute>} />
        <Route path="/dashboard/vehicules/:parc" element={<ProtectedRoute><VehiculeShow /></ProtectedRoute>} />
        
        <Route path="/dashboard/evenements" element={<ProtectedRoute><Evenements /></ProtectedRoute>} />
        
        {/* Route de test pour diagnostiquer */}
        <Route path="/dashboard/test-events" element={<ProtectedRoute><TestEventsPage /></ProtectedRoute>} />
        
        {/* Route finale pour la gestion des événements */}
        <Route path="/dashboard/events-management" element={<ProtectedRoute><EventsManagement /></ProtectedRoute>} />
        
        {/* Gestion du site */}
        <Route path="/dashboard/site-management" element={<ProtectedRoute><SiteManagement /></ProtectedRoute>} />
        
        <Route path="/dashboard/newsletter" element={<ProtectedRoute><Newsletter /></ProtectedRoute>} />
        <Route path="/dashboard/members-management" element={<ProtectedRoute><MembersManagement /></ProtectedRoute>} />
        <Route path="/adhesion" element={<ProtectedRoute><Adhesion /></ProtectedRoute>} />
        <Route path="/mobile/v/:parc" element={<ProtectedRoute><MobileVehicle /></ProtectedRoute>} />
        <Route path="/retromail" element={<ProtectedRoute><Retromail /></ProtectedRoute>} />
        <Route path="/members" element={<ProtectedRoute><Members /></ProtectedRoute>} />
        
        <Route path="*" element={<ProtectedRoute><DashboardHome /></ProtectedRoute>} />
      </Routes>
    </>
  );
}