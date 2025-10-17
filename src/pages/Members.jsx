import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Box, VStack, HStack, Button, Flex, useToast, Text, Spinner,
  useDisclosure, SimpleGrid, Card, CardBody, CardHeader,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton,
  ModalBody, ModalFooter, FormControl, FormLabel, Input, Select,
  Textarea, Switch, Badge, IconButton, Menu, MenuButton, MenuList,
  MenuItem, Alert, AlertIcon, Tabs, TabList, TabPanels, Tab, TabPanel,
  Table, Thead, Tbody, Tr, Th, Td, InputGroup, InputLeftElement,
  useColorModeValue, Progress, Tooltip, ButtonGroup, Divider,
  Stat, StatLabel, StatNumber, StatHelpText, CheckboxGroup, Checkbox,
  Image, List, ListItem, ListIcon
} from "@chakra-ui/react";
import { 
  FiUsers, FiPlus, FiSearch, FiEdit, FiTrash2, FiEye, FiMail,
  FiUserPlus, FiUserCheck, FiUserX, FiClock, FiTrendingUp,
  FiFilter, FiDownload, FiKey, FiTruck, FiAward, FiShield,
  FiUpload, FiFile, FiCheckCircle, FiXCircle, FiAlertCircle,
  FiRefreshCw, FiExternalLink, FiMoreHorizontal, FiSave,
  FiCalendar, FiPhone, FiMapPin, FiDollarSign, FiCreditCard,
  FiSettings, FiStar, FiActivity, FiPieChart
} from 'react-icons/fi';
import { membersAPI } from '../api/members.js';
import { documentsAPI } from '../api/documents.js';
import PageLayout from '../components/Layout/PageLayout';
import StatsGrid from '../components/Layout/StatsGrid';
import ModernCard from '../components/Layout/ModernCard';

// === CONFIGURATIONS MODERNES ===
const MEMBERSHIP_TYPES = {
  STANDARD: { label: 'Standard', price: 60, description: 'Adhésion individuelle classique', color: 'blue' },
  FAMILY: { label: 'Famille', price: 100, description: '2 adultes + enfants mineurs', color: 'green' },
  STUDENT: { label: 'Étudiant', price: 35, description: 'Tarif réduit sur justificatif', color: 'purple' },
  HONORARY: { label: 'Honneur', price: 0, description: 'Membre d\'honneur', color: 'gold' },
  LIFETIME: { label: 'À vie', price: 0, description: 'Adhésion permanente', color: 'red' }
};

const MEMBERSHIP_STATUS = {
  PENDING: { label: 'En attente', color: 'yellow', icon: FiClock, description: 'Dossier en cours de traitement' },
  ACTIVE: { label: 'Actif', color: 'green', icon: FiCheckCircle, description: 'Adhésion à jour' },
  EXPIRED: { label: 'Expiré', color: 'red', icon: FiXCircle, description: 'Adhésion expirée' },
  SUSPENDED: { label: 'Suspendu', color: 'orange', icon: FiAlertCircle, description: 'Adhésion suspendue' },
  CANCELLED: { label: 'Annulé', color: 'gray', icon: FiUserX, description: 'Adhésion annulée' }
};

const MEMBER_ROLES = {
  MEMBER: { 
    label: 'Adhérent', 
    icon: FiUsers, 
    color: 'blue',
    description: 'Membre standard de l\'association',
    permissions: ['participate_events', 'access_newsletter']
  },
  DRIVER: { 
    label: 'Conducteur', 
    icon: FiTruck, 
    color: 'green',
    description: 'Autorisé à conduire les véhicules',
    permissions: ['drive_vehicles', 'access_myrbe']
  },
  ADMIN: { 
    label: 'Administrateur', 
    icon: FiShield, 
    color: 'red',
    description: 'Accès complet aux fonctions d\'administration',
    permissions: ['admin_full_access']
  },
  BUREAU: { 
    label: 'Bureau', 
    icon: FiAward, 
    color: 'purple',
    description: 'Membre du bureau de l\'association',
    permissions: ['bureau_access', 'admin_events', 'admin_members']
  }
};

const PAYMENT_METHODS = {
  CASH: { label: 'Espèces', icon: FiDollarSign, color: 'green' },
  CHECK: { label: 'Chèque', icon: FiCreditCard, color: 'blue' },
  TRANSFER: { label: 'Virement', icon: FiActivity, color: 'purple' },
  HELLOASSO: { label: 'HelloAsso', icon: FiExternalLink, color: 'orange' },
  CARD: { label: 'Carte bancaire', icon: FiCreditCard, color: 'teal' }
};

const DOCUMENT_TYPES = {
  IDENTITY_CARD: { 
    label: 'Pièce d\'identité', 
    icon: FiUserCheck, 
    color: 'green', 
    required: true,
    maxSizeMB: 5,
    allowedTypes: ['image/jpeg', 'image/png', 'application/pdf']
  },
  DRIVING_LICENSE: { 
    label: 'Permis de conduire', 
    icon: FiTruck, 
    color: 'blue', 
    required: false,
    maxSizeMB: 5,
    allowedTypes: ['image/jpeg', 'image/png', 'application/pdf']
  },
  INSURANCE_RECORD: { 
    label: 'Relevé d\'assurance', 
    icon: FiShield, 
    color: 'orange', 
    required: true,
    maxSizeMB: 3,
    allowedTypes: ['application/pdf']
  },
  MEMBERSHIP_FORM: { 
    label: 'Bulletin d\'adhésion', 
    icon: FiFile, 
    color: 'purple', 
    required: true,
    maxSizeMB: 3,
    allowedTypes: ['application/pdf']
  },
  MEDICAL_CERTIFICATE: { 
    label: 'Certificat médical', 
    icon: FiCheckCircle, 
    color: 'teal', 
    required: false,
    maxSizeMB: 3,
    allowedTypes: ['application/pdf']
  }
};

// === COMPOSANT PRINCIPAL ===
export default function MembersManagement() {
  // === ÉTATS ===
  const [members, setMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'
  const [selectedMembers, setSelectedMembers] = useState([]);
  
  // === FILTRES ET RECHERCHE ===
  const [filters, setFilters] = useState({
    search: '',
    status: 'ALL',
    role: 'ALL',
    membershipType: 'ALL',
    hasMyRBEAccess: 'ALL',
    expiringOnly: false
  });

  // === MODALS ===
  const { isOpen: isCreateOpen, onOpen: onCreateOpen, onClose: onCreateClose } = useDisclosure();
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
  const { isOpen: isBulkOpen, onOpen: onBulkOpen, onClose: onBulkClose } = useDisclosure();
  const { isOpen: isDocumentsOpen, onOpen: onDocumentsOpen, onClose: onDocumentsClose } = useDisclosure();

  // === FORMULAIRE ===
  const [editingMember, setEditingMember] = useState(null);
  const [formData, setFormData] = useState({
    // Informations personnelles
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    birthDate: '',
    
    // Adhésion
    membershipType: 'STANDARD',
    membershipStatus: 'PENDING',
    joinDate: new Date().toISOString().split('T')[0],
    renewalDate: '',
    paymentAmount: '',
    paymentMethod: 'HELLOASSO',
    
    // Rôles et accès
    role: 'MEMBER',
    hasExternalAccess: false,
    hasInternalAccess: false,
    newsletter: true,
    
    // MyRBE
    matricule: '',
    loginEnabled: false,
    temporaryPassword: '',
    mustChangePassword: false,
    
    // Conduite
    driverLicense: '',
    licenseExpiryDate: '',
    medicalCertificateDate: '',
    emergencyContact: '',
    emergencyPhone: '',
    driverCertifications: [],
    vehicleAuthorizations: [],
    maxPassengers: '',
    driverNotes: '',
    
    // Divers
    notes: ''
  });

  // === DOCUMENTS ===
  const [memberDocuments, setMemberDocuments] = useState([]);
  const [documentUpload, setDocumentUpload] = useState({
    type: 'IDENTITY_CARD',
    expiryDate: '',
    notes: ''
  });
  const fileInputRef = useRef(null);

  const toast = useToast();
  const cardBg = useColorModeValue("white", "gray.800");

  // === FONCTIONS UTILITAIRES ===
  const generateMatricule = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 900) + 100;
    return `${year}-${random}`;
  };

  const generateTempPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const calculateRenewalDate = (joinDate, membershipType) => {
    const join = new Date(joinDate);
    const renewal = new Date(join);
    
    // Les adhésions expirent au 31 décembre
    renewal.setFullYear(join.getFullYear() + 1, 11, 31);
    
    return renewal.toISOString().split('T')[0];
  };

  const isExpiringSoon = (renewalDate, days = 60) => {
    if (!renewalDate) return false;
    const renewal = new Date(renewalDate);
    const inXDays = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    return renewal <= inXDays;
  };

  // === CHARGEMENT DES DONNÉES ===
  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await membersAPI.getAll();
      const membersList = response?.members || response?.data || response || [];
      setMembers(membersList);
      console.log('👥 Membres chargés:', membersList.length);
    } catch (error) {
      console.error('❌ Erreur chargement membres:', error);
      toast({
        status: "error",
        title: "Erreur de chargement",
        description: "Impossible de charger les membres",
        duration: 5000,
        isClosable: true
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchStats = useCallback(async () => {
    try {
      // Calculer les stats à partir des données membres
      if (members.length === 0) return;

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const stats = {
        totalMembers: members.length,
        activeMembers: members.filter(m => m.membershipStatus === 'ACTIVE').length,
        expiredMembers: members.filter(m => m.membershipStatus === 'EXPIRED').length,
        pendingMembers: members.filter(m => m.membershipStatus === 'PENDING').length,
        driversCount: members.filter(m => m.role === 'DRIVER' || m.driverLicense).length,
        myRBEEnabled: members.filter(m => m.loginEnabled).length,
        recentJoins: members.filter(m => new Date(m.joinDate || m.createdAt) > thirtyDaysAgo).length,
        expiringSoon: members.filter(m => isExpiringSoon(m.renewalDate)).length,
        totalRevenue: members
          .filter(m => m.membershipStatus === 'ACTIVE' && m.paymentAmount)
          .reduce((sum, m) => sum + (parseFloat(m.paymentAmount) || 0), 0)
      };

      setStats(stats);
    } catch (error) {
      console.error('❌ Erreur calcul statistiques:', error);
    }
  }, [members]);

  // === FILTRAGE ===
  const applyFilters = useCallback(() => {
    let filtered = [...members];

    // Recherche textuelle
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(member =>
        `${member.firstName} ${member.lastName}`.toLowerCase().includes(searchTerm) ||
        member.email?.toLowerCase().includes(searchTerm) ||
        member.matricule?.toLowerCase().includes(searchTerm) ||
        member.phone?.includes(searchTerm)
      );
    }

    // Filtres par statut
    if (filters.status !== 'ALL') {
      filtered = filtered.filter(member => member.membershipStatus === filters.status);
    }
    
    if (filters.role !== 'ALL') {
      filtered = filtered.filter(member => member.role === filters.role);
    }
    
    if (filters.membershipType !== 'ALL') {
      filtered = filtered.filter(member => member.membershipType === filters.membershipType);
    }
    
    if (filters.hasMyRBEAccess !== 'ALL') {
      const hasAccess = filters.hasMyRBEAccess === 'true';
      filtered = filtered.filter(member => !!member.loginEnabled === hasAccess);
    }

    // Membres expirant bientôt
    if (filters.expiringOnly) {
      filtered = filtered.filter(member => isExpiringSoon(member.renewalDate));
    }

    setFilteredMembers(filtered);
  }, [members, filters]);

  // === EFFECTS ===
  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // === GESTION DU FORMULAIRE ===
  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      postalCode: '',
      birthDate: '',
      membershipType: 'STANDARD',
      membershipStatus: 'PENDING',
      joinDate: new Date().toISOString().split('T')[0],
      renewalDate: '',
      paymentAmount: MEMBERSHIP_TYPES.STANDARD.price.toString(),
      paymentMethod: 'HELLOASSO',
      role: 'MEMBER',
      hasExternalAccess: false,
      hasInternalAccess: false,
      newsletter: true,
      matricule: '',
      loginEnabled: false,
      temporaryPassword: '',
      mustChangePassword: false,
      driverLicense: '',
      licenseExpiryDate: '',
      medicalCertificateDate: '',
      emergencyContact: '',
      emergencyPhone: '',
      driverCertifications: [],
      vehicleAuthorizations: [],
      maxPassengers: '',
      driverNotes: '',
      notes: ''
    });
    setEditingMember(null);
  };

  const handleCreate = () => {
    resetForm();
    onCreateOpen();
  };

  const handleEdit = (member) => {
    setFormData({
      ...member,
      joinDate: member.joinDate ? member.joinDate.split('T')[0] : '',
      renewalDate: member.renewalDate ? member.renewalDate.split('T')[0] : '',
      birthDate: member.birthDate ? member.birthDate.split('T')[0] : '',
      licenseExpiryDate: member.licenseExpiryDate ? member.licenseExpiryDate.split('T')[0] : '',
      medicalCertificateDate: member.medicalCertificateDate ? member.medicalCertificateDate.split('T')[0] : '',
      paymentAmount: member.paymentAmount?.toString() || '',
      maxPassengers: member.maxPassengers?.toString() || '',
      driverCertifications: member.driverCertifications || [],
      vehicleAuthorizations: member.vehicleAuthorizations || []
    });
    setEditingMember(member);
    onEditOpen();
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Validation
      if (!formData.firstName?.trim() || !formData.lastName?.trim() || !formData.email?.trim()) {
        toast({
          status: "error",
          title: "Champs requis",
          description: "Nom, prénom et email sont obligatoires",
          duration: 5000,
          isClosable: true
        });
        return;
      }

      // Calculer la date de renouvellement automatiquement
      if (formData.joinDate && !formData.renewalDate) {
        formData.renewalDate = calculateRenewalDate(formData.joinDate, formData.membershipType);
      }

      // Générer matricule si MyRBE activé
      if (formData.loginEnabled && !formData.matricule) {
        formData.matricule = generateMatricule();
      }

      // Générer mot de passe temporaire si nécessaire
      if (formData.loginEnabled && !formData.temporaryPassword) {
        formData.temporaryPassword = generateTempPassword();
        formData.mustChangePassword = true;
      }

      const memberData = {
        ...formData,
        paymentAmount: formData.paymentAmount ? parseFloat(formData.paymentAmount) : null,
        maxPassengers: formData.maxPassengers ? parseInt(formData.maxPassengers) : null
      };

      if (editingMember) {
        await membersAPI.update(editingMember.id, memberData);
        toast({
          status: "success",
          title: "Membre mis à jour",
          description: `${formData.firstName} ${formData.lastName} a été modifié avec succès`,
          duration: 5000,
          isClosable: true
        });
      } else {
        await membersAPI.create(memberData);
        toast({
          status: "success",
          title: "Membre créé",
          description: `${formData.firstName} ${formData.lastName} a été ajouté avec succès`,
          duration: 5000,
          isClosable: true
        });
      }

      onCreateClose();
      onEditClose();
      resetForm();
      fetchMembers();

    } catch (error) {
      console.error('❌ Erreur sauvegarde:', error);
      toast({
        status: "error",
        title: "Erreur de sauvegarde",
        description: error.message || "Impossible de sauvegarder le membre",
        duration: 5000,
        isClosable: true
      });
    } finally {
      setSaving(false);
    }
  };

  // === STATISTIQUES MODERNES ===
  const getStatsData = () => {
    if (!stats) return [];
    
    return [
      {
        label: "Total adhérents",
        value: stats.totalMembers,
        icon: FiUsers,
        color: "brand",
        change: stats.recentJoins > 0 ? {
          type: "increase",
          value: `+${stats.recentJoins} ce mois`
        } : undefined
      },
      {
        label: "Membres actifs",
        value: stats.activeMembers,
        icon: FiCheckCircle,
        color: "success",
        change: {
          type: "increase",
          value: `${Math.round((stats.activeMembers / stats.totalMembers) * 100)}% du total`
        }
      },
      {
        label: "Conducteurs habilités",
        value: stats.driversCount,
        icon: FiTruck,
        color: "blue"
      },
      {
        label: "Accès MyRBE",
        value: stats.myRBEEnabled,
        icon: FiKey,
        color: "purple"
      },
      {
        label: "Expirant bientôt",
        value: stats.expiringSoon,
        icon: FiAlertCircle,
        color: "warning"
      },
      {
        label: "Revenus adhésions",
        value: `${stats.totalRevenue || 0}€`,
        icon: FiDollarSign,
        color: "green",
        change: {
          type: "increase",
          value: "Cotisations encaissées"
        }
      }
    ];
  };

  // === BADGES ET AFFICHAGE ===
  const getStatusBadge = (status) => {
    const config = MEMBERSHIP_STATUS[status] || MEMBERSHIP_STATUS.PENDING;
    return (
      <Tooltip label={config.description}>
        <Badge colorScheme={config.color} variant="subtle">
          <HStack spacing={1}>
            <Icon as={config.icon} size="12px" />
            <Text>{config.label}</Text>
          </HStack>
        </Badge>
      </Tooltip>
    );
  };

  const getRoleBadge = (role) => {
    const config = MEMBER_ROLES[role] || MEMBER_ROLES.MEMBER;
    return (
      <Tooltip label={config.description}>
        <Badge colorScheme={config.color} variant="outline">
          <HStack spacing={1}>
            <Icon as={config.icon} size="12px" />
            <Text>{config.label}</Text>
          </HStack>
        </Badge>
      </Tooltip>
    );
  };

  const getMembershipTypeBadge = (type) => {
    const config = MEMBERSHIP_TYPES[type] || MEMBERSHIP_TYPES.STANDARD;
    return (
      <Badge colorScheme={config.color} variant="subtle">
        {config.label}
      </Badge>
    );
  };

  // === ACTIONS EN MASSE ===
  const handleBulkAction = (action) => {
    console.log(`Action en masse: ${action} sur ${selectedMembers.length} membres`);
    // TODO: Implémenter les actions en masse
  };

  const handleExport = () => {
    console.log('Export des données membres');
    // TODO: Implémenter l'export
  };

  // === RENDU ===
  if (loading) {
    return (
      <PageLayout
        title="👥 Gestion des Adhésions"
        subtitle="Chargement des données membres..."
      >
        <VStack spacing={8} py={16}>
          <Spinner size="xl" color="brand.500" thickness="4px" />
          <Text color="gray.600">Synchronisation avec la base de données...</Text>
        </VStack>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="👥 Gestion des Adhésions"
      subtitle="Administration complète des membres de l'association RétroBus Essonne"
      breadcrumbs={[
        { label: "MyRBE", href: "/dashboard/myrbe" },
        { label: "Gestion des Adhésions", href: "/dashboard/members-management" }
      ]}
      headerActions={
        <HStack spacing={3}>
          <Button
            leftIcon={<FiDownload />}
            variant="secondary"
            bg="whiteAlpha.200"
            color="white"
            borderColor="whiteAlpha.300"
            onClick={handleExport}
          >
            Exporter
          </Button>
          <Button
            leftIcon={<FiUserPlus />}
            variant="secondary"
            bg="whiteAlpha.200"
            color="white"
            borderColor="whiteAlpha.300"
            onClick={handleCreate}
          >
            Nouvel adhérent
          </Button>
        </HStack>
      }
    >
      <VStack spacing={8} align="stretch">
        {/* Statistiques */}
        <StatsGrid stats={getStatsData()} loading={!stats} />

        {/* Filtres et actions */}
        <ModernCard title="Filtres et recherche" icon={FiFilter} color="gray">
          <VStack spacing={4} align="stretch">
            <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
              <InputGroup>
                <InputLeftElement>
                  <FiSearch color="gray.400" />
                </InputLeftElement>
                <Input
                  placeholder="Rechercher un membre..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                />
              </InputGroup>

              <Select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              >
                <option value="ALL">Tous les statuts</option>
                {Object.entries(MEMBERSHIP_STATUS).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </Select>

              <Select
                value={filters.role}
                onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
              >
                <option value="ALL">Tous les rôles</option>
                {Object.entries(MEMBER_ROLES).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </Select>

              <Select
                value={filters.membershipType}
                onChange={(e) => setFilters(prev => ({ ...prev, membershipType: e.target.value }))}
              >
                <option value="ALL">Tous les types</option>
                {Object.entries(MEMBERSHIP_TYPES).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </Select>
            </SimpleGrid>

            <HStack spacing={4} justify="space-between">
              <HStack spacing={4}>
                <Checkbox
                  isChecked={filters.expiringOnly}
                  onChange={(e) => setFilters(prev => ({ ...prev, expiringOnly: e.target.checked }))}
                >
                  Expirant bientôt
                </Checkbox>
                
                <Select
                  maxW="200px"
                  value={filters.hasMyRBEAccess}
                  onChange={(e) => setFilters(prev => ({ ...prev, hasMyRBEAccess: e.target.value }))}
                >
                  <option value="ALL">Tous les accès</option>
                  <option value="true">Avec MyRBE</option>
                  <option value="false">Sans MyRBE</option>
                </Select>
              </HStack>

              <HStack spacing={2}>
                <Text fontSize="sm" color="gray.600">
                  {filteredMembers.length} membre{filteredMembers.length > 1 ? 's' : ''} affiché{filteredMembers.length > 1 ? 's' : ''}
                </Text>
                
                <ButtonGroup size="sm" isAttached variant="outline">
                  <Button
                    leftIcon={<FiPieChart />}
                    onClick={() => setViewMode('cards')}
                    colorScheme={viewMode === 'cards' ? 'blue' : 'gray'}
                  >
                    Cartes
                  </Button>
                  <Button
                    leftIcon={<FiActivity />}
                    onClick={() => setViewMode('table')}
                    colorScheme={viewMode === 'table' ? 'blue' : 'gray'}
                  >
                    Tableau
                  </Button>
                </ButtonGroup>
              </HStack>
            </HStack>
          </VStack>
        </ModernCard>

        {/* Actions en masse */}
        {selectedMembers.length > 0 && (
          <Alert status="info" borderRadius="lg">
            <AlertIcon />
            <HStack justify="space-between" w="full">
              <Text>
                {selectedMembers.length} membre{selectedMembers.length > 1 ? 's' : ''} sélectionné{selectedMembers.length > 1 ? 's' : ''}
              </Text>
              <ButtonGroup size="sm">
                <Button onClick={() => handleBulkAction('enable_myrbe')}>
                  Activer MyRBE
                </Button>
                <Button onClick={() => handleBulkAction('send_renewal')}>
                  Envoi renouvellement
                </Button>
                <Button colorScheme="red" onClick={() => handleBulkAction('archive')}>
                  Archiver
                </Button>
              </ButtonGroup>
            </HStack>
          </Alert>
        )}

        {/* Affichage des membres */}
        {filteredMembers.length === 0 ? (
          <ModernCard>
            <VStack spacing={4} py={12}>
              <Icon as={FiUsers} size="48px" color="gray.300" />
              <VStack spacing={2}>
                <Text fontSize="lg" fontWeight="600" color="gray.500">
                  Aucun membre trouvé
                </Text>
                <Text fontSize="sm" color="gray.400">
                  {filters.search || filters.status !== 'ALL' 
                    ? "Aucun membre ne correspond aux critères de recherche"
                    : "Commencez par créer votre premier membre"
                  }
                </Text>
              </VStack>
              <Button leftIcon={<FiUserPlus />} colorScheme="blue" onClick={handleCreate}>
                Créer un membre
              </Button>
            </VStack>
          </ModernCard>
        ) : viewMode === 'cards' ? (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
            {filteredMembers.map((member) => (
              <ModernCard
                key={member.id}
                variant="modern"
                color="blue"
                onClick={() => handleEdit(member)}
              >
                <VStack spacing={4} align="stretch">
                  <HStack justify="space-between" align="start">
                    <VStack align="start" spacing={1}>
                      <Text fontWeight="600" fontSize="lg">
                        {member.firstName} {member.lastName}
                      </Text>
                      <Text fontSize="sm" color="gray.600">{member.email}</Text>
                      {member.matricule && (
                        <Badge colorScheme="purple" size="sm">{member.matricule}</Badge>
                      )}
                    </VStack>
                    
                    <Menu>
                      <MenuButton
                        as={IconButton}
                        icon={<FiMoreHorizontal />}
                        variant="ghost"
                        size="sm"
                      />
                      <MenuList>
                        <MenuItem icon={<FiEdit />} onClick={() => handleEdit(member)}>
                          Modifier
                        </MenuItem>
                        <MenuItem icon={<FiFile />} onClick={() => {
                          setEditingMember(member);
                          onDocumentsOpen();
                        }}>
                          Documents
                        </MenuItem>
                        <MenuItem icon={<FiKey />}>
                          Réinitialiser mot de passe
                        </MenuItem>
                        <MenuItem icon={<FiMail />}>
                          Envoyer email
                        </MenuItem>
                        <Divider />
                        <MenuItem icon={<FiTrash2 />} color="red.500">
                          Supprimer
                        </MenuItem>
                      </MenuList>
                    </Menu>
                  </HStack>

                  <HStack spacing={2} wrap="wrap">
                    {getStatusBadge(member.membershipStatus)}
                    {getRoleBadge(member.role)}
                    {getMembershipTypeBadge(member.membershipType)}
                    {member.loginEnabled && (
                      <Badge colorScheme="green" variant="outline" size="sm">
                        MyRBE
                      </Badge>
                    )}
                  </HStack>

                  <VStack spacing={2} align="stretch" fontSize="sm">
                    {member.phone && (
                      <HStack>
                        <Icon as={FiPhone} color="gray.400" />
                        <Text>{member.phone}</Text>
                      </HStack>
                    )}
                    
                    {member.renewalDate && (
                      <HStack>
                        <Icon as={FiCalendar} color="gray.400" />
                        <Text>
                          Expire le {new Date(member.renewalDate).toLocaleDateString('fr-FR')}
                          {isExpiringSoon(member.renewalDate) && (
                            <Badge colorScheme="orange" size="sm" ml={2}>Bientôt</Badge>
                          )}
                        </Text>
                      </HStack>
                    )}
                    
                    {member.paymentAmount && (
                      <HStack>
                        <Icon as={FiDollarSign} color="gray.400" />
                        <Text>{member.paymentAmount}€</Text>
                      </HStack>
                    )}
                  </VStack>
                </VStack>
              </ModernCard>
            ))}
          </SimpleGrid>
        ) : (
          <ModernCard>
            <Box overflowX="auto">
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th>
                      <Checkbox
                        isChecked={selectedMembers.length === filteredMembers.length}
                        isIndeterminate={selectedMembers.length > 0 && selectedMembers.length < filteredMembers.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedMembers(filteredMembers.map(m => m.id));
                          } else {
                            setSelectedMembers([]);
                          }
                        }}
                      />
                    </Th>
                    <Th>Membre</Th>
                    <Th>Contact</Th>
                    <Th>Statut</Th>
                    <Th>Rôle</Th>
                    <Th>Type</Th>
                    <Th>Renouvellement</Th>
                    <Th>MyRBE</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredMembers.map((member) => (
                    <Tr key={member.id} _hover={{ bg: "gray.50" }}>
                      <Td>
                        <Checkbox
                          isChecked={selectedMembers.includes(member.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedMembers(prev => [...prev, member.id]);
                            } else {
                              setSelectedMembers(prev => prev.filter(id => id !== member.id));
                            }
                          }}
                        />
                      </Td>
                      <Td>
                        <VStack align="start" spacing={0}>
                          <Text fontWeight="600">
                            {member.firstName} {member.lastName}
                          </Text>
                          {member.memberNumber && (
                            <Text fontSize="xs" color="gray.500" fontFamily="mono">
                              #{member.memberNumber}
                            </Text>
                          )}
                        </VStack>
                      </Td>
                      <Td>
                        <VStack align="start" spacing={0}>
                          <Text fontSize="sm">{member.email}</Text>
                          {member.phone && (
                            <Text fontSize="xs" color="gray.500">{member.phone}</Text>
                          )}
                        </VStack>
                      </Td>
                      <Td>{getStatusBadge(member.membershipStatus)}</Td>
                      <Td>{getRoleBadge(member.role)}</Td>
                      <Td>{getMembershipTypeBadge(member.membershipType)}</Td>
                      <Td>
                        <VStack align="start" spacing={0}>
                          <Text fontSize="sm">
                            {member.renewalDate 
                              ? new Date(member.renewalDate).toLocaleDateString('fr-FR')
                              : '—'
                            }
                          </Text>
                          {isExpiringSoon(member.renewalDate) && (
                            <Badge colorScheme="orange" size="sm">
                              Expire bientôt
                            </Badge>
                          )}
                        </VStack>
                      </Td>
                      <Td>
                        <VStack align="start" spacing={1}>
                          {member.loginEnabled ? (
                            <>
                              <Badge colorScheme="green" size="sm">Activé</Badge>
                              {member.matricule && (
                                <Text fontSize="xs" color="gray.500" fontFamily="mono">
                                  {member.matricule}
                                </Text>
                              )}
                              {member.mustChangePassword && (
                                <Badge colorScheme="orange" size="sm">
                                  Changer MDP
                                </Badge>
                              )}
                            </>
                          ) : (
                            <Badge colorScheme="gray" size="sm">Désactivé</Badge>
                          )}
                        </VStack>
                      </Td>
                      <Td>
                        <Menu>
                          <MenuButton
                            as={IconButton}
                            icon={<FiMoreHorizontal />}
                            variant="ghost"
                            size="sm"
                          />
                          <MenuList>
                            <MenuItem icon={<FiEdit />} onClick={() => handleEdit(member)}>
                              Modifier
                            </MenuItem>
                            <MenuItem icon={<FiFile />} onClick={() => {
                              setEditingMember(member);
                              onDocumentsOpen();
                            }}>
                              Documents
                            </MenuItem>
                            <MenuItem icon={<FiKey />}>
                              Réinitialiser MDP
                            </MenuItem>
                            <MenuItem icon={<FiMail />}>
                              Envoyer email
                            </MenuItem>
                            <Divider />
                            <MenuItem icon={<FiTrash2 />} color="red.500">
                              Supprimer
                            </MenuItem>
                          </MenuList>
                        </Menu>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          </ModernCard>
        )}
      </VStack>

      {/* Modal de création/édition */}
      <Modal 
        isOpen={isCreateOpen || isEditOpen} 
        onClose={() => {
          onCreateClose();
          onEditClose();
          resetForm();
        }} 
        size="6xl"
      >
        <ModalOverlay />
        <ModalContent maxH="90vh" overflowY="auto">
          <ModalHeader>
            {editingMember ? `Modifier ${editingMember.firstName} ${editingMember.lastName}` : 'Nouveau membre'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Tabs variant="enclosed">
              <TabList>
                <Tab>👤 Informations personnelles</Tab>
                <Tab>🎫 Adhésion</Tab>
                <Tab>🔐 Accès MyRBE</Tab>
                <Tab>🚗 Conduite</Tab>
                <Tab>📝 Notes</Tab>
              </TabList>
              
              <TabPanels>
                {/* Onglet Informations personnelles */}
                <TabPanel>
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                    <VStack spacing={4} align="stretch">
                      <FormControl isRequired>
                        <FormLabel>Prénom</FormLabel>
                        <Input
                          value={formData.firstName}
                          onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                          placeholder="Prénom"
                        />
                      </FormControl>

                      <FormControl isRequired>
                        <FormLabel>Nom</FormLabel>
                        <Input
                          value={formData.lastName}
                          onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                          placeholder="Nom"
                        />
                      </FormControl>

                      <FormControl isRequired>
                        <FormLabel>Email</FormLabel>
                        <Input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="email@exemple.com"
                        />
                      </FormControl>

                      <FormControl>
                        <FormLabel>Téléphone</FormLabel>
                        <Input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="06 12 34 56 78"
                        />
                      </FormControl>

                      <FormControl>
                        <FormLabel>Date de naissance</FormLabel>
                        <Input
                          type="date"
                          value={formData.birthDate}
                          onChange={(e) => setFormData(prev => ({ ...prev, birthDate: e.target.value }))}
                        />
                      </FormControl>
                    </VStack>

                    <VStack spacing={4} align="stretch">
                      <FormControl>
                        <FormLabel>Adresse</FormLabel>
                        <Textarea
                          value={formData.address}
                          onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                          placeholder="Adresse complète"
                          rows={3}
                        />
                      </FormControl>

                      <HStack spacing={4}>
                        <FormControl>
                          <FormLabel>Ville</FormLabel>
                          <Input
                            value={formData.city}
                            onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                            placeholder="Ville"
                          />
                        </FormControl>

                        <FormControl maxW="150px">
                          <FormLabel>Code postal</FormLabel>
                          <Input
                            value={formData.postalCode}
                            onChange={(e) => setFormData(prev => ({ ...prev, postalCode: e.target.value }))}
                            placeholder="91000"
                          />
                        </FormControl>
                      </HStack>

                      <FormControl>
                        <FormLabel>Contact d'urgence</FormLabel>
                        <Input
                          value={formData.emergencyContact}
                          onChange={(e) => setFormData(prev => ({ ...prev, emergencyContact: e.target.value }))}
                          placeholder="Nom et relation"
                        />
                      </FormControl>

                      <FormControl>
                        <FormLabel>Téléphone d'urgence</FormLabel>
                        <Input
                          type="tel"
                          value={formData.emergencyPhone}
                          onChange={(e) => setFormData(prev => ({ ...prev, emergencyPhone: e.target.value }))}
                          placeholder="06 12 34 56 78"
                        />
                      </FormControl>
                    </VStack>
                  </SimpleGrid>
                </TabPanel>

                {/* Onglet Adhésion */}
                <TabPanel>
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                    <VStack spacing={4} align="stretch">
                      <FormControl>
                        <FormLabel>Type d'adhésion</FormLabel>
                        <Select
                          value={formData.membershipType}
                          onChange={(e) => {
                            const newType = e.target.value;
                            setFormData(prev => ({ 
                              ...prev, 
                              membershipType: newType,
                              paymentAmount: MEMBERSHIP_TYPES[newType].price.toString()
                            }));
                          }}
                        >
                          {Object.entries(MEMBERSHIP_TYPES).map(([key, config]) => (
                            <option key={key} value={key}>
                              {config.label} - {config.price}€ ({config.description})
                            </option>
                          ))}
                        </Select>
                      </FormControl>

                      <FormControl>
                        <FormLabel>Statut d'adhésion</FormLabel>
                        <Select
                          value={formData.membershipStatus}
                          onChange={(e) => setFormData(prev => ({ ...prev, membershipStatus: e.target.value }))}
                        >
                          {Object.entries(MEMBERSHIP_STATUS).map(([key, config]) => (
                            <option key={key} value={key}>{config.label}</option>
                          ))}
                        </Select>
                      </FormControl>

                      <FormControl>
                        <FormLabel>Rôle</FormLabel>
                        <Select
                          value={formData.role}
                          onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                        >
                          {Object.entries(MEMBER_ROLES).map(([key, config]) => (
                            <option key={key} value={key}>{config.label}</option>
                          ))}
                        </Select>
                      </FormControl>

                      <HStack spacing={4}>
                        <FormControl>
                          <FormLabel>Date d'adhésion</FormLabel>
                          <Input
                            type="date"
                            value={formData.joinDate}
                            onChange={(e) => {
                              const joinDate = e.target.value;
                              setFormData(prev => ({ 
                                ...prev, 
                                joinDate,
                                renewalDate: calculateRenewalDate(joinDate, prev.membershipType)
                              }));
                            }}
                          />
                        </FormControl>

                        <FormControl>
                          <FormLabel>Renouvellement</FormLabel>
                          <Input
                            type="date"
                            value={formData.renewalDate}
                            onChange={(e) => setFormData(prev => ({ ...prev, renewalDate: e.target.value }))}
                          />
                        </FormControl>
                      </HStack>
                    </VStack>

                    <VStack spacing={4} align="stretch">
                      <HStack spacing={4}>
                        <FormControl>
                          <FormLabel>Montant payé</FormLabel>
                          <InputGroup>
                            <Input
                              type="number"
                              step="0.01"
                              value={formData.paymentAmount}
                              onChange={(e) => setFormData(prev => ({ ...prev, paymentAmount: e.target.value }))}
                              placeholder="60.00"
                            />
                            <InputLeftElement>€</InputLeftElement>
                          </InputGroup>
                        </FormControl>

                        <FormControl>
                          <FormLabel>Méthode de paiement</FormLabel>
                          <Select
                            value={formData.paymentMethod}
                            onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                          >
                            {Object.entries(PAYMENT_METHODS).map(([key, config]) => (
                              <option key={key} value={key}>{config.label}</option>
                            ))}
                          </Select>
                        </FormControl>
                      </HStack>

                      <Divider />

                      <VStack spacing={3} align="stretch">
                        <Text fontWeight="600" color="gray.700">Accès et préférences</Text>
                        
                        <FormControl display="flex" alignItems="center">
                          <FormLabel mb={0} flex={1}>
                            Accès site externe
                          </FormLabel>
                          <Switch
                            isChecked={formData.hasExternalAccess}
                            onChange={(e) => setFormData(prev => ({ ...prev, hasExternalAccess: e.target.checked }))}
                          />
                        </FormControl>

                        <FormControl display="flex" alignItems="center">
                          <FormLabel mb={0} flex={1}>
                            Accès interne
                          </FormLabel>
                          <Switch
                            isChecked={formData.hasInternalAccess}
                            onChange={(e) => setFormData(prev => ({ ...prev, hasInternalAccess: e.target.checked }))}
                          />
                        </FormControl>

                        <FormControl display="flex" alignItems="center">
                          <FormLabel mb={0} flex={1}>
                            Newsletter
                          </FormLabel>
                          <Switch
                            isChecked={formData.newsletter}
                            onChange={(e) => setFormData(prev => ({ ...prev, newsletter: e.target.checked }))}
                          />
                        </FormControl>
                      </VStack>
                    </VStack>
                  </SimpleGrid>
                </TabPanel>

                {/* Onglet Conduite */}
                <TabPanel>
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                    <VStack spacing={4} align="stretch">
                      <FormControl>
                        <FormLabel>Numéro de permis de conduire</FormLabel>
                        <Input
                          value={formData.driverLicense}
                          onChange={(e) => setFormData(prev => ({ ...prev, driverLicense: e.target.value }))}
                          placeholder="AB123456"
                        />
                      </FormControl>

                      <FormControl>
                        <FormLabel>Catégories</FormLabel>
                        <Select
                          multiple
                          value={formData.driverCertifications}
                          onChange={(e) => setFormData(prev => ({ ...prev, driverCertifications: Array.from(e.target.selectedOptions, option => option.value) }))}
                        >
                          <option value="B">B</option>
                          <option value="C">C</option>
                          <option value="D">D</option>
                          <option value="E">E</option>
                        </Select>
                      </FormControl>

                      <FormControl>
                        <FormLabel>Date d'expiration du permis</FormLabel>
                        <Input
                          type="date"
                          value={formData.licenseExpiryDate}
                          onChange={(e) => setFormData(prev => ({ ...prev, licenseExpiryDate: e.target.value }))}
                        />
                      </FormControl>
                    </VStack>

                    <VStack spacing={4} align="stretch">
                      <FormControl>
                        <FormLabel>Véhicules autorisés</FormLabel>
                        <Select
                          multiple
                          value={formData.vehicleAuthorizations}
                          onChange={(e) => setFormData(prev => ({ ...prev, vehicleAuthorizations: Array.from(e.target.selectedOptions, option => option.value) }))}
                        >
                          <option value="VL">Véhicule léger</option>
                          <option value="PL">Poids lourd</option>
                          <option value="TC">Transport en commun</option>
                        </Select>
                      </FormControl>

                      <FormControl>
                        <FormLabel>Nombre maximum de passagers</FormLabel>
                        <Input
                          type="number"
                          value={formData.maxPassengers}
                          onChange={(e) => setFormData(prev => ({ ...prev, maxPassengers: e.target.value }))}
                          placeholder="4"
                        />
                      </FormControl>
                    </VStack>
                  </SimpleGrid>
                </TabPanel>

                {/* Onglet Notes */}
                <TabPanel>
                  <FormControl>
                    <FormLabel>Notes internes</FormLabel>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Remarques ou informations supplémentaires"
                      rows={6}
                    />
                  </FormControl>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </ModalBody>

          <ModalFooter>
            <HStack spacing={4}>
              <Button
                colorScheme="blue"
                isLoading={saving}
                onClick={handleSave}
              >
                {editingMember ? 'Sauvegarder les modifications' : 'Créer le membre'}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => {
                  onCreateClose();
                  onEditClose();
                  resetForm();
                }}
              >
                Annuler
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal documents */}
      <Modal 
        isOpen={isDocumentsOpen} 
        onClose={() => {
          onDocumentsClose();
          setEditingMember(null);
        }} 
        size="4xl"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            Documents de {editingMember?.firstName} {editingMember?.lastName}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              {/* Liste des documents */}
              <Box>
                <Text fontWeight="600" mb={2}>Documents téléchargés</Text>
                
                <List spacing={3}>
                  {memberDocuments.length === 0 && (
                    <Text color="gray.500" fontSize="sm">
                      Aucun document trouvé pour ce membre.
                    </Text>
                  )}

                  {memberDocuments.map((doc) => (
                    <ListItem key={doc.id} p={3} borderWidth="1px" borderRadius="md" display="flex" alignItems="center">
                      <HStack spacing={3} flex={1}>
                        <Icon as={DOCUMENT_TYPES[doc.type]?.icon} boxSize={8} color={DOCUMENT_TYPES[doc.type]?.color} />
                        
                        <VStack align="start" spacing={1} flex={1}>
                          <Text fontWeight="500">
                            {doc.type === 'IDENTITY_CARD' && 'Pièce d\'identité'}
                            {doc.type === 'DRIVING_LICENSE' && 'Permis de conduire'}
                            {doc.type === 'INSURANCE_RECORD' && 'Relevé d\'assurance'}
                            {doc.type === 'MEMBERSHIP_FORM' && 'Bulletin d\'adhésion'}
                            {doc.type === 'MEDICAL_CERTIFICATE' && 'Certificat médical'}
                          </Text>
                          
                          <HStack spacing={2}>
                            <Text fontSize="sm" color="gray.500">
                              {doc.size} Mo
                            </Text>
                            
                            <Badge colorScheme={doc.status === 'VALIDATED' ? 'green' : 'yellow'} variant="outline" fontSize="sm">
                              {doc.status === 'VALIDATED' && 'Validé'}
                              {doc.status === 'PENDING' && 'En attente'}
                            </Badge>
                          </HStack>
                        </VStack>
                      </HStack>

                      <HStack spacing={2}>
                        <Button
                          size="sm"
                          variant="outline"
                          leftIcon={<FiDownload />}
                          onClick={() => {
                            documentsAPI.download(doc.id)
                              .then(() => {
                                toast({
                                  status: "success",
                                  title: "Téléchargement lancé",
                                  description: "Le document est en cours de téléchargement",
                                  duration: 5000,
                                  isClosable: true
                                });
                              })
                              .catch((error) => {
                                console.error('❌ Erreur téléchargement document:', error);
                                toast({
                                  status: "error",
                                  title: "Erreur de téléchargement",
                                  description: "Impossible de télécharger le document",
                                  duration: 5000,
                                  isClosable: true
                                });
                              });
                          }}
                        >
                          Télécharger
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          colorScheme="red"
                          leftIcon={<FiTrash2 />}
                          onClick={async () => {
                            if (window.confirm("Êtes-vous sûr de vouloir supprimer ce document ?")) {
                              try {
                                await documentsAPI.remove(doc.id);
                                setMemberDocuments(prev => prev.filter(d => d.id !== doc.id));
                                toast({
                                  status: "success",
                                  title: "Document supprimé",
                                  description: "Le document a été supprimé avec succès",
                                  duration: 5000,
                                  isClosable: true
                                });
                              } catch (error) {
                                console.error('❌ Erreur suppression document:', error);
                                toast({
                                  status: "error",
                                  title: "Erreur de suppression",
                                  description: "Impossible de supprimer le document",
                                  duration: 5000,
                                  isClosable: true
                                });
                              }
                            }
                          }}
                        >
                          Supprimer
                        </Button>
                      </HStack>
                    </ListItem>
                  ))}
                </List>
              </Box>

              {/* Upload document */}
              <Divider />

              <VStack spacing={4} align="stretch">
                <Text fontWeight="600">Télécharger un nouveau document</Text>
                
                <FormControl>
                  <FormLabel>Type de document</FormLabel>
                  <Select
                    value={documentUpload.type}
                    onChange={(e) => setDocumentUpload(prev => ({ ...prev, type: e.target.value }))}
                  >
                    {Object.entries(DOCUMENT_TYPES).map(([key, config]) => (
                      <option key={key} value={key}>
                        {config.label} ({config.maxSizeMB} Mo max)
                      </option>
                    ))}
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel>Date d'expiration</FormLabel>
                  <Input
                    type="date"
                    value={documentUpload.expiryDate}
                    onChange={(e) => setDocumentUpload(prev => ({ ...prev, expiryDate: e.target.value }))}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Notes</FormLabel>
                  <Textarea
                    value={documentUpload.notes}
                    onChange={(e) => setDocumentUpload(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Remarques ou informations supplémentaires"
                    rows={3}
                  />
                </FormControl>

                <Button
                  colorScheme="blue"
                  isLoading={saving}
                  onClick={async () => {
                    try {
                      setSaving(true);
                      
                      // Valider les données
                      if (!documentUpload.type || !documentUpload.expiryDate) {
                        toast({
                          status: "error",
                          title: "Champs requis",
                          description: "Type de document et date d'expiration sont obligatoires",
                          duration: 5000,
                          isClosable: true
                        });
                        return;
                      }

                      // Upload du document
                      const formData = new FormData();
                      formData.append('file', fileInputRef.current.files[0]);
                      formData.append('type', documentUpload.type);
                      formData.append('expiryDate', documentUpload.expiryDate);
                      formData.append('notes', documentUpload.notes);

                      const response = await documentsAPI.upload(formData, editingMember.id);
                      const newDocument = response?.document || response?.data;

                      setMemberDocuments(prev => [...prev, newDocument]);
                      setDocumentUpload({
                        type: 'IDENTITY_CARD',
                        expiryDate: '',
                        notes: ''
                      });
                      fileInputRef.current.value = null;

                      toast({
                        status: "success",
                        title: "Document téléchargé",
                        description: "Le document a été ajouté avec succès",
                        duration: 5000,
                        isClosable: true
                      });
                    } catch (error) {
                      console.error('❌ Erreur upload document:', error);
                      toast({
                        status: "error",
                        title: "Erreur de téléchargement",
                        description: "Impossible de télécharger le document",
                        duration: 5000,
                        isClosable: true
                      });
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  Télécharger le document
                </Button>
              </VStack>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </PageLayout>
  );
}
