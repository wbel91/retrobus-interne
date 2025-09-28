import React from "react";
import { Routes, Route } from "react-router-dom";
import Header from "./components/Header";

// Pages principales (toutes à la racine de src/pages)
import Dashboard from "./pages/Dashboard";
import DashboardHome from "./pages/DashboardHome";
import MyRBE from "./pages/MyRBE";
import MyRBEActions from "./pages/MyRBEActions";
import Vehicules from "./pages/Vehicules";
import VehiculeAdd from "./pages/VehiculeAdd";
import VehiculeShow from "./pages/VehiculeShow";
import Adhesion from "./pages/Adhesion";
import Login from "./pages/Login";
import MobileVehicle from "./pages/MobileVehicle";
import PrestaEvenements from "./pages/PrestaEvenements";
import Retromail from "./pages/Retromail";

export default function App() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/home" element={<DashboardHome />} />
        <Route path="/dashboard/myrbe" element={<MyRBE />} />
        <Route path="/dashboard/myrbe/:parc" element={<MyRBEActions />} />
        <Route path="/dashboard/vehicules" element={<Vehicules />} />
        <Route path="/dashboard/vehicules/ajouter" element={<VehiculeAdd />} />
        <Route path="/dashboard/vehicules/:parc" element={<VehiculeShow />} />
        <Route path="/adhesion" element={<Adhesion />} />
        <Route path="/login" element={<Login />} />
        <Route path="/mobile/v/:parc" element={<MobileVehicle />} />
        <Route path="/presta-evenements" element={<PrestaEvenements />} />
        <Route path="/retromail" element={<Retromail />} />
        <Route path="*" element={<DashboardHome />} />
      </Routes>
    </>  );}