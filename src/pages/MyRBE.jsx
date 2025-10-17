import React from "react";
import {
  SimpleGrid,
  VStack,
  Text,
  Button,
  HStack,
  Box,
  useColorModeValue
} from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import {
  FiDollarSign, FiSettings, FiCalendar, FiUsers, FiPackage,
  FiMail, FiGlobe, FiZap, FiInbox
} from "react-icons/fi";
import PageLayout from '../components/Layout/PageLayout';
import ModernCard from '../components/Layout/ModernCard';

const cards = [
  {
    title: "Gestion Financière",
    description: "Recettes, dépenses et opérations programmées",
    to: "/admin/finance",
    icon: FiDollarSign,
    color: "rbe",
    badge: { label: "Nouveau", color: "green" }
  },
  {
    title: "Gestion Administrative",
    description: "RétroReports, tâches et suivi des incidents",
    to: "/admin/administrative",
    icon: FiSettings,
    color: "orange"
  },
  {
    title: "Gestion des Événements",
    description: "Création, planification et suivi",
    to: "/dashboard/events-management",
    icon: FiCalendar,
    color: "green"
  },
  {
    title: "Gérer les adhésions",
    description: "Membres, cotisations et documents",
    to: "/dashboard/members-management",
    icon: FiUsers,
    color: "blue"
  },
  {
    title: "Gestion des Stocks",
    description: "Inventaire et matériel de l'association",
    to: "/dashboard/stock-management",
    icon: FiPackage,
    color: "yellow"
  },
  {
    title: "Gestion Newsletter",
    description: "Abonnés et campagnes d'envoi",
    to: "/dashboard/newsletter",
    icon: FiMail,
    color: "purple"
  },
  {
    title: "Gestion du Site",
    description: "Changelog, contenu et mise à jour",
    to: "/dashboard/site-management",
    icon: FiGlobe,
    color: "pink"
  },
  {
    title: "Flashs Info",
    description: "Annonces urgentes et alertes",
    to: "/dashboard/flash-management",
    icon: FiZap,
    color: "cyan"
  },
  {
    title: "Retromail",
    description: "Messagerie interne de l'équipe",
    to: "/retromail",
    icon: FiInbox,
    color: "teal"
  },
];

export default function MyRBE() {
  const alertBg = useColorModeValue("blue.50", "blue.900");
  const alertBorder = useColorModeValue("blue.500", "blue.300");

  return (
    <PageLayout
      title="🚌 Espace MyRBE"
      subtitle="Accédez à tous les outils d'administration de l'association RétroBus Essonne"
      bgGradient="linear(to-r, rbe.600, blue.600, purple.600)"
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard/home" },
        { label: "MyRBE", href: "/dashboard/myrbe" }
      ]}
    >
      <VStack spacing={8} align="stretch">
        {/* Grille des fonctionnalités */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
          {cards.map((card) => (
            <ModernCard
              key={card.title}
              title={card.title}
              description={card.description}
              icon={card.icon}
              color={card.color}
              badge={card.badge}
              as={RouterLink}
              to={card.to}
              onClick={() => {}}
            />
          ))}
        </SimpleGrid>
        
        {/* Section d'aide */}
        <VStack spacing={6}>
          <Box 
            bg={alertBg}
            p={6}
            borderRadius="xl" 
            borderLeft="4px solid"
            borderLeftColor={alertBorder}
            w="full"
          >
            <VStack spacing={3} align="start">
              <HStack>
                <Text fontSize="lg" fontWeight="600" color="blue.700">
                  💡 Guide d'utilisation
                </Text>
              </HStack>
              <Text color="blue.600" lineHeight="relaxed" fontSize="sm">
                Toutes ces fonctionnalités sont connectées aux données réelles de l'association. 
                Les modifications que vous effectuez sont automatiquement sauvegardées et synchronisées 
                avec les autres membres de l'équipe.
              </Text>
              <HStack spacing={3} pt={2}>
                <Button size="sm" variant="secondary" colorScheme="blue">
                  Guide complet
                </Button>
                <Button size="sm" variant="modern">
                  Support technique
                </Button>
              </HStack>
            </VStack>
          </Box>
          
          {/* Stats rapides */}
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} w="full">
            <ModernCard 
              title="Uptime" 
              description="99.9%" 
              color="green"
              variant="modern"
            />
            <ModernCard 
              title="Membres actifs" 
              description="45" 
              color="blue"
              variant="modern"
            />
            <ModernCard 
              title="Dernière sync" 
              description="Il y a 2 min" 
              color="gray"
              variant="modern"
            />
            <ModernCard 
              title="Version" 
              description="v2.1.3" 
              color="purple"
              variant="modern"
            />
          </SimpleGrid>
        </VStack>
      </VStack>
    </PageLayout>
  );
}