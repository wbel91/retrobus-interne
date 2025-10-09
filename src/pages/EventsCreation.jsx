import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Heading,
  VStack,
  HStack,
  Button,
  SimpleGrid,
  Card,
  CardHeader,
  CardBody,
  Text,
  Badge,
  Flex,
  Spinner,
  Center,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Select,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Switch,
  Alert,
  AlertIcon,
  useToast,
  useDisclosure
} from '@chakra-ui/react';
import { FiPlus, FiEdit, FiList, FiGrid, FiCalendar, FiMapPin, FiDollarSign, FiUsers } from 'react-icons/fi';
import VehicleSelector from '../components/VehicleSelector';
import { eventsAPI, vehiculesAPI } from '../api/config.js';

// Templates d'événements avec thèmes
const EVENT_TEMPLATES = {
  public_info_only: {
    name: "Information publique",
    color: "blue",
    defaults: {
      isVisible: true,
      allowPublicRegistration: false,
      requiresRegistration: false,
      isFree: true,
      status: 'PUBLISHED'
    },
    description: "Événement visible par tous, sans inscription requise"
  },
  public_with_registration: {
    name: "Événement public avec inscription",
    color: "green",
    defaults: {
      isVisible: true,
      allowPublicRegistration: true,
      requiresRegistration: true,
      isFree: false,
      adultPrice: 15,
      childPrice: 8,
      registrationMethod: 'helloasso',
      status: 'PUBLISHED'
    },
    description: "Événement public avec inscription obligatoire via HelloAsso"
  },
  private_members_only: {
    name: "Réservé aux adhérents",
    color: "purple",
    defaults: {
      isVisible: false,
      allowPublicRegistration: false,
      requiresRegistration: true,
      isFree: true,
      registrationMethod: 'internal',
      status: 'PUBLISHED'
    },
    description: "Événement privé réservé aux membres de l'association"
  },
  pdf_download: {
    name: "Inscription par PDF",
    color: "teal",
    defaults: {
      isVisible: true,
      allowPublicRegistration: true,
      requiresRegistration: true,
      isFree: false,
      adultPrice: 12,
      childPrice: 6,
      registrationMethod: 'pdf',
      status: 'PUBLISHED'
    },
    description: "Événement public avec formulaire PDF à télécharger"
  }
};

const EventsCreation = () => {
  const [events, setEvents] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState('cards');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [editingEvent, setEditingEvent] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '',
    location: '',
    description: '',
    adultPrice: '',
    childPrice: '',
    helloAssoUrl: '',
    vehicleId: '',
    status: 'DRAFT',
    isVisible: true,
    allowPublicRegistration: false,
    requiresRegistration: false,
    isFree: true,
    maxParticipants: '',
    registrationDeadline: '',
    registrationMethod: 'none',
    pdfUrl: '',
    eventType: 'public_info_only'
  });

  // Récupération des données
  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const data = await eventsAPI.getAll();
      setEvents(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      toast({
        status: "error",
        title: "Erreur de chargement",
        description: "Impossible de charger les événements"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchVehicles = useCallback(async () => {
    try {
      const data = await vehiculesAPI.getAll();
      setVehicles(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setVehicles([]);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    fetchVehicles();
  }, [fetchEvents, fetchVehicles]);

  // Gestion du formulaire
  const resetForm = () => {
    setFormData({
      title: '',
      date: '',
      time: '',
      location: '',
      description: '',
      adultPrice: '',
      childPrice: '',
      helloAssoUrl: '',
      vehicleId: '',
      status: 'DRAFT',
      isVisible: true,
      allowPublicRegistration: false,
      requiresRegistration: false,
      isFree: true,
      maxParticipants: '',
      registrationDeadline: '',
      registrationMethod: 'none',
      pdfUrl: '',
      eventType: 'public_info_only'
    });
    setSelectedTemplate('');
  };

  const applyTemplate = (templateKey) => {
    const template = EVENT_TEMPLATES[templateKey];
    if (!template) return;

    setFormData(prev => ({
      ...prev,
      ...template.defaults,
      eventType: templateKey,
      // Conserver les champs déjà remplis
      title: prev.title,
      date: prev.date,
      time: prev.time,
      location: prev.location,
      description: prev.description,
      vehicleId: prev.vehicleId
    }));
    
    setSelectedTemplate(templateKey);
    
    toast({
      status: "info",
      title: "Template appliqué",
      description: template.description
    });
  };

  const handleCreate = () => {
    setEditingEvent(null);
    resetForm();
    onOpen();
  };

  const handleEdit = (event) => {
    setEditingEvent(event);
    
    // Parser les extras pour récupérer la configuration
    let extras = {};
    try {
      extras = event.extras ? JSON.parse(event.extras) : {};
    } catch (e) {
      console.log('Impossible de parser extras:', e);
    }

    setFormData({
      title: event.title || '',
      date: event.date ? event.date.split('T')[0] : '',
      time: event.time || '',
      location: event.location || '',
      description: event.description || '',
      adultPrice: event.adultPrice ? event.adultPrice.toString() : '',
      childPrice: event.childPrice ? event.childPrice.toString() : '',
      helloAssoUrl: event.helloAssoUrl || '',
      vehicleId: event.vehicleId || '',
      status: event.status || 'DRAFT',
      isVisible: extras.isVisible !== undefined ? extras.isVisible : true,
      allowPublicRegistration: extras.allowPublicRegistration || false,
      requiresRegistration: extras.requiresRegistration || false,
      isFree: extras.isFree !== undefined ? extras.isFree : true,
      maxParticipants: extras.maxParticipants ? extras.maxParticipants.toString() : '',
      registrationDeadline: extras.registrationDeadline || '',
      registrationMethod: extras.registrationMethod || 'none',
      pdfUrl: extras.pdfUrl || '',
      eventType: extras.eventType || 'public_info_only'
    });
    
    setSelectedTemplate(extras.eventType || '');
    onOpen();
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.date) {
      toast({
        status: "error",
        title: "Champs requis",
        description: "Le titre et la date sont obligatoires"
      });
      return;
    }

    try {
      setSaving(true);
      
      const eventData = {
        title: formData.title.trim(),
        date: formData.date,
        time: formData.time || null,
        location: formData.location.trim() || null,
        description: formData.description.trim() || null,
        adultPrice: formData.adultPrice ? parseFloat(formData.adultPrice) : null,
        childPrice: formData.childPrice ? parseFloat(formData.childPrice) : null,
        helloAssoUrl: formData.helloAssoUrl.trim() || null,
        vehicleId: formData.vehicleId || null,
        status: formData.status,
        extras: {
          isVisible: formData.isVisible,
          allowPublicRegistration: formData.allowPublicRegistration,
          requiresRegistration: formData.requiresRegistration,
          isFree: formData.isFree,
          maxParticipants: formData.maxParticipants ? parseInt(formData.maxParticipants) : null,
          registrationDeadline: formData.registrationDeadline || null,
          registrationMethod: formData.registrationMethod,
          pdfUrl: formData.pdfUrl || null,
          eventType: formData.eventType
        }
      };

      if (editingEvent) {
        await eventsAPI.update(editingEvent.id, eventData);
        toast({
          status: "success",
          title: "Événement modifié",
          description: "Les modifications ont été sauvegardées"
        });
      } else {
        // Pour la création, générer un ID automatique
        const eventId = formData.title.toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .replace(/\s+/g, '')
          .substring(0, 20) + new Date().getFullYear();
        
        await eventsAPI.create({ id: eventId, ...eventData });
        toast({
          status: "success",
          title: "Événement créé",
          description: "Le nouvel événement a été créé avec succès"
        });
      }

      fetchEvents();
      onClose();
      resetForm();
    } catch (e) {
      console.error(e);
      toast({
        status: "error",
        title: "Erreur de sauvegarde",
        description: "Impossible de sauvegarder l'événement"
      });
    } finally {
      setSaving(false);
    }
  };

  const testAPIConnection = async () => {
    const token = localStorage.getItem('token');
    console.log('🔍 Testing API connection...');
    
    if (!token) {
      toast({ status: "error", title: "Pas de token", description: "Veuillez vous reconnecter" });
      return;
    }

    try {
      const response = await fetch('https://refreshing-adaptation-rbe-serveurs.up.railway.app/events', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast({ status: "success", title: "API fonctionnelle", description: "La connexion API fonctionne" });
      } else {
        toast({ status: "error", title: "Erreur API", description: `Status: ${response.status}` });
      }
    } catch (error) {
      toast({ status: "error", title: "Erreur réseau", description: error.message });
    }
  };

  // Fonctions utilitaires pour l'affichage
  const getStatusBadge = (status) => {
    const configs = {
      DRAFT: { colorScheme: "gray", label: "Brouillon" },
      PUBLISHED: { colorScheme: "green", label: "Publié" },
      ARCHIVED: { colorScheme: "orange", label: "Archivé" }
    };
    const config = configs[status] || configs.DRAFT;
    return <Badge colorScheme={config.colorScheme}>{config.label}</Badge>;
  };

  const getEventTypeBadge = (event) => {
    const extras = typeof event.extras === 'string' ? JSON.parse(event.extras || '{}') : event.extras || {};
    const template = EVENT_TEMPLATES[extras.eventType];
    if (!template) return null;
    return <Badge colorScheme={template.color} variant="outline">{template.name}</Badge>;
  };

  const getVehicleName = (vehicleId) => {
    const vehicle = vehicles.find(v => v.parc === vehicleId);
    return vehicle ? `${vehicle.parc} - ${vehicle.modele}` : 'Aucun véhicule';
  };

  return (
    <Box p={6}>
      <Flex justify="space-between" align="center" mb={6}>
        <VStack align="start" spacing={1}>
          <Heading>📝 Création des Événements</Heading>
          <Text fontSize="sm" color="gray.600">
            Créez et configurez de nouveaux événements pour l'association
          </Text>
        </VStack>
        <HStack spacing={3}>
          <Button
            leftIcon={<FiEdit />}
            size="sm"
            colorScheme="purple"
            variant="outline"
            onClick={testAPIConnection}
          >
            Tester API
          </Button>
          <Button
            leftIcon={viewMode === 'cards' ? <FiList /> : <FiGrid />}
            size="sm"
            variant="outline"
            onClick={() => setViewMode(viewMode === 'cards' ? 'table' : 'cards')}
          >
            {viewMode === 'cards' ? 'Vue tableau' : 'Vue cartes'}
          </Button>
          <Button
            leftIcon={<FiPlus />}
            colorScheme="blue"
            onClick={handleCreate}
          >
            Nouvel événement
          </Button>
        </HStack>
      </Flex>

      {loading ? (
        <Center py={20}>
          <Spinner size="xl" />
        </Center>
      ) : events.length === 0 ? (
        <Center py={20}>
          <VStack spacing={4}>
            <Text color="gray.500" fontSize="lg">Aucun événement trouvé</Text>
            <Button leftIcon={<FiPlus />} colorScheme="blue" onClick={handleCreate}>
              Créer le premier événement
            </Button>
          </VStack>
        </Center>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
          {events.map((event) => (
            <Card key={event.id} shadow="md" position="relative">
              <CardHeader pb={2}>
                <VStack align="start" spacing={2}>
                  <HStack justify="space-between" w="100%">
                    <Heading size="md" noOfLines={2} flex={1}>{event.title}</Heading>
                  </HStack>
                  <HStack spacing={2} wrap="wrap">
                    {getStatusBadge(event.status)}
                    {getEventTypeBadge(event)}
                  </HStack>
                </VStack>
              </CardHeader>
              <CardBody pt={0}>
                <VStack align="start" spacing={2}>
                  <HStack>
                    <FiCalendar />
                    <Text fontSize="sm">
                      {event.date} {event.time && `à ${event.time}`}
                    </Text>
                  </HStack>
                  
                  {event.location && (
                    <HStack>
                      <FiMapPin />
                      <Text fontSize="sm">{event.location}</Text>
                    </HStack>
                  )}

                  {event.vehicleId && (
                    <HStack>
                      <Text fontSize="sm">🚌</Text>
                      <Text fontSize="sm" fontWeight="semibold" color="blue.600">
                        {getVehicleName(event.vehicleId)}
                      </Text>
                    </HStack>
                  )}
                  
                  {event.description && (
                    <Text fontSize="sm" color="gray.600" noOfLines={3}>
                      {event.description}
                    </Text>
                  )}

                  <Button
                    size="sm"
                    colorScheme="blue"
                    variant="outline"
                    onClick={() => handleEdit(event)}
                    w="100%"
                  >
                    Modifier
                  </Button>
                </VStack>
              </CardBody>
            </Card>
          ))}
        </SimpleGrid>
      )}

      {/* Modal de création/modification */}
      <Modal isOpen={isOpen} onClose={onClose} size="6xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {editingEvent ? 'Modifier l\'événement' : 'Créer un nouvel événement'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Tabs>
              <TabList>
                <Tab>Informations de base</Tab>
                <Tab>Configuration</Tab>
                <Tab>Inscription & Prix</Tab>
              </TabList>

              <TabPanels>
                {/* Onglet 1: Informations de base */}
                <TabPanel>
                  <VStack spacing={4}>
                    {/* Templates de démarrage rapide */}
                    <Alert status="info">
                      <AlertIcon />
                      <Box>
                        <Text fontWeight="bold" mb={2}>Démarrage rapide :</Text>
                        <HStack spacing={2} wrap="wrap">
                          {Object.entries(EVENT_TEMPLATES).map(([key, template]) => (
                            <Button
                              key={key}
                              size="sm"
                              colorScheme={template.color}
                              variant={selectedTemplate === key ? "solid" : "outline"}
                              onClick={() => applyTemplate(key)}
                            >
                              {template.name}
                            </Button>
                          ))}
                        </HStack>
                      </Box>
                    </Alert>

                    <FormControl isRequired>
                      <FormLabel>Titre</FormLabel>
                      <Input
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Nom de l'événement"
                      />
                    </FormControl>

                    <HStack w="100%" spacing={4}>
                      <FormControl isRequired>
                        <FormLabel>Date</FormLabel>
                        <Input
                          type="date"
                          value={formData.date}
                          onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Heure</FormLabel>
                        <Input
                          type="time"
                          value={formData.time}
                          onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                        />
                      </FormControl>
                    </HStack>

                    <FormControl>
                      <FormLabel>Lieu</FormLabel>
                      <Input
                        value={formData.location}
                        onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                        placeholder="Lieu de l'événement"
                      />
                    </FormControl>

                    {/* Sélecteur de véhicule amélioré */}
                    <VehicleSelector
                      value={formData.vehicleId}
                      onChange={(vehicleId) => setFormData(prev => ({ ...prev, vehicleId }))}
                    />

                    <FormControl>
                      <FormLabel>Description</FormLabel>
                      <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Description de l'événement"
                        rows={4}
                      />
                    </FormControl>
                  </VStack>
                </TabPanel>

                {/* Onglet 2: Configuration */}
                <TabPanel>
                  <VStack spacing={4}>
                    <FormControl>
                      <FormLabel>Statut</FormLabel>
                      <Select
                        value={formData.status}
                        onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                      >
                        <option value="DRAFT">Brouillon</option>
                        <option value="PUBLISHED">Publié</option>
                        <option value="ARCHIVED">Archivé</option>
                      </Select>
                    </FormControl>

                    <FormControl display="flex" alignItems="center">
                      <FormLabel mb="0">
                        Visible sur le site public
                      </FormLabel>
                      <Switch
                        isChecked={formData.isVisible}
                        onChange={(e) => setFormData(prev => ({ ...prev, isVisible: e.target.checked }))}
                      />
                    </FormControl>

                    <FormControl display="flex" alignItems="center">
                      <FormLabel mb="0">
                        Inscription requise
                      </FormLabel>
                      <Switch
                        isChecked={formData.requiresRegistration}
                        onChange={(e) => setFormData(prev => ({ ...prev, requiresRegistration: e.target.checked }))}
                      />
                    </FormControl>

                    {formData.requiresRegistration && (
                      <FormControl>
                        <FormLabel>Méthode d'inscription</FormLabel>
                        <Select
                          value={formData.registrationMethod}
                          onChange={(e) => setFormData(prev => ({ ...prev, registrationMethod: e.target.value }))}
                        >
                          <option value="none">Aucune</option>
                          <option value="helloasso">HelloAsso</option>
                          <option value="pdf">Formulaire PDF</option>
                          <option value="internal">Système interne</option>
                        </Select>
                      </FormControl>
                    )}
                  </VStack>
                </TabPanel>

                {/* Onglet 3: Inscription & Prix */}
                <TabPanel>
                  <VStack spacing={4}>
                    <FormControl display="flex" alignItems="center">
                      <FormLabel mb="0">
                        Événement gratuit
                      </FormLabel>
                      <Switch
                        isChecked={formData.isFree}
                        onChange={(e) => setFormData(prev => ({ ...prev, isFree: e.target.checked }))}
                      />
                    </FormControl>

                    {!formData.isFree && (
                      <HStack w="100%" spacing={4}>
                        <FormControl>
                          <FormLabel>Prix adulte (€)</FormLabel>
                          <Input
                            type="number"
                            step="0.01"
                            value={formData.adultPrice}
                            onChange={(e) => setFormData(prev => ({ ...prev, adultPrice: e.target.value }))}
                            placeholder="0.00"
                          />
                        </FormControl>
                        <FormControl>
                          <FormLabel>Prix enfant (€)</FormLabel>
                          <Input
                            type="number"
                            step="0.01"
                            value={formData.childPrice}
                            onChange={(e) => setFormData(prev => ({ ...prev, childPrice: e.target.value }))}
                            placeholder="0.00"
                          />
                        </FormControl>
                      </HStack>
                    )}

                    <FormControl>
                      <FormLabel>Nombre maximum de participants</FormLabel>
                      <Input
                        type="number"
                        value={formData.maxParticipants}
                        onChange={(e) => setFormData(prev => ({ ...prev, maxParticipants: e.target.value }))}
                        placeholder="Illimité"
                      />
                    </FormControl>

                    {formData.registrationMethod === 'helloasso' && (
                      <FormControl>
                        <FormLabel>URL HelloAsso</FormLabel>
                        <Input
                          value={formData.helloAssoUrl}
                          onChange={(e) => setFormData(prev => ({ ...prev, helloAssoUrl: e.target.value }))}
                          placeholder="https://www.helloasso.com/..."
                        />
                      </FormControl>
                    )}

                    {formData.registrationMethod === 'pdf' && (
                      <FormControl>
                        <FormLabel>URL du formulaire PDF</FormLabel>
                        <Input
                          value={formData.pdfUrl}
                          onChange={(e) => setFormData(prev => ({ ...prev, pdfUrl: e.target.value }))}
                          placeholder="https://exemple.com/formulaire.pdf"
                        />
                      </FormControl>
                    )}
                  </VStack>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => { onClose(); resetForm(); }}>
              Annuler
            </Button>
            <Button colorScheme="blue" onClick={handleSave} isLoading={saving}>
              {editingEvent ? 'Modifier' : 'Créer'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default EventsCreation;