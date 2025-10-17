import React, { useEffect, useMemo, useState } from "react";
import {
  Box, SimpleGrid, GridItem, Heading, Text, Button, Link as ChakraLink,
  Stack, Stat, StatLabel, StatNumber, HStack, VStack, Badge, useColorModeValue,
  Container, Flex, Card, CardBody, CardHeader, Icon, Progress, Avatar,
  Divider, Center, Spinner, Alert, AlertIcon, Tag, TagLabel, TagLeftIcon,
  useToast, IconButton, Image
} from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import { 
  FiActivity, FiBell, FiCalendar, FiClock, FiCpu, 
  FiDollarSign, FiExternalLink, FiEye, FiFileText, FiGitBranch, 
  FiHeart, FiHome, FiMapPin, FiPlus, FiRefreshCw, FiSettings, 
  FiTrendingUp, FiTruck, FiUser, FiUsers, FiZap, FiBarChart 
} from "react-icons/fi";
import { useUser } from '../context/UserContext';

// Import APIs avec gestion d'erreur
import { vehiculesAPI } from '../api/vehicles';
import { eventsAPI } from '../api/events';
import { membersAPI } from '../api/members';

const ANN_KEY = "rbe:announcements";

function loadFlashes() {
  try {
    const raw = localStorage.getItem(ANN_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    const now = Date.now();
    return arr.filter(f => f && f.active && (!f.expiresAt || new Date(f.expiresAt).getTime() > now));
  } catch (e) {
    console.warn("loadFlashes:", e);
    return [];
  }
}

export default function DashboardHome() {
  const user = useUser();
  const [flashes, setFlashes] = useState([]);
  const [stats, setStats] = useState({
    vehicles: { total: 0, active: 0, loading: true },
    events: { total: 0, upcoming: 0, published: 0, loading: true },
    members: { total: 0, active: 0, loading: true },
    revenue: { amount: 0, loading: true }
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quickActions, setQuickActions] = useState([]);
  
  const toast = useToast();
  const cardBg = useColorModeValue("white", "gray.800");
  const gradientBg = useColorModeValue(
    "linear(to-r, blue.500, purple.600)",
    "linear(to-r, blue.600, purple.700)"
  );
  const borderColor = useColorModeValue("gray.200", "gray.700");

  useEffect(() => {
    setFlashes(loadFlashes());
    loadDashboardData();
    
    // Actualiser les données toutes les 5 minutes
    const interval = setInterval(loadDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    console.log('🔄 Chargement des données du dashboard...');
    
    // Charger chaque type de données en parallèle
    loadVehiclesData();
    loadEventsData();
    loadMembersData();
    loadFinanceData();
    
    // Activités récentes et actions rapides
    setupRecentActivity();
    setupQuickActions();
  };

  const loadVehiclesData = async () => {
    try {
      console.log('📊 Chargement des véhicules...');
      
      // Vérifier si l'API existe
      if (!vehiculesAPI || typeof vehiculesAPI.getAll !== 'function') {
        console.warn('vehiculesAPI non disponible');
        setStats(prev => ({
          ...prev,
          vehicles: { total: 0, active: 0, loading: false }
        }));
        return;
      }

      const response = await vehiculesAPI.getAll();
      console.log('🚛 Réponse véhicules:', response);
      
      // Adapter selon la structure de la réponse
      let vehicles = [];
      if (response?.data) {
        vehicles = Array.isArray(response.data) ? response.data : [response.data];
      } else if (Array.isArray(response)) {
        vehicles = response;
      }

      const vehicleStats = {
        total: vehicles.length,
        active: vehicles.filter(v => {
          // Tenter différents noms de champs pour le statut
          const status = v?.statut || v?.status || v?.etat || '';
          return status === 'ACTIF' || status === 'ACTIVE' || status === 'active' || status === 'En service';
        }).length,
        loading: false
      };

      console.log('📈 Stats véhicules:', vehicleStats);

      setStats(prev => ({
        ...prev,
        vehicles: vehicleStats
      }));

      // Ajouter à l'activité récente si nouveaux véhicules
      if (vehicles.length > 0) {
        const recentVehicles = vehicles.filter(v => {
          const created = new Date(v.createdAt || v.dateCreation || v.created_at);
          const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          return created > dayAgo;
        });

        if (recentVehicles.length > 0) {
          setRecentActivity(prev => [
            {
              id: `vehicles-${Date.now()}`,
              type: 'vehicle',
              title: `${recentVehicles.length} nouveau(x) véhicule(s) ajouté(s)`,
              time: 'Aujourd\'hui',
              icon: FiTruck,
              color: 'blue'
            },
            ...prev.filter(a => a.type !== 'vehicle')
          ]);
        }
      }

    } catch (error) {
      console.error('❌ Erreur chargement véhicules:', error);
      setStats(prev => ({
        ...prev,
        vehicles: { total: 0, active: 0, loading: false }
      }));
    }
  };

  const loadEventsData = async () => {
    try {
      console.log('📊 Chargement des événements...');
      
      // Vérifier si l'API existe
      if (!eventsAPI || typeof eventsAPI.getAll !== 'function') {
        console.warn('eventsAPI non disponible');
        setStats(prev => ({
          ...prev,
          events: { total: 0, upcoming: 0, published: 0, loading: false }
        }));
        return;
      }

      const response = await eventsAPI.getAll();
      console.log('📅 Réponse événements:', response);
      
      // Adapter selon la structure de la réponse
      let events = [];
      if (response?.data) {
        events = Array.isArray(response.data) ? response.data : [response.data];
      } else if (Array.isArray(response)) {
        events = response;
      }

      const now = new Date();
      const eventStats = {
        total: events.length,
        upcoming: events.filter(e => {
          try {
            const eventDate = new Date(e?.date || e?.dateEvent || e?.startDate);
            const status = e?.status || e?.statut || '';
            return eventDate > now && (status === 'PUBLISHED' || status === 'published' || status === 'Publié');
          } catch {
            return false;
          }
        }).length,
        published: events.filter(e => {
          const status = e?.status || e?.statut || '';
          return status === 'PUBLISHED' || status === 'published' || status === 'Publié';
        }).length,
        loading: false
      };

      console.log('📈 Stats événements:', eventStats);

      setStats(prev => ({
        ...prev,
        events: eventStats
      }));

      // Ajouter à l'activité récente si nouveaux événements
      if (events.length > 0) {
        const recentEvents = events.filter(e => {
          const created = new Date(e.createdAt || e.dateCreation || e.created_at);
          const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          return created > dayAgo;
        });

        if (recentEvents.length > 0) {
          setRecentActivity(prev => [
            {
              id: `events-${Date.now()}`,
              type: 'event',
              title: `${recentEvents.length} nouvel(s) événement(s) créé(s)`,
              time: 'Aujourd\'hui',
              icon: FiCalendar,
              color: 'green'
            },
            ...prev.filter(a => a.type !== 'event')
          ]);
        }
      }

    } catch (error) {
      console.error('❌ Erreur chargement événements:', error);
      setStats(prev => ({
        ...prev,
        events: { total: 0, upcoming: 0, published: 0, loading: false }
      }));
    }
  };

  const loadMembersData = async () => {
    try {
      console.log('📊 Chargement des membres...');
      
      // Vérifier si l'API existe
      if (!membersAPI || typeof membersAPI.getAll !== 'function') {
        console.warn('membersAPI non disponible');
        setStats(prev => ({
          ...prev,
          members: { total: 0, active: 0, loading: false }
        }));
        return;
      }

      const response = await membersAPI.getAll();
      console.log('👥 Réponse membres:', response);
      
      // Adapter selon la structure de la réponse
      let members = [];
      if (response?.members) {
        members = Array.isArray(response.members) ? response.members : [response.members];
      } else if (response?.data) {
        members = Array.isArray(response.data) ? response.data : [response.data];
      } else if (Array.isArray(response)) {
        members = response;
      }

      const memberStats = {
        total: members.length,
        active: members.filter(m => {
          const status = m?.membershipStatus || m?.statut || m?.status || m?.adhesionStatus || '';
          return status === 'ACTIVE' || status === 'active' || status === 'Actif' || status === 'À jour';
        }).length,
        loading: false
      };

      console.log('📈 Stats membres:', memberStats);

      setStats(prev => ({
        ...prev,
        members: memberStats
      }));

      // Ajouter à l'activité récente si nouveaux membres
      if (members.length > 0) {
        const recentMembers = members.filter(m => {
          const created = new Date(m.createdAt || m.dateCreation || m.dateAdhesion || m.created_at);
          const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          return created > dayAgo;
        });

        if (recentMembers.length > 0) {
          setRecentActivity(prev => [
            {
              id: `members-${Date.now()}`,
              type: 'member',
              title: `${recentMembers.length} nouvelle(s) adhésion(s)`,
              time: 'Aujourd\'hui',
              icon: FiUsers,
              color: 'purple'
            },
            ...prev.filter(a => a.type !== 'member')
          ]);
        }
      }

    } catch (error) {
      console.error('❌ Erreur chargement membres:', error);
      setStats(prev => ({
        ...prev,
        members: { total: 0, active: 0, loading: false }
      }));
    }
  };

  const loadFinanceData = async () => {
    try {
      console.log('📊 Calcul des données financières...');
      
      // Calculer le revenu basé sur les membres actifs
      // En attendant une API finance dédiée
      const currentStats = stats.members;
      if (!currentStats.loading) {
        const revenue = {
          amount: currentStats.active * 60, // 60€ par adhésion active
          loading: false
        };

        console.log('📈 Stats finance:', revenue);

        setStats(prev => ({
          ...prev,
          revenue
        }));
      }

    } catch (error) {
      console.error('❌ Erreur calcul finance:', error);
      setStats(prev => ({
        ...prev,
        revenue: { amount: 0, loading: false }
      }));
    }
  };

  // Actualiser les finances quand les membres changent
  useEffect(() => {
    if (!stats.members.loading) {
      loadFinanceData();
    }
  }, [stats.members]);

  const setupRecentActivity = () => {
    // Activités de base (seront complétées par les vraies données)
    const baseActivity = [
      {
        id: 'system-1',
        type: 'system',
        title: 'Dashboard mis à jour',
        time: 'À l\'instant',
        icon: FiActivity,
        color: 'gray'
      }
    ];

    setRecentActivity(prev => prev.length > 0 ? prev : baseActivity);
  };

  const setupQuickActions = () => {
    const actions = [
      {
        title: 'Nouveau véhicule',
        icon: FiPlus,
        to: '/dashboard/vehicules',
        color: 'blue'
      },
      {
        title: 'Créer événement',
        icon: FiCalendar,
        to: '/dashboard/events-management',
        color: 'green'
      },
      {
        title: 'Gestion membres',
        icon: FiUsers,
        to: '/dashboard/members-management',
        color: 'purple'
      },
      {
        title: 'Finance',
        icon: FiDollarSign,
        to: '/admin',
        color: 'orange'
      }
    ];

    setQuickActions(actions);
  };

  // Finaliser le loading quand toutes les données sont chargées
  useEffect(() => {
    const allLoaded = !stats.vehicles.loading && !stats.events.loading && !stats.members.loading && !stats.revenue.loading;
    if (allLoaded && loading) {
      console.log('✅ Toutes les données sont chargées');
      setLoading(false);
    }
  }, [stats, loading]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bonjour";
    if (hour < 17) return "Bon après-midi";
    return "Bonsoir";
  };

  const info = useMemo(() => {
    return flashes.map(f => ({
      id: f.id,
      message: f.message,
      category: f.category || 'info',
      createdAt: f.createdAt
    }));
  }, [flashes]);

  if (loading) {
    return (
      <Container maxW="container.xl" py={8}>
        <VStack spacing={8}>
          <Box
            bgGradient={gradientBg}
            color="white"
            p={8}
            borderRadius="xl"
            textAlign="center"
            w="full"
          >
            <Heading size="xl">Chargement des données...</Heading>
            <Text mt={2} opacity={0.9}>
              Récupération des véhicules, événements et membres
            </Text>
          </Box>
          <Spinner size="xl" color="blue.500" />
        </VStack>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={8} fontFamily="Montserrat, sans-serif">
      {/* En-tête avec salutation */}
      <Box
        bgGradient={gradientBg}
        color="white"
        p={8}
        borderRadius="xl"
        mb={8}
        textAlign="center"
      >
        <Heading size="xl" mb={4}>
          {getGreeting()}, {user?.prenom || user?.email || 'Utilisateur'} ! 👋
        </Heading>
        <Text fontSize="lg" opacity={0.9}>
          Voici un aperçu de votre activité RétrobuS Essonne
        </Text>
      </Box>

      {/* Grille principale */}
      <SimpleGrid columns={{ base: 1, lg: 4 }} spacing={8}>
        {/* Contenu principal */}
        <GridItem colSpan={{ base: 1, lg: 3 }}>
          <VStack spacing={8} align="stretch">
            {/* Statistiques principales */}
            <SimpleGrid columns={{ base: 2, md: 4 }} spacing={6}>
              <Card bg={cardBg} borderColor={borderColor} shadow="lg">
                <CardBody>
                  <Stat>
                    <StatLabel color="gray.600">Véhicules actifs</StatLabel>
                    <StatNumber color="blue.500">
                      <HStack>
                        <Icon as={FiTruck} />
                        {stats.vehicles.loading ? (
                          <Spinner size="sm" />
                        ) : (
                          <Text>{stats.vehicles.active}/{stats.vehicles.total}</Text>
                        )}
                      </HStack>
                    </StatNumber>
                    <Progress 
                      value={stats.vehicles.total > 0 ? (stats.vehicles.active / stats.vehicles.total) * 100 : 0} 
                      colorScheme="blue" 
                      size="sm" 
                      mt={2} 
                      isIndeterminate={stats.vehicles.loading}
                    />
                  </Stat>
                </CardBody>
              </Card>

              <Card bg={cardBg} borderColor={borderColor} shadow="lg">
                <CardBody>
                  <Stat>
                    <StatLabel color="gray.600">Événements à venir</StatLabel>
                    <StatNumber color="green.500">
                      <HStack>
                        <Icon as={FiCalendar} />
                        {stats.events.loading ? (
                          <Spinner size="sm" />
                        ) : (
                          <Text>{stats.events.upcoming}/{stats.events.total}</Text>
                        )}
                      </HStack>
                    </StatNumber>
                    <Progress 
                      value={stats.events.total > 0 ? (stats.events.upcoming / stats.events.total) * 100 : 0} 
                      colorScheme="green" 
                      size="sm" 
                      mt={2} 
                      isIndeterminate={stats.events.loading}
                    />
                  </Stat>
                </CardBody>
              </Card>

              <Card bg={cardBg} borderColor={borderColor} shadow="lg">
                <CardBody>
                  <Stat>
                    <StatLabel color="gray.600">Membres actifs</StatLabel>
                    <StatNumber color="purple.500">
                      <HStack>
                        <Icon as={FiUsers} />
                        {stats.members.loading ? (
                          <Spinner size="sm" />
                        ) : (
                          <Text>{stats.members.active}/{stats.members.total}</Text>
                        )}
                      </HStack>
                    </StatNumber>
                    <Progress 
                      value={stats.members.total > 0 ? (stats.members.active / stats.members.total) * 100 : 0} 
                      colorScheme="purple" 
                      size="sm" 
                      mt={2} 
                      isIndeterminate={stats.members.loading}
                    />
                  </Stat>
                </CardBody>
              </Card>

              <Card bg={cardBg} borderColor={borderColor} shadow="lg">
                <CardBody>
                  <Stat>
                    <StatLabel color="gray.600">Revenus estimés</StatLabel>
                    <StatNumber color="orange.500">
                      <HStack>
                        <Icon as={FiDollarSign} />
                        {stats.revenue.loading ? (
                          <Spinner size="sm" />
                        ) : (
                          <Text>{stats.revenue.amount.toLocaleString('fr-FR')}€</Text>
                        )}
                      </HStack>
                    </StatNumber>
                    <Progress 
                      value={stats.revenue.amount > 0 ? Math.min((stats.revenue.amount / 5000) * 100, 100) : 0} 
                      colorScheme="orange" 
                      size="sm" 
                      mt={2} 
                      isIndeterminate={stats.revenue.loading}
                    />
                  </Stat>
                </CardBody>
              </Card>
            </SimpleGrid>

            {/* Actions rapides */}
            <Card bg={cardBg} borderColor={borderColor} shadow="lg">
              <CardHeader>
                <Heading size="md" fontWeight="700">Actions rapides</Heading>
              </CardHeader>
              <CardBody>
                <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
                  {quickActions.map((action) => (
                    <Button
                      key={action.title}
                      as={RouterLink}
                      to={action.to}
                      leftIcon={<Icon as={action.icon} />}
                      colorScheme={action.color}
                      variant="outline"
                      size="sm"
                      h="auto"
                      py={4}
                      flexDirection="column"
                      textAlign="center"
                    >
                      {action.title}
                    </Button>
                  ))}
                </SimpleGrid>
              </CardBody>
            </Card>

            {/* Activité récente */}
            <Card bg={cardBg} borderColor={borderColor} shadow="lg">
              <CardHeader>
                <HStack justify="space-between">
                  <Heading size="md" fontWeight="700">Activité récente</Heading>
                  <IconButton
                    icon={<FiRefreshCw />}
                    size="sm"
                    variant="ghost"
                    onClick={loadDashboardData}
                    title="Actualiser"
                  />
                </HStack>
              </CardHeader>
              <CardBody>
                <VStack spacing={4} align="stretch">
                  {recentActivity.length === 0 ? (
                    <Text color="gray.500" textAlign="center" py={4}>
                      Aucune activité récente
                    </Text>
                  ) : (
                    recentActivity.slice(0, 5).map((activity) => (
                      <HStack key={activity.id} spacing={4} p={3} bg="gray.50" borderRadius="lg">
                        <Icon as={activity.icon} color={`${activity.color}.500`} />
                        <VStack align="start" spacing={0} flex={1}>
                          <Text fontWeight="600" fontSize="sm">
                            {activity.title}
                          </Text>
                          <Text fontSize="xs" color="gray.500">
                            {activity.time}
                          </Text>
                        </VStack>
                        <Badge colorScheme={activity.color} variant="subtle">
                          {activity.type}
                        </Badge>
                      </HStack>
                    ))
                  )}
                </VStack>
              </CardBody>
            </Card>
          </VStack>
        </GridItem>

        {/* Sidebar */}
        <GridItem>
          <VStack spacing={6} align="stretch">
            {/* Notifications */}
            <Card bg={cardBg} borderColor={borderColor} shadow="lg">
              <CardHeader>
                <HStack justify="space-between">
                  <Heading size="md" fontWeight="700">Notifications</Heading>
                  <Badge colorScheme="blue" variant="subtle">
                    {flashes.length}
                  </Badge>
                </HStack>
              </CardHeader>
              <CardBody>
                <VStack spacing={3} align="stretch">
                  {info.length === 0 ? (
                    <Text color="gray.500" fontSize="sm" textAlign="center" py={4}>
                      Aucune notification
                    </Text>
                  ) : (
                    info.slice(0, 5).map((flash) => (
                      <Box key={flash.id} p={3} borderRadius="lg" bg="gray.50">
                        <HStack justify="space-between" align="start">
                          <VStack align="start" spacing={1} flex={1}>
                            <Text fontSize="sm" fontWeight="600">
                              {flash.message}
                            </Text>
                            <Text fontSize="xs" color="gray.500">
                              {flash.createdAt ? new Date(flash.createdAt).toLocaleDateString('fr-FR') : ''}
                            </Text>
                          </VStack>
                          <Badge colorScheme="blue" variant="subtle" fontSize="xs">
                            {flash.category}
                          </Badge>
                        </HStack>
                      </Box>
                    ))
                  )}
                </VStack>
              </CardBody>
            </Card>

            {/* Liens utiles */}
            <Card bg={cardBg} borderColor={borderColor} shadow="lg">
              <CardHeader>
                <Heading size="md" fontWeight="700">Liens utiles</Heading>
              </CardHeader>
              <CardBody>
                <VStack spacing={3} align="stretch">
                  <Button
                    as={RouterLink}
                    to="/dashboard/myrbe"
                    variant="ghost"
                    justifyContent="flex-start"
                    leftIcon={<FiHome />}
                    size="sm"
                  >
                    MyRBE
                  </Button>
                  <Button
                    as={RouterLink}
                    to="/dashboard/vehicules"
                    variant="ghost"
                    justifyContent="flex-start"
                    leftIcon={<FiTruck />}
                    size="sm"
                  >
                    Véhicules ({stats.vehicles.total})
                  </Button>
                  <Button
                    as={RouterLink}
                    to="/dashboard/events-management"
                    variant="ghost"
                    justifyContent="flex-start"
                    leftIcon={<FiCalendar />}
                    size="sm"
                  >
                    Événements ({stats.events.total})
                  </Button>
                  <Button
                    as={RouterLink}
                    to="/dashboard/members-management"
                    variant="ghost"
                    justifyContent="flex-start"
                    leftIcon={<FiUsers />}
                    size="sm"
                  >
                    Membres ({stats.members.total})
                  </Button>
                  <Button
                    as={RouterLink}
                    to="/admin"
                    variant="ghost"
                    justifyContent="flex-start"
                    leftIcon={<FiDollarSign />}
                    size="sm"
                  >
                    Finance
                  </Button>
                </VStack>
              </CardBody>
            </Card>

            {/* Informations système */}
            <Alert status="info" borderRadius="md">
              <AlertIcon />
              <VStack align="start" spacing={1}>
                <Text fontWeight="bold" fontSize="sm">
                  APIs disponibles
                </Text>
                <Text fontSize="xs">
                  Les données sont récupérées en temps réel quand les APIs sont disponibles.
                </Text>
              </VStack>
            </Alert>
          </VStack>
        </GridItem>
      </SimpleGrid>
    </Container>
  );
}