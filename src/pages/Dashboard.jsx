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
import DashboardHome from './DashboardHome'; // <-- nouvel import
import RetroMail from './RetroMail';
import { Link } from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'
import { Image } from '@chakra-ui/react'
import logo from '../assets/retro_intranet_essonne.svg'
import { Flex } from '@chakra-ui/react'
import TopNavLink from '../components/TopNavLink';

const LOGO_H = "40px";

export default function Dashboard() {
  return (
    <Box>
      <Header />
      <Routes>
        {/* Index -> now shows DashboardHome so header/layout are present */}
        <Route index element={<DashboardHome />} />

        {/* Main sections */}
        {/* Redirection legacy /dashboard/retrobus vers l'index */}
        <Route path="retrobus" element={<Navigate to="." replace />} />
        <Route path="vehicules" element={<Vehicules />} />
        <Route path="vehicules/ajouter" element={<RequireCreator><AddVehicule /></RequireCreator>} />
        <Route path="vehicules/:parc" element={<VehiculeShow />} />

        <Route path="retromail" element={<RetroMail />} />

        {/* QR and mobile access (relative path) */}
        <Route path="mobile/v/:parc" element={<MobileVehicle />} />

        {/* MyRBE: synthesis + per-vehicle actions */}
        <Route path="myrbe" element={<MyRBE />} />
        <Route path="myrbe/:parc" element={<MyRBEActions />} />

        {/* QR manager */}
        <Route path="qr" element={<QRManager />} />

        {/* Fallback: placed last so real routes are matched first */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>

      {/* Logo à gauche (au-dessus du dégradé) */}
      <Link
        as={RouterLink}
        to="/dashboard"
        position="absolute"
        left="20px"
        top="50%"
        transform="translateY(-50%)"
        zIndex={2}
        aria-label="Accueil"
        _hover={{ opacity: 0.9 }}
      >
        <Image
          src={logo}
          alt="RétroBus Essonne Intranet"
          height={LOGO_H}
          objectFit="contain"
          draggable={false}
        />
      </Link>

      {/* Barre de menus */}
      <Flex bg="white" gap={{ base: 4, md: 8 }} justify="center" align="center" py={3}>
        <TopNavLink to="/dashboard">Accueil</TopNavLink>
        <TopNavLink to="/dashboard/vehicules">Véhicules</TopNavLink>
        <TopNavLink to="/dashboard/myrbe">MyRBE</TopNavLink>
      </Flex>
    </Box>
  )
}
