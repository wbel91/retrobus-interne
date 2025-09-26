import { Box, Flex } from '@chakra-ui/react'
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
import TopNavLink from './TopNavLink';

export default function Dashboard() {
  return (
    <Box>
      <Header />

      <Flex bg="white" gap={{ base: 4, md: 8 }} justify="center" align="center" py={3}>
        <TopNavLink to="/dashboard/retrobus">Accueil</TopNavLink>
        <TopNavLink to="/dashboard/vehicules">Véhicules</TopNavLink>
        <TopNavLink to="/dashboard/myrbe">MyRBE</TopNavLink>
      </Flex>

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
