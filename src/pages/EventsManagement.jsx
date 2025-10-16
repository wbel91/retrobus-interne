import React, { useState, useEffect, useRef } from 'react';
import {
  Container, VStack, HStack, Heading, Text, Button, Card, CardHeader, CardBody,
  Table, Thead, Tbody, Tr, Th, Td, Badge, IconButton, Modal, ModalOverlay,
  ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  useDisclosure, Spinner, Center, SimpleGrid, Stat, StatLabel, StatNumber,
  Input, Select, InputGroup, InputLeftElement, Tooltip, Tabs, TabList,
  Tab, TabPanels, TabPanel, FormControl, FormLabel, NumberInput,
  NumberInputField, NumberInputStepper, NumberIncrementStepper,
  NumberDecrementStepper, Progress, Alert, AlertIcon, useToast,
  AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader,
  AlertDialogContent, AlertDialogOverlay, Grid, Divider, Code,
  Box, Flex
} from '@chakra-ui/react';
import {
  FiEye, FiEdit, FiTrash2, FiPlus, FiUsers, FiMapPin, FiClock,
  FiTruck, FiUser, FiDownload, FiRefreshCw, FiSearch, FiSave,
  FiUserPlus, FiCheckCircle, FiAlertCircle, FiAlertTriangle,
  FiDollarSign, FiMap, FiUserCheck, FiKey, FiNavigation
} from 'react-icons/fi';
import { Link as RouterLink } from 'react-router-dom';
import { eventsAPI } from "../api/index.js";
import { membersAPI } from "../api/members.js";

const EventsManagement = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Données des membres disponibles
  const [availableMembers, setAvailableMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  
  // Formulaire nouveau participant
  const [newParticipant, setNewParticipant] = useState({
    name: '',
    email: '',
    phone: '',
    type: 'adult',
    status: 'pending',
    memberNumber: '' // Nouveau champ pour les adhérents
  });
  const [addingParticipant, setAddingParticipant] = useState(false);
  
  // États pour les données détaillées - stockage par événement
  const [eventData, setEventData] = useState({});
  const [participants, setParticipants] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [presentMembers, setPresentMembers] = useState([]);
  const [eventFinances, setEventFinances] = useState({
    revenue: 0,
    expenses: 0,
    profit: 0
  });
  
  // États pour l'édition des trajets
  const [editingRoute, setEditingRoute] = useState(null);
  const [routeCapacityEdit, setRouteCapacityEdit] = useState(false);
  const [routeForm, setRouteForm] = useState({
    name: '',
    capacity: 0,
    vehicle: '',
    driver: '',
    stops: []
  });
  const [newStop, setNewStop] = useState({ time: '', name: '', address: '' });
  const { isOpen: isMapOpen, onOpen: onMapOpen, onClose: onMapClose } = useDisclosure();

  const routeFormUpdateStop = (index, field, value) => {
    setRouteForm(prev => {
      const current = Array.isArray(prev.stops) ? prev.stops : [];
      const next = [...current];
      next[index] = { ...(next[index] || {}), [field]: value };
      return { ...prev, stops: next };
    });
  };

  const routeFormRemoveStop = (index) => {
    setRouteForm(prev => {
      const current = Array.isArray(prev.stops) ? prev.stops : [];
      const next = current.filter((_, i) => i !== index);
      return { ...prev, stops: next };
    });
  };

  const routeFormAddStop = () => {
    if (!newStop?.name || !newStop?.time) return;
    setRouteForm(prev => ({
      ...prev,
      stops: [...(Array.isArray(prev.stops) ? prev.stops : []), { ...newStop }]
    }));
    setNewStop({ time: '', name: '', address: '' });
  };

  const saveRoute = async () => {
    setSaving(true);
    try {
      if (editingRoute != null) {
        setRoutes(prev => prev.map((r, i) => (i === editingRoute ? { ...routeForm } : r)));
      } else {
        setRoutes(prev => [...prev, { ...routeForm }]);
      }
      onRouteEditClose();
    } catch (e) {
      console.error('saveRoute error', e);
    } finally {
      setSaving(false);
    }
  };

  const generateRouteFromMap = () => {
    toast({ status: 'info', title: 'Génération automatique à venir' });
  };
  
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    upcoming: 0,
    totalRevenue: 0,
    totalParticipants: 0
  });

  const toast = useToast();
  const { isOpen: isDetailOpen, onOpen: onDetailOpen, onClose: onDetailClose } = useDisclosure();
  const { isOpen: isAddParticipantOpen, onOpen: onAddParticipantOpen, onClose: onAddParticipantClose } = useDisclosure();
  const { isOpen: isRouteEditOpen, onOpen: onRouteEditOpen, onClose: onRouteEditClose } = useDisclosure();
  const { isOpen: isMemberModalOpen, onOpen: onMemberModalOpen, onClose: onMemberModalClose } = useDisclosure();
  const cancelRef = useRef();

  // Chargement des données
  useEffect(() => {
    fetchEvents();
    loadAvailableMembers();
  }, []);

  const loadAvailableMembers = async () => {
    setLoadingMembers(true);
    try {
      const response = await membersAPI.getAll({ limit: 1000 });
      setAvailableMembers(response.members || []);
    } catch (error) {
      console.error('Erreur chargement membres:', error);
    } finally {
      setLoadingMembers(false);
    }
  };

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const data = await eventsAPI.getAll();
      const eventsData = Array.isArray(data) ? data : [];
      setEvents(eventsData);
      
      const now = new Date();
      const publishedEvents = eventsData.filter(e => e.status === 'PUBLISHED');
      const upcomingEvents = eventsData.filter(e => new Date(e.date) > now && e.status === 'PUBLISHED');
      
      // Calculer les statistiques réelles basées sur les données stockées
      let totalParticipants = 0;
      let totalRevenue = 0;
      
      eventsData.forEach(event => {
        const storedData = eventData[event.id];
        if (storedData?.participants) {
          const confirmedParticipants = storedData.participants.filter(p => p.status === 'confirmed');
          totalParticipants += confirmedParticipants.length;
          
          const adultPrice = parseFloat(event.adultPrice) || 0;
          const childPrice = parseFloat(event.childPrice) || 0;
          const adultCount = confirmedParticipants.filter(p => p.type === 'adult').length;
          const childCount = confirmedParticipants.filter(p => p.type === 'child').length;
          totalRevenue += (adultPrice * adultCount) + (childPrice * childCount);
        }
      });

      setStats({
        total: eventsData.length,
        published: publishedEvents.length,
        upcoming: upcomingEvents.length,
        totalRevenue: Math.round(totalRevenue),
        totalParticipants
      });
    } catch (error) {
      console.error('Erreur chargement événements:', error);
      toast({
        title: "Erreur de chargement",
        description: "Impossible de charger les événements",
        status: "error",
        duration: 5000
      });
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  // Génération de matricule de connexion
  const generateLoginMatricule = (memberData) => {
    const year = new Date().getFullYear().toString().slice(-2);
    const initials = (memberData.firstName.charAt(0) + memberData.lastName.charAt(0)).toUpperCase();
    const randomNum = Math.floor(Math.random() * 9000) + 1000;
    return `RBE${year}${initials}${randomNum}`;
  };

  const generateTemporaryPassword = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  // Mise à jour d'un événement
  const updateEvent = async (eventId, updates) => {
    try {
      await eventsAPI.update(eventId, updates);
      
      setEvents(prev => prev.map(event => 
        event.id === eventId ? { ...event, ...updates } : event
      ));
      
      toast({
        title: "Événement mis à jour",
        status: "success",
        duration: 2000
      });
    } catch (error) {
      console.error('Erreur mise à jour:', error);
      toast({
        title: "Erreur de mise à jour",
        description: "Impossible de mettre à jour l'événement",
        status: "error",
        duration: 5000
      });
    }
  };

  // Sauvegarde des modifications avec logs
  const saveEventChanges = async () => {
    if (!selectedEvent) return;
    
    setSaving(true);
    try {
      const dataToSave = {
        participants,
        routes,
        presentMembers,
        eventFinances,
        lastModified: new Date().toISOString(),
        modifiedBy: 'current-user' // TODO: récupérer l'utilisateur connecté
      };
      
      // Sauvegarder les données de l'événement
      setEventData(prev => ({
        ...prev,
        [selectedEvent.id]: dataToSave
      }));
      
      // Créer des logs d'activité
      const activityLogs = [];
      
      // Log des participants
      if (participants.length > 0) {
        activityLogs.push({
          type: 'participant_management',
          eventId: selectedEvent.id,
          eventTitle: selectedEvent.title,
          details: `Gestion de ${participants.length} participants (${participants.filter(p => p.status === 'confirmed').length} confirmés)`,
          timestamp: new Date().toISOString(),
          userId: 'current-user'
        });
      }
      
      // Log de l'équipe
      const presentCount = presentMembers.filter(m => m.status === 'present' && m.name).length;
      if (presentCount > 0) {
        activityLogs.push({
          type: 'team_management',
          eventId: selectedEvent.id,
          eventTitle: selectedEvent.title,
          details: `Équipe organisée : ${presentCount} membres présents`,
          timestamp: new Date().toISOString(),
          userId: 'current-user'
        });
      }
      
      // Log financier
      if (eventFinances.revenue > 0) {
        activityLogs.push({
          type: 'financial_tracking',
          eventId: selectedEvent.id,
          eventTitle: selectedEvent.title,
          details: `Finances : ${eventFinances.revenue}€ de revenus, ${eventFinances.profit}€ de bénéfice`,
          timestamp: new Date().toISOString(),
          userId: 'current-user'
        });
      }
      
      // TODO: Envoyer les logs à l'API
      // await eventsAPI.saveLogs(activityLogs);
      
      toast({
        title: "Modifications sauvegardées",
        description: "Les données de l'événement ont été sauvegardées avec succès",
        status: "success",
        duration: 3000
      });
      
      await fetchEvents();
      
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      toast({
        title: "Erreur de sauvegarde",
        description: "Impossible de sauvegarder les modifications",
        status: "error",
        duration: 5000
      });
    } finally {
      setSaving(false);
    }
  };

  // Gestion des participants avec système de membres
  const resetParticipantForm = () => {
    setNewParticipant({
      name: '',
      email: '',
      phone: '',
      type: 'adult',
      status: 'pending',
      memberNumber: ''
    });
  };

  const addParticipant = async () => {
    // Validation
    if (!newParticipant.name.trim()) {
      toast({
        title: "Nom requis",
        description: "Le nom est obligatoire",
        status: "warning",
        duration: 3000
      });
      return;
    }
    
    if (!newParticipant.email.trim()) {
      toast({
        title: "Email requis",
        description: "L'email est obligatoire",
        status: "warning",
        duration: 3000
      });
      return;
    }
    
    // Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newParticipant.email)) {
      toast({
        title: "Email invalide",
        description: "Veuillez saisir un email valide",
        status: "warning",
        duration: 3000
      });
      return;
    }

    // Vérifier si l'email existe déjà
    const emailExists = participants.some(p => p.email.toLowerCase() === newParticipant.email.toLowerCase());
    if (emailExists) {
      toast({
        title: "Email déjà utilisé",
        description: "Cet email est déjà enregistré pour cet événement",
        status: "warning",
        duration: 3000
      });
      return;
    }

    // Vérifier les places disponibles
    const totalCapacity = routes.reduce((sum, route) => sum + route.capacity, 0);
    const confirmedParticipants = participants.filter(p => p.status === 'confirmed').length;
    
    if (newParticipant.status === 'confirmed' && confirmedParticipants >= totalCapacity) {
      toast({
        title: "Plus de places disponibles",
        description: `Capacité maximale atteinte (${totalCapacity} places)`,
        status: "error",
        duration: 5000
      });
      return;
    }

    setAddingParticipant(true);
    
    try {
      // Rechercher le membre correspondant si un matricule est fourni
      let memberInfo = null;
      if (newParticipant.memberNumber) {
        memberInfo = availableMembers.find(m => m.memberNumber === newParticipant.memberNumber);
        if (!memberInfo) {
          toast({
            title: "Matricule non trouvé",
            description: "Aucun membre avec ce matricule n'a été trouvé",
            status: "warning",
            duration: 3000
          });
          return;
        }
      }

      const participant = {
        id: Date.now(),
        ...newParticipant,
        registrationDate: new Date().toISOString(),
        isMember: !!memberInfo,
        memberInfo: memberInfo
      };

      setParticipants(prev => [...prev, participant]);
      resetParticipantForm();
      onAddParticipantClose();
      
      toast({
        title: "Participant ajouté",
        description: `${participant.name} a été ajouté avec succès ${memberInfo ? '(Membre RBE)' : ''}`,
        status: "success",
        duration: 3000
      });
      
      await loadEventFinances(selectedEvent.id);
      
    } catch (error) {
      console.error('Erreur ajout participant:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le participant",
        status: "error",
        duration: 5000
      });
    } finally {
      setAddingParticipant(false);
    }
  };

  const updateParticipant = (participantId, updates) => {
    setParticipants(prev => 
      prev.map(p => p.id === participantId ? { ...p, ...updates } : p)
    );
    
    toast({
      title: "Participant mis à jour",
      status: "success",
      duration: 2000
    });
    
    if (updates.status || updates.type) {
      loadEventFinances(selectedEvent.id);
    }
  };

  const deleteParticipant = (participantId) => {
    setParticipants(prev => prev.filter(p => p.id !== participantId));
    toast({
      title: "Participant supprimé",
      status: "success",
      duration: 2000
    });
    
    loadEventFinances(selectedEvent.id);
  };

  const clearParticipants = () => {
    setParticipants([]);
    toast({
      title: "Liste vidée",
      description: "Tous les participants ont été supprimés",
      status: "info",
      duration: 2000
    });
    
    loadEventFinances(selectedEvent.id);
  };

  // Gestion des trajets
  const updateRouteCapacity = (routeId, newCapacity) => {
    setRoutes(prev => prev.map(route => 
      route.id === routeId ? { ...route, capacity: parseInt(newCapacity) || 0 } : route
    ));
  };

  const updateRouteField = (routeId, field, value) => {
    setRoutes(prev => prev.map(route => 
      route.id === routeId ? { ...route, [field]: value } : route
    ));
  };

  const addStop = (routeId) => {
    setRoutes(prev => prev.map(route => 
      route.id === routeId 
        ? { 
            ...route, 
            stops: [...route.stops, { name: '', time: '', address: '' }] 
          } 
        : route
    ));
  };

  const updateStop = (routeId, stopIndex, field, value) => {
    setRoutes(prev => prev.map(route => 
      route.id === routeId 
        ? { 
            ...route, 
            stops: route.stops.map((stop, idx) => 
              idx === stopIndex ? { ...stop, [field]: value } : stop
            ) 
          } 
        : route
    ));
  };

  const removeStop = (routeId, stopIndex) => {
    setRoutes(prev => prev.map(route => 
      route.id === routeId 
        ? { 
            ...route, 
            stops: route.stops.filter((_, idx) => idx !== stopIndex) 
          } 
        : route
    ));
  };

  const addNewRoute = () => {
    const newRoute = {
      id: Date.now(),
      name: `Circuit ${routes.length + 1}`,
      vehicle: selectedEvent?.vehicleId || "Bus RBE",
      driver: "",
      stops: [
        { name: "Point de départ", time: "09:00", address: "Villebon-sur-Yvette" },
        { name: selectedEvent?.location || "Destination", time: "10:00", address: selectedEvent?.location || "Lieu de l'événement" }
      ],
      capacity: 45,
      occupancy: 0
    };
    setRoutes(prev => [...prev, newRoute]);
  };

  // Gestion de l'équipe avec connexion aux membres
  const assignMemberToRole = (roleId, member) => {
    setPresentMembers(prev =>
      prev.map(m => 
        m.id === roleId 
          ? { 
              ...m, 
              name: `${member.firstName} ${member.lastName}`,
              memberInfo: member,
              assignedMemberId: member.id
            }
          : m
      )
    );
    
    toast({
      title: "Membre assigné",
      description: `${member.firstName} ${member.lastName} assigné au rôle`,
      status: "success",
      duration: 2000
    });
  };

  const toggleMemberPresence = (memberId) => {
    setPresentMembers(prev =>
      prev.map(member => 
        member.id === memberId 
          ? { 
              ...member, 
              status: member.status === 'present' ? 'absent' : 'present',
              arrivalTime: member.status === 'absent' 
                ? new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) 
                : null
            }
          : member
      )
    );
  };

  const createMemberAccess = async (member) => {
    try {
      const loginMatricule = generateLoginMatricule(member);
      const tempPassword = generateTemporaryPassword();
      
      // TODO: Appel API pour créer l'accès
      // await membersAPI.createAccess(member.id, { loginMatricule, tempPassword });
      
      toast({
        title: "Accès créé",
        description: `Matricule: ${loginMatricule} - Mot de passe temporaire généré`,
        status: "success",
        duration: 5000
      });
      
      // Copier les identifiants dans le presse-papiers
      navigator.clipboard.writeText(`Matricule: ${loginMatricule}\nMot de passe: ${tempPassword}`);
      
    } catch (error) {
      console.error('Erreur création accès:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer l'accès membre",
        status: "error",
        duration: 5000
      });
    }
  };

  const openEventManagement = async (event) => {
    setSelectedEvent(event);
    
    const savedData = eventData[event.id];
    
    if (savedData) {
      setParticipants(savedData.participants || []);
      setRoutes(savedData.routes || []);
      setPresentMembers(savedData.presentMembers || []);
      setEventFinances(savedData.eventFinances || { revenue: 0, expenses: 0, profit: 0 });
    } else {
      setParticipants([]);
      setRoutes([{
        id: 1,
        name: "Circuit Principal",
        vehicle: event.vehicleId || "Bus RBE",
        driver: "",
        stops: [
          { name: "Point de départ", time: "09:00", address: "Villebon-sur-Yvette" },
          { name: event.location || "Destination", time: "10:00", address: event.location || "Lieu de l'événement" }
        ],
        capacity: 45,
        occupancy: 0
      }]);
      setPresentMembers([
        { id: 1, name: "", role: "Responsable", status: "absent", arrivalTime: null },
        { id: 2, name: "", role: "Guide", status: "absent", arrivalTime: null },
        { id: 3, name: "", role: "Sécurité", status: "absent", arrivalTime: null },
        { id: 4, name: "", role: "Accueil", status: "absent", arrivalTime: null }
      ]);
      setEventFinances({ revenue: 0, expenses: 0, profit: 0 });
    }
    
    onDetailOpen();
  };

  const loadEventFinances = async (eventId) => {
    try {
      const selectedEventData = events.find(e => e.id === eventId);
      const adultPrice = parseFloat(selectedEventData?.adultPrice) || 0;
      const childPrice = parseFloat(selectedEventData?.childPrice) || 0;
      
      const confirmedParticipants = participants.filter(p => p.status === 'confirmed');
      const adultCount = confirmedParticipants.filter(p => p.type === 'adult').length;
      const childCount = confirmedParticipants.filter(p => p.type === 'child').length;
      
      const revenue = (adultPrice * adultCount) + (childPrice * childCount);
      const expenses = Math.round(revenue * 0.25);
      const profit = revenue - expenses;

      const finances = {
        revenue,
        expenses,
        profit,
        breakdown: {
          adultTickets: { count: adultCount, price: adultPrice, total: adultPrice * adultCount },
          childTickets: { count: childCount, price: childPrice, total: childPrice * childCount },
          expenses: [
            { category: "Transport", amount: Math.round(expenses * 0.6) },
            { category: "Encadrement", amount: Math.round(expenses * 0.25) },
            { category: "Divers", amount: Math.round(expenses * 0.15) }
          ]
        }
      };
      
      setEventFinances(finances);
      
      setRoutes(prev => prev.map(route => ({
        ...route,
        occupancy: confirmedParticipants.length
      })));
      
    } catch (error) {
      console.error('Erreur chargement finances:', error);
    }
  };

  // Fonctions utilitaires
  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.location?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || event.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    const configs = {
      DRAFT: { colorScheme: "gray", label: "Brouillon" },
      PUBLISHED: { colorScheme: "green", label: "Publié" },
      ARCHIVED: { colorScheme: "orange", label: "Archivé" }
    };
    const config = configs[status] || configs.DRAFT;
    return <Badge colorScheme={config.colorScheme}>{config.label}</Badge>;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Date non définie';
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return 'Date invalide';
    }
  };

  const getEventParticipantCount = (event) => {
    const savedData = eventData[event.id];
    if (savedData?.participants) {
      return savedData.participants.filter(p => p.status === 'confirmed').length;
    }
    return 0;
  };

  const getEventRevenue = (event) => {
    const savedData = eventData[event.id];
    if (savedData?.participants) {
      const confirmedParticipants = savedData.participants.filter(p => p.status === 'confirmed');
      const adultCount = confirmedParticipants.filter(p => p.type === 'adult').length;
      const childCount = confirmedParticipants.filter(p => p.type === 'child').length;
      return ((event.adultPrice || 0) * adultCount) + ((event.childPrice || 0) * childCount);
    }
    return 0;
  };

  // États HelloAsso (à ajouter avec les autres états en haut du composant)
  const [helloAssoSettings, setHelloAssoSettings] = useState({
    eventUrl: '',
    formId: '',
    organizationSlug: '',
    eventSlug: '',
    accessToken: ''
  });

  const [helloAssoParticipants, setHelloAssoParticipants] = useState([]);
  const [loadingHelloAsso, setLoadingHelloAsso] = useState(false);

  // Configuration HelloAsso
  const HELLOASSO_CONFIG = {
    clientId: import.meta.env.VITE_HELLOASSO_CLIENT_ID || '',
    clientSecret: import.meta.env.VITE_HELLOASSO_CLIENT_SECRET || '',
    apiUrl: 'https://api.helloasso.com/v5',
    authUrl: 'https://api.helloasso.com/oauth2/token'
  };

  // Fonctions HelloAsso
  const authenticateHelloAsso = async () => {
    try {
      const response = await fetch(HELLOASSO_CONFIG.authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: HELLOASSO_CONFIG.clientId,
          client_secret: HELLOASSO_CONFIG.clientSecret,
          grant_type: 'client_credentials'
        })
      });

      if (!response.ok) {
        throw new Error('Authentification HelloAsso échouée');
      }

      const data = await response.json();
      const accessToken = data.access_token;
      
      setHelloAssoSettings(prev => ({ ...prev, accessToken }));
      return accessToken;
    } catch (error) {
      console.error('❌ Erreur authentification HelloAsso:', error);
      throw new Error('Échec de l\'authentification HelloAsso');
    }
  };

  const fetchHelloAssoParticipants = async (eventSlug, organizationSlug) => {
    try {
      setLoadingHelloAsso(true);
      
      let accessToken = helloAssoSettings.accessToken;
      if (!accessToken) {
        accessToken = await authenticateHelloAsso();
      }

      const response = await fetch(
        `${HELLOASSO_CONFIG.apiUrl}/organizations/${organizationSlug}/forms/Event/${eventSlug}/orders`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Erreur HelloAsso API: ${response.status}`);
      }

      const result = await response.json();
      const orders = result.data || [];
      const participants = [];

      orders.forEach(order => {
        order.items.forEach(item => {
          const participant = {
            id: `helloasso-${order.id}-${item.id}`,
            name: `${order.payer.firstName} ${order.payer.lastName}`,
            email: order.payer.email,
            phone: order.payer.phoneNumber || '',
            amount: item.amount / 100,
            status: 'confirmed',
            source: 'helloasso',
            orderDate: order.date,
            orderNumber: order.id,
            itemName: item.name,
            customFields: item.customFields || []
          };

          // Traiter les champs personnalisés
          item.customFields?.forEach(field => {
            if (field.name.toLowerCase().includes('téléphone')) {
              participant.phone = field.answer;
            }
            if (field.name.toLowerCase().includes('age')) {
              participant.age = field.answer;
            }
          });

          participants.push(participant);
        });
      });

      setHelloAssoParticipants(participants);
      
      toast({
        status: 'success',
        title: 'Participants HelloAsso chargés',
        description: `${participants.length} participant(s) trouvé(s)`,
        duration: 3000
      });

      return participants;

    } catch (error) {
      console.error('❌ Erreur récupération HelloAsso:', error);
      toast({
        status: 'error',
        title: 'Erreur HelloAsso',
        description: error.message || 'Impossible de récupérer les participants',
        duration: 5000
      });
      return [];
    } finally {
      setLoadingHelloAsso(false);
    }
  };

  const saveHelloAssoSettings = async (eventId, settings) => {
    try {
      setSaving(true);
      
      const response = await fetch(`${eventsAPI.baseURL}/events/${eventId}/helloasso`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          eventUrl: settings.eventUrl,
          organizationSlug: settings.organizationSlug,
          eventSlug: settings.eventSlug,
          formId: settings.formId
        })
      });

      if (!response.ok) {
        throw new Error('Erreur sauvegarde HelloAsso');
      }

      toast({
        status: 'success',
        title: 'Paramètres HelloAsso sauvegardés',
        description: 'La configuration HelloAsso a été mise à jour',
        duration: 3000
      });

      // Recharger les données de l'événement
      await fetchEventDetails(eventId);

    } catch (error) {
      console.error('❌ Erreur sauvegarde HelloAsso:', error);
      toast({
        status: 'error',
        title: 'Erreur',
        description: 'Impossible de sauvegarder les paramètres HelloAsso',
        duration: 5000
      });
    } finally {
      setSaving(false);
    }
  };

  // Composant HelloAsso corrigé (remplacer les déclarations existantes)
  const HelloAssoManagement = ({ event }) => {
    const [localSettings, setLocalSettings] = useState({
      eventUrl: event?.helloAssoUrl || '',
      organizationSlug: event?.helloAssoOrg || '',
      eventSlug: event?.helloAssoEvent || '',
      formId: event?.helloAssoFormId || ''
    });

    const handleUrlParse = (url) => {
      const match = url.match(/helloasso\.com\/associations\/([^\/]+)\/evenements\/([^\/?\s]+)/);
      if (match) {
        setLocalSettings(prev => ({
          ...prev,
          eventUrl: url,
          organizationSlug: match[1],
          eventSlug: match[2]
        }));
        
        toast({
          status: 'success',
          title: 'URL analysée',
          description: `Organisation: ${match[1]}, Événement: ${match[2]}`,
          duration: 3000
        });
      } else {
        toast({
          status: 'warning',
          title: 'URL non reconnue',
          description: 'Vérifiez le format de l\'URL HelloAsso',
          duration: 3000
        });
      }
    };

    const handleSyncParticipants = async () => {
      if (!localSettings.organizationSlug || !localSettings.eventSlug) {
        toast({
          status: 'warning',
          title: 'Configuration incomplète',
          description: 'Veuillez configurer l\'organisation et l\'événement HelloAsso',
          duration: 3000
        });
        return;
      }

      await fetchHelloAssoParticipants(localSettings.eventSlug, localSettings.organizationSlug);
    };

    return (
      <VStack spacing={6} align="stretch">
        {/* Configuration HelloAsso */}
        <Card>
          <CardHeader>
            <Heading size="md">🎟️ Configuration HelloAsso</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel>URL de l'événement HelloAsso</FormLabel>
                <HStack>
                  <Input
                    placeholder="https://www.helloasso.com/associations/votre-asso/evenements/votre-event"
                    value={localSettings.eventUrl}
                    onChange={(e) => {
                      setLocalSettings(prev => ({ ...prev, eventUrl: e.target.value }));
                    }}
                  />
                  <Button
                    onClick={() => handleUrlParse(localSettings.eventUrl)}
                    isDisabled={!localSettings.eventUrl}
                    colorScheme="blue"
                    variant="outline"
                  >
                    Parser
                  </Button>
                </HStack>
                <Text fontSize="xs" color="gray.500" mt={1}>
                  L'URL sera automatiquement analysée pour extraire les paramètres
                </Text>
              </FormControl>

              <SimpleGrid columns={2} spacing={4}>
                <FormControl>
                  <FormLabel>Organisation</FormLabel>
                  <Input
                    placeholder="nom-organisation"
                    value={localSettings.organizationSlug}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, organizationSlug: e.target.value }))}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Événement</FormLabel>
                  <Input
                    placeholder="nom-evenement"
                    value={localSettings.eventSlug}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, eventSlug: e.target.value }))}
                  />
                </FormControl>
              </SimpleGrid>

              <HStack>
                <Button
                  colorScheme="blue"
                  onClick={() => saveHelloAssoSettings(event.id, localSettings)}
                  isLoading={saving}
                  leftIcon={<FiSave />}
                >
                  Sauvegarder
                </Button>
                <Button
                  colorScheme="green"
                  onClick={handleSyncParticipants}
                  isLoading={loadingHelloAsso}
                  leftIcon={<FiRefreshCw />}
                  isDisabled={!localSettings.organizationSlug || !localSettings.eventSlug}
                >
                  Synchroniser
                </Button>
              </HStack>
            </VStack>
          </CardBody>
        </Card>

        {/* Liste des participants HelloAsso */}
        {helloAssoParticipants.length > 0 && (
          <Card>
            <CardHeader>
              <HStack justify="space-between">
                <Heading size="md">👥 Participants HelloAsso ({helloAssoParticipants.length})</Heading>
                <Badge colorScheme="green">Synchronisé</Badge>
              </HStack>
            </CardHeader>
            <CardBody>
              <Box overflowX="auto">
                <Table variant="simple" size="sm">
                  <Thead>
                    <Tr>
                      <Th>Nom</Th>
                      <Th>Email</Th>
                      <Th>Téléphone</Th>
                      <Th>Montant</Th>
                      <Th>Date</Th>
                      <Th>Commande</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {helloAssoParticipants.map((participant) => (
                      <Tr key={participant.id}>
                        <Td fontWeight="bold">{participant.name}</Td>
                        <Td>{participant.email}</Td>
                        <Td>{participant.phone || '-'}</Td>
                        <Td>{participant.amount}€</Td>
                        <Td>{new Date(participant.orderDate).toLocaleDateString('fr-FR')}</Td>
                        <Td>
                          <Code fontSize="xs">#{participant.orderNumber}</Code>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            </CardBody>
          </Card>
        )}

        {loadingHelloAsso && (
          <Center p={8}>
            <VStack>
              <Spinner size="lg" />
              <Text>Synchronisation avec HelloAsso...</Text>
            </VStack>
          </Center>
        )}
      </VStack>
    );
  };

  // Dans les TabPanels du modal, remplacer l'onglet HelloAsso par :
  // <TabPanel>
  //   <HelloAssoManagement event={selectedEvent} />
  // </TabPanel>

  return (
    <Container maxW="7xl" py={6}>
      {/* En-tête avec statistiques */}
      <VStack align="start" spacing={6} mb={8}>
        <Flex justify="space-between" align="center" w="100%">
          <VStack align="start" spacing={1}>
            <Heading size="lg">📊 Gestion des Événements</Heading>
            <Text color="gray.600">
              Administration complète des événements, participants et finances
            </Text>
          </VStack>
          <HStack spacing={3}>
            <Button
              as={RouterLink}
              to="/dashboard/evenements"
              leftIcon={<FiPlus />}
              colorScheme="blue"
              variant="outline"
            >
              Créer un événement
            </Button>
            <Button
              leftIcon={<FiRefreshCw />}
              onClick={fetchEvents}
              variant="outline"
              isLoading={loading}
            >
              Actualiser
            </Button>
          </HStack>
        </Flex>

        {/* Statistiques */}
        <SimpleGrid columns={{ base: 2, md: 5 }} spacing={4} w="100%">
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Total Événements</StatLabel>
                <StatNumber color="blue.500">{stats.total}</StatNumber>
              </Stat>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Publiés</StatLabel>
                <StatNumber color="green.500">{stats.published}</StatNumber>
              </Stat>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>À venir</StatLabel>
                <StatNumber color="orange.500">{stats.upcoming}</StatNumber>
              </Stat>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Participants</StatLabel>
                <StatNumber color="purple.500">{stats.totalParticipants}</StatNumber>
              </Stat>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Revenus</StatLabel>
                <StatNumber color="green.600">{stats.totalRevenue}€</StatNumber>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>
      </VStack>

      {/* Filtres et recherche */}
      <Card mb={6}>
        <CardBody>
          <HStack spacing={4}>
            <InputGroup maxW="300px">
              <InputLeftElement pointerEvents="none">
                <FiSearch />
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
          </HStack>
        </CardBody>
      </Card>

      {/* Liste des événements */}
      {loading ? (
        <Center py={20}>
          <Spinner size="xl" />
        </Center>
      ) : filteredEvents.length === 0 ? (
        <Card>
          <CardBody>
            <Center py={20}>
              <VStack spacing={4}>
                <Text color="gray.500" fontSize="lg">
                  {searchTerm || filterStatus !== 'ALL' 
                    ? 'Aucun événement trouvé avec ces critères' 
                    : 'Aucun événement trouvé'
                  }
                </Text>
                <Button
                  as={RouterLink}
                  to="/dashboard/evenements"
                  leftIcon={<FiPlus />}
                  colorScheme="blue"
                >
                  Créer le premier événement
                </Button>
              </VStack>
            </Center>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody p={0}>
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Événement</Th>
                  <Th>Date</Th>
                  <Th>Statut</Th>
                  <Th>Participants</Th>
                  <Th>Revenus</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredEvents.map((event) => (
                  <Tr key={event.id}>
                    <Td>
                      <VStack align="start" spacing={1}>
                        <Text fontWeight="semibold">{event.title}</Text>
                        {event.location && (
                          <HStack fontSize="sm" color="gray.600">
                            <FiMapPin />
                            <Text>{event.location}</Text>
                          </HStack>
                        )}
                        {event.vehicleId && (
                          <HStack fontSize="sm" color="blue.600">
                            <FiTruck />
                            <Text>{event.vehicleId}</Text>
                          </HStack>
                        )}
                      </VStack>
                    </Td>
                    <Td>
                      <VStack align="start" spacing={1}>
                        <Text>{formatDate(event.date)}</Text>
                        {event.time && (
                          <Text fontSize="sm" color="gray.600">{event.time}</Text>
                        )}
                      </VStack>
                    </Td>
                    <Td>{getStatusBadge(event.status)}</Td>
                    <Td>
                      <HStack>
                        <FiUsers />
                        <Text>{getEventParticipantCount(event)}</Text>
                      </HStack>
                    </Td>
                    <Td>
                      <VStack align="start" spacing={1}>
                        <Text fontWeight="semibold" color="green.600">
                          {getEventRevenue(event).toFixed(0)}€
                        </Text>
                        <HStack fontSize="xs" spacing={2}>
                          <Text>{event.adultPrice || 0}€</Text>
                          <Text>/</Text>
                          <Text>{event.childPrice || 0}€</Text>
                        </HStack>
                      </VStack>
                    </Td>
                    <Td>
                      <HStack spacing={1}>
                        <Tooltip label="Gestion complète">
                          <IconButton
                            icon={<FiEye />}
                            size="sm"
                            variant="ghost"
                            onClick={() => openEventManagement(event)}
                            aria-label="Gérer l'événement"
                          />
                        </Tooltip>
                        <Tooltip label="Modifier l'événement">
                          <IconButton
                            as={RouterLink}
                            to={`/dashboard/evenements`}
                            icon={<FiEdit />}
                            size="sm"
                            variant="ghost"
                            aria-label="Modifier"
                          />
                        </Tooltip>
                        <Tooltip label="Exporter les données">
                          <IconButton
                            icon={<FiDownload />}
                            size="sm"
                            variant="ghost"
                            aria-label="Exporter"
                            onClick={() => {
                              toast({
                                title: "Export en cours",
                                description: "Fonctionnalité à venir",
                                status: "info"
                              });
                            }}
                          />
                        </Tooltip>
                      </HStack>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </CardBody>
        </Card>
      )}
    </Container>
  );
};

export default EventsManagement;
