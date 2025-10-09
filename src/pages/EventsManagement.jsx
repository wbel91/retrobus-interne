import React, { useState, useEffect } from 'react';
import {
  Box, Heading, VStack, HStack, Table, Thead, Tbody, Tr, Th, Td,
  Badge, Button, IconButton, Text, Spinner, Center, useToast,
  Card, CardHeader, CardBody, SimpleGrid, Stat, StatLabel, StatNumber,
  StatGroup, Alert, AlertIcon, Flex, Select, Input, InputGroup,
  InputLeftElement, Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalBody, ModalFooter, ModalCloseButton, useDisclosure,
  Divider
} from '@chakra-ui/react';
import { 
  FiCalendar, FiMapPin, FiUsers, FiBarChart, FiEye, FiEdit, // Changé FiBarChart3 en FiBarChart
  FiTrash2, FiSearch, FiRefreshCw, FiPlus, FiDownload
} from 'react-icons/fi';
import { Link as RouterLink } from 'react-router-dom';

export default function EventsManagement() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    draft: 0,
    upcoming: 0
  });

  const toast = useToast();
  const { isOpen: isDetailOpen, onOpen: onDetailOpen, onClose: onDetailClose } = useDisclosure();

  // Charger les événements
  const fetchEvents = async () => {
    setLoading(true);
    try {
      // Simulation d'API - remplacez par votre vraie API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockEvents = [
        {
          id: 1,
          title: "Sortie découverte patrimoine",
          date: "2025-11-15",
          time: "09:00",
          location: "Musée des Transports",
          status: "PUBLISHED",
          description: "Découverte du patrimoine transport en région",
          extras: JSON.stringify({ isVisible: true, requiresRegistration: true })
        },
        {
          id: 2,
          title: "Assemblée générale 2025",
          date: "2025-12-10",
          time: "14:00",
          location: "Salle municipale",
          status: "DRAFT",
          description: "AG annuelle de l'association",
          extras: JSON.stringify({ isVisible: false, requiresRegistration: false })
        }
      ];
      
      setEvents(mockEvents);
      
      // Calculer les statistiques
      const total = mockEvents.length;
      const published = mockEvents.filter(e => e.status === 'PUBLISHED').length;
      const draft = mockEvents.filter(e => e.status === 'DRAFT').length;
      const upcoming = mockEvents.filter(e => new Date(e.date) > new Date()).length;
      
      setStats({ total, published, draft, upcoming });
    } catch (error) {
      console.error('Erreur chargement événements:', error);
      toast({
        status: 'error',
        title: 'Erreur',
        description: 'Impossible de charger les événements'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Filtrer les événements
  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || event.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Obtenir le badge de statut
  const getStatusBadge = (status) => {
    const configs = {
      PUBLISHED: { color: 'green', text: 'Publié' },
      DRAFT: { color: 'gray', text: 'Brouillon' },
      ARCHIVED: { color: 'orange', text: 'Archivé' }
    };
    const config = configs[status] || configs.DRAFT;
    return <Badge colorScheme={config.color}>{config.text}</Badge>;
  };

  // Obtenir les informations d'un événement
  const getEventInfo = (event) => {
    const eventDate = new Date(event.date);
    const now = new Date();
    const isUpcoming = eventDate > now;
    const isPast = eventDate < now;
    
    let extras = {};
    try {
      extras = event.extras ? JSON.parse(event.extras) : {};
    } catch (e) {
      extras = {};
    }

    return {
      isUpcoming,
      isPast,
      isVisible: extras.isVisible !== false,
      requiresRegistration: extras.requiresRegistration === true,
      allowPublicRegistration: extras.allowPublicRegistration === true,
      eventType: extras.eventType || 'standard'
    };
  };

  // Afficher les détails d'un événement
  const showEventDetails = (event) => {
    setSelectedEvent(event);
    onDetailOpen();
  };

  return (
    <Box p={6}>
      <VStack spacing={6} align="stretch">
        {/* Header avec titre et actions principales */}
        <HStack justify="space-between">
          <VStack align="start" spacing={1}>
            <Heading size="lg">📅 Gestion des Événements</Heading>
            <Text fontSize="sm" color="gray.600">
              Vue d'ensemble et supervision de tous les événements
            </Text>
          </VStack>
          <HStack>
            <Button
              leftIcon={<FiRefreshCw />}
              onClick={fetchEvents}
              isLoading={loading}
              variant="outline"
              size="sm"
            >
              Actualiser
            </Button>
            <Button
              leftIcon={<FiDownload />}
              variant="outline"
              size="sm"
              isDisabled
              title="Export CSV (bientôt disponible)"
            >
              Exporter
            </Button>
            <Button
              as={RouterLink}
              to="/dashboard/evenements"
              leftIcon={<FiPlus />}
              colorScheme="blue"
            >
              Créer un événement
            </Button>
          </HStack>
        </HStack>

        {/* Statistiques */}
        <StatGroup>
          <Stat>
            <StatLabel>Total événements</StatLabel>
            <StatNumber color="blue.500">{stats.total}</StatNumber>
          </Stat>
          <Stat>
            <StatLabel>Publiés</StatLabel>
            <StatNumber color="green.500">{stats.published}</StatNumber>
          </Stat>
          <Stat>
            <StatLabel>Brouillons</StatLabel>
            <StatNumber color="gray.500">{stats.draft}</StatNumber>
          </Stat>
          <Stat>
            <StatLabel>À venir</StatLabel>
            <StatNumber color="orange.500">{stats.upcoming}</StatNumber>
          </Stat>
        </StatGroup>

        {/* Filtres et recherche */}
        <Card>
          <CardBody>
            <HStack spacing={4}>
              <InputGroup maxW="300px">
                <InputLeftElement>
                  <FiSearch color="gray.400" />
                </InputLeftElement>
                <Input
                  placeholder="Rechercher un événement..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
              
              <Select
                maxW="200px"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="ALL">Tous les statuts</option>
                <option value="PUBLISHED">Publiés</option>
                <option value="DRAFT">Brouillons</option>
                <option value="ARCHIVED">Archivés</option>
              </Select>

              <Text fontSize="sm" color="gray.500" ml="auto">
                {filteredEvents.length} événement{filteredEvents.length > 1 ? 's' : ''} affiché{filteredEvents.length > 1 ? 's' : ''}
              </Text>
            </HStack>
          </CardBody>
        </Card>

        {/* Liste des événements */}
        <Card>
          <CardHeader>
            <Heading size="md">📋 Liste des événements</Heading>
          </CardHeader>
          <CardBody>
            {loading ? (
              <Center py={10}>
                <VStack>
                  <Spinner size="lg" color="blue.500" />
                  <Text color="gray.600">Chargement des événements...</Text>
                </VStack>
              </Center>
            ) : filteredEvents.length === 0 ? (
              <Center py={10}>
                <VStack>
                  <Text fontSize="lg">📭</Text>
                  <Text color="gray.500">
                    {searchTerm || filterStatus !== 'ALL' 
                      ? 'Aucun événement ne correspond aux critères' 
                      : 'Aucun événement créé'
                    }
                  </Text>
                  {!searchTerm && filterStatus === 'ALL' && (
                    <Button
                      as={RouterLink}
                      to="/dashboard/evenements"
                      leftIcon={<FiPlus />}
                      colorScheme="blue"
                      size="sm"
                    >
                      Créer le premier événement
                    </Button>
                  )}
                </VStack>
              </Center>
            ) : (
              <Box overflowX="auto">
                <Table>
                  <Thead>
                    <Tr>
                      <Th>Événement</Th>
                      <Th>Date</Th>
                      <Th>Statut</Th>
                      <Th>Type</Th>
                      <Th>Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {filteredEvents.map(event => {
                      const info = getEventInfo(event);
                      return (
                        <Tr key={event.id} _hover={{ bg: 'gray.50' }}>
                          <Td>
                            <VStack align="start" spacing={1}>
                              <Text fontWeight="semibold" isTruncated maxW="250px">
                                {event.title}
                              </Text>
                              <Text fontSize="sm" color="gray.600" isTruncated maxW="250px">
                                {event.location || 'Lieu non défini'}
                              </Text>
                            </VStack>
                          </Td>
                          <Td>
                            <VStack align="start" spacing={1}>
                              <Text fontSize="sm">
                                {new Date(event.date).toLocaleDateString('fr-FR')}
                              </Text>
                              {event.time && (
                                <Text fontSize="xs" color="gray.500">
                                  {event.time}
                                </Text>
                              )}
                              {info.isUpcoming && (
                                <Badge colorScheme="blue" size="sm">À venir</Badge>
                              )}
                              {info.isPast && (
                                <Badge colorScheme="gray" size="sm">Passé</Badge>
                              )}
                            </VStack>
                          </Td>
                          <Td>{getStatusBadge(event.status)}</Td>
                          <Td>
                            <VStack align="start" spacing={1}>
                              {info.isVisible ? (
                                <Badge colorScheme="green" size="sm">Public</Badge>
                              ) : (
                                <Badge colorScheme="red" size="sm">Privé</Badge>
                              )}
                              {info.requiresRegistration && (
                                <Badge colorScheme="orange" size="sm">Inscription</Badge>
                              )}
                            </VStack>
                          </Td>
                          <Td>
                            <HStack spacing={1}>
                              <IconButton
                                aria-label="Voir détails"
                                icon={<FiEye />}
                                size="sm"
                                variant="ghost"
                                onClick={() => showEventDetails(event)}
                              />
                              <IconButton
                                as={RouterLink}
                                to={`/dashboard/evenements`}
                                aria-label="Modifier"
                                icon={<FiEdit />}
                                size="sm"
                                variant="ghost"
                                colorScheme="blue"
                              />
                              <IconButton
                                aria-label="Supprimer"
                                icon={<FiTrash2 />}
                                size="sm"
                                variant="ghost"
                                colorScheme="red"
                                onClick={() => console.log('Supprimer', event.id)}
                              />
                            </HStack>
                          </Td>
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
              </Box>
            )}
          </CardBody>
        </Card>

        {/* Informations utiles */}
        <Alert status="info" borderRadius="lg">
          <AlertIcon />
          <VStack align="start" spacing={1}>
            <Text fontWeight="semibold">💡 Gestion des événements</Text>
            <Text fontSize="sm">
              • Cette page permet de superviser tous les événements créés
            </Text>
            <Text fontSize="sm">
              • Utilisez "Créer un événement" pour ajouter de nouveaux événements
            </Text>
            <Text fontSize="sm">
              • Les événements publiés sont visibles sur le site public
            </Text>
          </VStack>
        </Alert>
      </VStack>

      {/* Modal détails événement */}
      <Modal isOpen={isDetailOpen} onClose={onDetailClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            📅 Détails de l'événement
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedEvent && (
              <VStack spacing={4} align="stretch">
                <Box>
                  <Text fontWeight="semibold" fontSize="lg">
                    {selectedEvent.title}
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    {selectedEvent.location || 'Lieu non défini'}
                  </Text>
                </Box>

                <Divider />

                <SimpleGrid columns={2} spacing={4}>
                  <Stat size="sm">
                    <StatLabel>Date</StatLabel>
                    <StatNumber fontSize="md">
                      {new Date(selectedEvent.date).toLocaleDateString('fr-FR')}
                    </StatNumber>
                  </Stat>
                  <Stat size="sm">
                    <StatLabel>Heure</StatLabel>
                    <StatNumber fontSize="md">
                      {selectedEvent.time || 'Non définie'}
                    </StatNumber>
                  </Stat>
                  <Stat size="sm">
                    <StatLabel>Statut</StatLabel>
                    <StatNumber fontSize="md">
                      {getStatusBadge(selectedEvent.status)}
                    </StatNumber>
                  </Stat>
                  <Stat size="sm">
                    <StatLabel>Visibilité</StatLabel>
                    <StatNumber fontSize="md">
                      {getEventInfo(selectedEvent).isVisible ? 'Public' : 'Privé'}
                    </StatNumber>
                  </Stat>
                </SimpleGrid>

                {selectedEvent.description && (
                  <>
                    <Divider />
                    <Box>
                      <Text fontWeight="semibold" mb={2}>Description :</Text>
                      <Text fontSize="sm" color="gray.700">
                        {selectedEvent.description}
                      </Text>
                    </Box>
                  </>
                )}
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button mr={3} onClick={onDetailClose}>
              Fermer
            </Button>
            {selectedEvent && (
              <Button
                as={RouterLink}
                to={`/dashboard/evenements`}
                colorScheme="blue"
                leftIcon={<FiEdit />}
              >
                Modifier
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}