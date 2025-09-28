import { Box } from '@chakra-ui/react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Header from '../components/Header'
import Vehicules from './Vehicules'
import QRManager from './QRManager'
import MobileVehicle from './MobileVehicle'
import RequireCreator from '../components/RequireCreator';
import AddVehicule from './VehiculeAdd';
import VehiculeShow from './VehiculeShow';
import MyRBE from './MyRBE';
import MyRBEActions from './MyRBEActions';
import DashboardHome from './DashboardHome';
import RetroMail from './RetroMail';

export default function Dashboard() {
  return (
    <Box>
      <Routes>
        <Route index element={<DashboardHome />} />
        <Route path="retrobus" element={<Navigate to="." replace />} />
        <Route path="vehicules" element={<Vehicules />} />
        <Route path="vehicules/ajouter" element={<RequireCreator><AddVehicule /></RequireCreator>} />
        <Route path="vehicules/:parc" element={<VehiculeShow />} />
        <Route path="retromail" element={<RetroMail />} />
        <Route path="mobile/v/:parc" element={<MobileVehicle />} />
        <Route path="myrbe" element={<MyRBE />} />
        <Route path="myrbe/:parc" element={<MyRBEActions />} />
        <Route path="qr" element={<QRManager />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Box>
  )
}
