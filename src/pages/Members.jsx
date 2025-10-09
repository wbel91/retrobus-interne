import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Box, Heading, VStack, HStack, Button, Flex, useToast,
  Table, Thead, Tbody, Tr, Th, Td, Badge, Text, Spinner, Center,
  Input, Select, InputGroup, InputLeftElement, IconButton,
  useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalCloseButton, ModalBody, ModalFooter, FormControl, FormLabel,
  Textarea, Switch, SimpleGrid, Stat, StatLabel, StatNumber,
  StatHelpText, Card, CardBody, CardHeader, Tooltip,
  ButtonGroup, Divider, Alert, AlertIcon, Checkbox, CheckboxGroup,
  Progress, List, ListItem, ListIcon, useColorModeValue,
  Tabs, TabList, TabPanels, Tab, TabPanel, Image
} from "@chakra-ui/react";
import { 
  FiUsers, FiPlus, FiSearch, FiEdit, FiTrash2, FiEye, FiMail,
  FiUserPlus, FiUserCheck, FiUserX, FiClock, FiTrendingUp,
  FiFilter, FiDownload, FiKey, FiTruck, FiAward, FiShield,
  FiUpload, FiFile, FiCheckCircle, FiXCircle, FiAlertCircle,
  FiRefreshCw, FiExternalLink
} from 'react-icons/fi';
import { membersAPI } from '../api/members.js';
import { documentsAPI } from '../api/documents.js';
import { API_BASE_URL } from '../api/config.js';

const MEMBERSHIP_TYPES = {
  STANDARD: 'Standard',
  FAMILY: 'Famille',
  STUDENT: 'Étudiant',
  HONORARY: 'Honneur',
  LIFETIME: 'À vie'
};

const MEMBERSHIP_STATUS = {
  PENDING: { label: 'En attente', color: 'yellow' },
  ACTIVE: { label: 'Actif', color: 'green' },
  EXPIRED: { label: 'Expiré', color: 'red' },
  SUSPENDED: { label: 'Suspendu', color: 'orange' },
  CANCELLED: { label: 'Annulé', color: 'gray' }
};

const PAYMENT_METHODS = {
  cash: 'Espèces',
  check: 'Chèque',
  transfer: 'Virement',
  helloasso: 'HelloAsso'
};

const MEMBER_ROLES = {
  MEMBER: { label: 'Adhérent', icon: FiUsers, color: 'blue' },
  DRIVER: { label: 'Conducteur', icon: FiTruck, color: 'green' },
  ADMIN: { label: 'Administrateur', icon: FiShield, color: 'red' },
  BUREAU: { label: 'Bureau', icon: FiAward, color: 'purple' }
};

const DRIVER_LICENSES = {
  B: 'Permis B (véhicules légers)',
  C: 'Permis C (poids lourds)',
  D: 'Permis D (transport de personnes)',
  SPECIAL: 'Autorisation spéciale RBE'
};

const DRIVER_CERTIFICATIONS = [
  'Formation conduite véhicules historiques',
  'FIMO Transport de personnes',
  'Formation sécurité RBE',
  'Habilitation véhicules spéciaux',
  'Formation premiers secours'
];

const DOCUMENT_TYPES = {
  DRIVING_LICENSE: { label: 'Permis de conduire', icon: FiTruck, color: 'blue', required: true },
  IDENTITY_CARD: { label: 'Carte d\'identité', icon: FiUserCheck, color: 'green', required: true },
  INSURANCE_RECORD: { label: 'Relevé d\'assurance', icon: FiShield, color: 'orange', required: true },
  MEMBERSHIP_FORM: { label: 'Bulletin d\'adhésion', icon: FiFile, color: 'purple', required: true },
  MEDICAL_CERTIFICATE: { label: 'Certificat médical', icon: FiCheckCircle, color: 'teal', required: false },
  OTHER: { label: 'Autre document', icon: FiFile, color: 'gray', required: false }
};

const DOCUMENT_STATUS = {
  PENDING: { label: 'En attente', color: 'yellow', icon: FiClock },
  APPROVED: { label: 'Validé', color: 'green', icon: FiCheckCircle },
  REJECTED: { label: 'Rejeté', color: 'red', icon: FiXCircle },
  EXPIRED: { label: 'Expiré', color: 'gray', icon: FiAlertCircle }
};

const IT_ROLES = [
  { value: 'ADMIN', label: 'Administrateur' },
  { value: 'STAFF', label: 'Staff' },
  { value: 'USER', label: 'Utilisateur' },
  { value: 'GUEST', label: 'Invité' }
];

const POSTES = [
  'Président',
  'Vice-Président',
  'Trésorier',
  'Secrétaire',
  'Responsable événement',
  'Responsable communication',
  'Membre actif',
  'Bénévole',
  'Autre'
];

const Members = () => {
  const [members, setMembers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [filters, setFilters] = useState({ status: 'ALL', search: '', sort: 'lastName' });
  const [editingMember, setEditingMember] = useState(null);
  const [memberDocuments, setMemberDocuments] = useState([]);
  const [documentUpload, setDocumentUpload] = useState({
    type: 'IDENTITY_CARD',
    expiryDate: '',
    notes: ''
  });
  
  const fileInputRef = useRef(null);
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const [formData, setFormData] = useState({
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
    renewalDate: '',
    paymentAmount: '',
    paymentMethod: '',
    hasExternalAccess: false,
    hasInternalAccess: false,
    newsletter: true,
    notes: '',
    role: 'MEMBER',
    driverLicense: '',
    licenseExpiryDate: '',
    medicalCertificateDate: '',
    emergencyContact: '',
    emergencyPhone: '',
    driverCertifications: [],
    vehicleAuthorizations: [],
    maxPassengers: '',
    driverNotes: '',
    itRole: 'USER',
    poste: ''
  });

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await membersAPI.getAll({
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      });
      setMembers(data.members || []);
      setPagination(data.pagination || pagination);
    } catch (e) {
      console.error('Erreur chargement adhérents:', e);
      toast({
        status: "error",
        title: "Erreur de chargement",
        description: "Impossible de charger les adhérents."
      });
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters, toast]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await membersAPI.getStats();
      setStats(data);
    } catch (e) {
      // Ignorer les 404 si la route n'est pas disponible sur l'instance déployée
      if (!(e && typeof e.message === 'string' && e.message.includes('404'))) {
        console.error('Erreur chargement statistiques:', e);
      }
    }
  }, []);

  const fetchMemberDocuments = useCallback(async (memberId) => {
    try {
      const documents = await documentsAPI.getByMember(memberId);
      setMemberDocuments(documents);
    } catch (error) {
      console.error('Erreur chargement documents:', error);
      setMemberDocuments([]);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
    fetchStats();
  }, [fetchMembers, fetchStats]);

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
      renewalDate: '',
      paymentAmount: '',
      paymentMethod: '',
      hasExternalAccess: false,
      hasInternalAccess: false,
      newsletter: true,
      notes: '',
      role: 'MEMBER',
      driverLicense: '',
      licenseExpiryDate: '',
      medicalCertificateDate: '',
      emergencyContact: '',
      emergencyPhone: '',
      driverCertifications: [],
      vehicleAuthorizations: [],
      maxPassengers: '',
      driverNotes: '',
      itRole: 'USER',
      poste: ''
    });
    setMemberDocuments([]);
  };

  const handleCreate = () => {
    setEditingMember(null);
    resetForm();
    onOpen();
  };

  const handleEdit = async (member) => {
    setEditingMember(member);
    setFormData({
      firstName: member.firstName || '',
      lastName: member.lastName || '',
      email: member.email || '',
      phone: member.phone || '',
      address: member.address || '',
      city: member.city || '',
      postalCode: member.postalCode || '',
      birthDate: member.birthDate ? member.birthDate.substring(0, 10) : '',
      membershipType: member.membershipType || 'STANDARD',
      membershipStatus: member.membershipStatus || 'PENDING',
      renewalDate: member.renewalDate ? member.renewalDate.substring(0, 10) : '',
      paymentAmount: member.paymentAmount || '',
      paymentMethod: member.paymentMethod || '',
      hasExternalAccess: member.hasExternalAccess || false,
      hasInternalAccess: member.hasInternalAccess || false,
      newsletter: member.newsletter !== false,
      notes: member.notes || '',
      role: member.role || 'MEMBER',
      driverLicense: member.driverLicense || '',
      licenseExpiryDate: member.licenseExpiryDate ? member.licenseExpiryDate.substring(0, 10) : '',
      medicalCertificateDate: member.medicalCertificateDate ? member.medicalCertificateDate.substring(0, 10) : '',
      emergencyContact: member.emergencyContact || '',
      emergencyPhone: member.emergencyPhone || '',
      driverCertifications: member.driverCertifications || [],
      vehicleAuthorizations: member.vehicleAuthorizations || [],
      maxPassengers: member.maxPassengers || '',
      driverNotes: member.driverNotes || '',
      itRole: member.itRole || 'USER',
      poste: member.poste || ''
    });
    
    // Charger les documents du membre
    await fetchMemberDocuments(member.id);
    onOpen();
  };

  const handleSave = async () => {
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim()) {
      toast({
        status: "warning",
        title: "Champs obligatoires",
        description: "Prénom, nom et email sont requis."
      });
      return;
    }

    if (formData.role === 'DRIVER') {
      if (!formData.driverLicense) {
        toast({
          status: "warning",
          title: "Permis requis",
          description: "Le type de permis est obligatoire pour un conducteur."
        });
        return;
      }
      if (!formData.emergencyContact || !formData.emergencyPhone) {
        toast({
          status: "warning",
          title: "Contact d'urgence requis",
          description: "Le contact d'urgence est obligatoire pour un conducteur."
        });
        return;
      }
    }

    try {
      setSaving(true);
      
      const memberData = {
        ...formData,
        paymentAmount: formData.paymentAmount ? parseFloat(formData.paymentAmount) : null,
        maxPassengers: formData.maxPassengers ? parseInt(formData.maxPassengers) : null
      };

      if (editingMember) {
        await membersAPI.update(editingMember.id, memberData);
        toast({
          status: "success",
          title: "Adhérent modifié",
          description: "Les informations ont été mises à jour avec succès."
        });
      } else {
        await membersAPI.create(memberData);
        toast({
          status: "success",
          title: "Adhérent créé",
          description: "Le nouvel adhérent a été ajouté avec succès."
        });
      }

      await fetchMembers();
      await fetchStats();
      onClose();
      resetForm();
    } catch (e) {
      toast({
        status: "error",
        title: "Erreur lors de la sauvegarde",
        description: e.message
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (member) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'adhérent ${member.firstName} ${member.lastName} ?`)) {
      return;
    }

    try {
      await membersAPI.delete(member.id);
      toast({
        status: "success",
        title: "Adhérent supprimé",
        description: "L'adhérent a été supprimé avec succès."
      });
      await fetchMembers();
      await fetchStats();
    } catch (e) {
      toast({
        status: "error",
        title: "Erreur lors de la suppression",
        description: e.message
      });
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset à la page 1
  };

  const handleDocumentUpload = async (file) => {
    if (!editingMember) return;

    try {
      setUploadingDocument(true);
      
      const formDataUpload = new FormData();
      formDataUpload.append('document', file);
      formDataUpload.append('documentType', documentUpload.type);
      formDataUpload.append('expiryDate', documentUpload.expiryDate);
      formDataUpload.append('notes', documentUpload.notes);

      const response = await fetch(`${API_BASE_URL}/api/documents/member/${editingMember.id}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formDataUpload
      });

      if (response.ok) {
        toast({
          status: "success",
          title: "Document uploadé",
          description: "Le document a été ajouté avec succès."
        });
        
        await fetchMemberDocuments(editingMember.id);
        setDocumentUpload({ type: 'IDENTITY_CARD', expiryDate: '', notes: '' });
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        throw new Error('Erreur upload');
      }
    } catch (error) {
      toast({
        status: "error",
        title: "Erreur upload",
        description: "Impossible d'uploader le document."
      });
    } finally {
      setUploadingDocument(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      handleDocumentUpload(file);
    }
  };

  const handleDocumentDelete = async (documentId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) return;

    try {
      await documentsAPI.delete(documentId);
      toast({
        status: "success",
        title: "Document supprimé",
        description: "Le document a été supprimé avec succès."
      });
      await fetchMemberDocuments(editingMember.id);
    } catch (error) {
      toast({
        status: "error",
        title: "Erreur suppression",
        description: "Impossible de supprimer le document."
      });
    }
  };

  const handlePasswordReset = async (member) => {
    try {
      // Utiliser l'API base configurée pour éviter les 404 d'origine
      const response = await fetch(`${API_BASE_URL}/api/password-reset/request/${member.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const msg = data.emailSent === false
          ? `Demande traitée, mais email non envoyé (SMTP non configuré).`
          : `Email de réinitialisation envoyé à ${data.sentTo}`;
        toast({
          status: "success",
          title: "Réinitialisation",
          description: msg
        });
      }
    } catch (error) {
      toast({
        status: "error",
        title: "Erreur",
        description: "Impossible d'envoyer l'email de réinitialisation."
      });
    }
  };

  const handleCreateAccess = async (member) => {
    try {
      // Utiliser l'API base configurée pour éviter les 404 d'origine
      const response = await fetch(`${API_BASE_URL}/api/password-reset/generate-temporary/${member.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const sentMsg = data.emailSent === false
          ? `Accès créé. Email non envoyé. MDP: ${data.temporaryPassword || ''}`
          : `Mot de passe temporaire envoyé à ${data.sentTo}`;
        toast({
          status: "success",
          title: "Accès créé",
          description: sentMsg
        });
        try {
          if (data.temporaryPassword) {
            await navigator.clipboard.writeText(data.temporaryPassword);
            toast({ status: 'info', title: 'MDP copié', description: 'Le mot de passe temporaire a été copié dans le presse-papiers.' });
          }
        } catch {}
        await fetchMembers();
      }
    } catch (error) {
      toast({
        status: "error",
        title: "Erreur",
        description: "Impossible de créer l'accès."
      });
    }
  };

  const assignMemberToRole = (roleId, member, itRole = 'USER', poste = '') => {
    setPresentMembers(prev =>
      prev.map(m =>
        m.id === roleId
          ? {
              ...m,
              name: `${member.firstName} ${member.lastName}`,
              memberInfo: member,
              assignedMemberId: member.id,
              itRole,
              poste
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

  const getStatusBadge = (status) => {
    const statusConfig = MEMBERSHIP_STATUS[status] || { label: status, color: 'gray' };
    return <Badge colorScheme={statusConfig.color}>{statusConfig.label}</Badge>;
  };

  const getRoleBadge = (role) => {
    const roleConfig = MEMBER_ROLES[role] || { label: role, color: 'gray' };
    const IconComponent = roleConfig.icon;
    return (
      <Badge colorScheme={roleConfig.color} variant="subtle">
        <HStack spacing={1}>
          <IconComponent size="12px" />
          <Text>{roleConfig.label}</Text>
        </HStack>
      </Badge>
    );
  };

  const getDocumentStatusBadge = (status) => {
    const config = DOCUMENT_STATUS[status];
    const IconComponent = config.icon;
    return (
      <Badge colorScheme={config.color} variant="subtle">
        <HStack spacing={1}>
          <IconComponent size="12px" />
          <Text>{config.label}</Text>
        </HStack>
      </Badge>
    );
  };

  const getDocumentProgress = (documents) => {
    const requiredDocs = Object.entries(DOCUMENT_TYPES).filter(([_, config]) => config.required);
    const approvedDocs = documents.filter(doc => 
      doc.status === 'APPROVED' && 
      requiredDocs.some(([type]) => type === doc.documentType)
    );
    
    return {
      current: approvedDocs.length,
      total: requiredDocs.length,
      percentage: (approvedDocs.length / requiredDocs.length) * 100
    };
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const isExpiringSoon = (renewalDate) => {
    if (!renewalDate) return false;
    const renewal = new Date(renewalDate);
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return renewal <= thirtyDaysFromNow && renewal >= now;
  };

  const isDriverLicenseExpiringSoon = (expiryDate) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const now = new Date();
    const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    return expiry <= sixtyDaysFromNow && expiry >= now;
  };

  return (
    <Box p={6}>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading>Gestion des Adhésions</Heading>
        <HStack spacing={3}>
          <Button leftIcon={<FiDownload />} size="sm" variant="outline">
            Exporter
          </Button>
          <Button leftIcon={<FiPlus />} colorScheme="blue" onClick={handleCreate}>
            Nouvel adhérent
          </Button>
        </HStack>
      </Flex>

      {/* Statistiques */}
      {stats && (
        <SimpleGrid columns={{ base: 2, md: 3, lg: 6 }} spacing={4} mb={8}>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Total</StatLabel>
                <StatNumber>{stats.totalMembers}</StatNumber>
                <StatHelpText>adhérents</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
          
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Actifs</StatLabel>
                <StatNumber color="green.500">{stats.activeMembers}</StatNumber>
                <StatHelpText>à jour</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
          
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Conducteurs</StatLabel>
                <StatNumber color="blue.500">{stats.drivers || 0}</StatNumber>
                <StatHelpText>habilités</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
          
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Expirés</StatLabel>
                <StatNumber color="red.500">{stats.expiredMembers}</StatNumber>
                <StatHelpText>à renouveler</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
          
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Accès MyRBE</StatLabel>
                <StatNumber color="purple.500">{stats.membersWithInternalAccess}</StatNumber>
                <StatHelpText>connectés</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
          
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Nouveaux</StatLabel>
                <StatNumber color="orange.500">{stats.recentJoins}</StatNumber>
                <StatHelpText>30 derniers jours</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>
      )}

      {/* Filtres */}
      <Card mb={6}>
        <CardBody>
          <HStack spacing={4} wrap="wrap">
            <InputGroup maxW="300px">
              <InputLeftElement>
                <FiSearch />
              </InputLeftElement>
              <Input
                placeholder="Rechercher..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </InputGroup>
            
            <Select
              maxW="200px"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="ALL">Tous les statuts</option>
              <option value="ACTIVE">Actifs</option>
              <option value="EXPIRED">Expirés</option>
              <option value="PENDING">En attente</option>
              <option value="SUSPENDED">Suspendus</option>
            </Select>

            <Select
              maxW="200px"
              value={filters.role || 'ALL'}
              onChange={(e) => handleFilterChange('role', e.target.value)}
            >
              <option value="ALL">Tous les rôles</option>
              <option value="MEMBER">Adhérents</option>
              <option value="DRIVER">Conducteurs</option>
              <option value="ADMIN">Administrateurs</option>
              <option value="BUREAU">Bureau</option>
            </Select>
            
            <Select
              maxW="200px"
              value={filters.sort}
              onChange={(e) => handleFilterChange('sort', e.target.value)}
            >
              <option value="lastName">Nom (A-Z)</option>
              <option value="joinDate">Date d'adhésion</option>
              <option value="renewalDate">Date de renouvellement</option>
              <option value="memberNumber">Numéro adhérent</option>
              <option value="role">Rôle</option>
            </Select>
          </HStack>
        </CardBody>
      </Card>

      {/* Tableau des adhérents */}
      {loading ? (
        <Center py={20}>
          <Spinner size="xl" />
        </Center>
      ) : (
        <Card>
          <CardBody>
            <Box overflowX="auto">
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>N° Adhérent</Th>
                    <Th>Nom</Th>
                    <Th>Email</Th>
                    <Th>Rôle</Th>
                    <Th>Type</Th>
                    <Th>Statut</Th>
                    <Th>Renouvellement</Th>
                    <Th>Accès</Th>
                    <Th>Rôle IT</Th>
                    <Th>Poste</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {members.map(member => (
                    <Tr key={member.id}>
                      <Td fontFamily="mono">{member.memberNumber}</Td>
                      <Td>
                        <VStack align="start" spacing={0}>
                          <Text fontWeight="semibold">
                            {member.firstName} {member.lastName}
                          </Text>
                          {member.phone && (
                            <Text fontSize="sm" color="gray.600">{member.phone}</Text>
                          )}
                        </VStack>
                      </Td>
                      <Td>{member.email}</Td>
                      <Td>{getRoleBadge(member.role || 'MEMBER')}</Td>
                      <Td>{MEMBERSHIP_TYPES[member.membershipType]}</Td>
                      <Td>{getStatusBadge(member.membershipStatus)}</Td>
                      <Td>
                        <VStack align="start" spacing={0}>
                          <Text fontSize="sm">
                            {formatDate(member.renewalDate)}
                          </Text>
                          {isExpiringSoon(member.renewalDate) && (
                            <Badge colorScheme="orange" size="sm">Expire bientôt</Badge>
                          )}
                          {member.role === 'DRIVER' && isDriverLicenseExpiringSoon(member.licenseExpiryDate) && (
                            <Badge colorScheme="red" size="sm">Permis expire</Badge>
                          )}
                        </VStack>
                      </Td>
                      <Td>
                        <HStack spacing={2}>
                          {member.hasExternalAccess && (
                            <Tooltip label="Accès site externe">
                              <Badge colorScheme="green" size="sm">Ext</Badge>
                            </Tooltip>
                          )}
                          {member.hasInternalAccess && (
                            <Tooltip label="Accès MyRBE">
                              <Badge colorScheme="blue" size="sm">MyRBE</Badge>
                            </Tooltip>
                          )}
                          {member.newsletter && (
                            <Tooltip label="Newsletter">
                              <Badge colorScheme="purple" size="sm">📧</Badge>
                            </Tooltip>
                          )}
                        </HStack>
                      </Td>
                      <Td>{IT_ROLES.find(r => r.value === member.itRole)?.label || '-'}</Td>
                      <Td>{member.poste || '-'}</Td>
                      <Td>
                        <ButtonGroup size="sm" spacing={1}>
                          <IconButton
                            icon={<FiEdit />}
                            onClick={() => handleEdit(member)}
                            aria-label="Modifier"
                          />
                          <IconButton
                            icon={<FiMail />}
                            colorScheme="blue"
                            variant="outline"
                            aria-label="Envoyer email"
                          />
                          <IconButton
                            icon={<FiTrash2 />}
                            colorScheme="red"
                            variant="outline"
                            onClick={() => handleDelete(member)}
                            aria-label="Supprimer"
                          />
                        </ButtonGroup>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
            
            {members.length === 0 && (
              <Center py={10}>
                <Text color="gray.500">Aucun adhérent trouvé</Text>
              </Center>
            )}
          </CardBody>
        </Card>
      )}

      {/* Modal de création/édition avec onglets */}
      <Modal isOpen={isOpen} onClose={onClose} size="6xl">
        <ModalOverlay />
        <ModalContent maxW="95vw">
          <ModalHeader>
            {editingMember ? `Modifier l'adhérent - ${editingMember.firstName} ${editingMember.lastName}` : 'Nouvel adhérent'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Tabs>
              <TabList>
                <Tab>👤 Informations</Tab>
                <Tab>📋 Adhésion</Tab>
                {formData.role === 'DRIVER' && <Tab>🚗 Conducteur</Tab>}
                {editingMember && <Tab>📄 Documents</Tab>}
                <Tab>🔐 Accès</Tab>
              </TabList>

              <TabPanels>
                {/* Onglet Informations personnelles */}
                <TabPanel>
                  <VStack spacing={6}>
                    <Box w="100%">
                      <Heading size="md" mb={4}>👤 Informations personnelles</Heading>
                      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
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
                            placeholder="email@exemple.fr"
                          />
                        </FormControl>
                        
                        <FormControl>
                          <FormLabel>Téléphone</FormLabel>
                          <Input
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

                        <FormControl>
                          <FormLabel>Rôle informatique</FormLabel>
                          <Select
                            value={formData.itRole}
                            onChange={e => setFormData(prev => ({ ...prev, itRole: e.target.value }))}
                          >
                            {IT_ROLES.map(r => (
                              <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                          </Select>
                        </FormControl>
                      </SimpleGrid>

                      {/* Adresse */}
                      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mt={4}>
                        <FormControl>
                          <FormLabel>Adresse</FormLabel>
                          <Input
                            value={formData.address}
                            onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                            placeholder="123 Rue de la République"
                          />
                        </FormControl>
                        
                        <FormControl>
                          <FormLabel>Ville</FormLabel>
                          <Input
                            value={formData.city}
                            onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                            placeholder="Paris"
                          />
                        </FormControl>
                        
                        <FormControl>
                          <FormLabel>Code postal</FormLabel>
                          <Input
                            value={formData.postalCode}
                            onChange={(e) => setFormData(prev => ({ ...prev, postalCode: e.target.value }))}
                            placeholder="75001"
                          />
                        </FormControl>
                      </SimpleGrid>

                      {/* Poste/Fonction */}
                      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mt={4}>
                        <FormControl>
                          <FormLabel>Poste/Fonction</FormLabel>
                          <Select
                            value={formData.poste}
                            onChange={e => setFormData(prev => ({ ...prev, poste: e.target.value }))}
                            placeholder="Sélectionner le poste"
                          >
                            {POSTES.map(p => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </Select>
                        </FormControl>
                      </SimpleGrid>
                    </Box>
                  </VStack>
                </TabPanel>

                {/* Onglet Adhésion */}
                <TabPanel>
                  <VStack spacing={6}>
                    <Box w="100%">
                      <Heading size="md" mb={4}>📋 Adhésion</Heading>
                      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                        <FormControl>
                          <FormLabel>Type d'adhésion</FormLabel>
                          <Select
                            value={formData.membershipType}
                            onChange={(e) => setFormData(prev => ({ ...prev, membershipType: e.target.value }))}
                          >
                            {Object.entries(MEMBERSHIP_TYPES).map(([key, label]) => (
                              <option key={key} value={key}>{label}</option>
                            ))}
                          </Select>
                        </FormControl>
                        
                        <FormControl>
                          <FormLabel>Statut</FormLabel>
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
                          <FormLabel>Date de renouvellement</FormLabel>
                          <Input
                            type="date"
                            value={formData.renewalDate}
                            onChange={(e) => setFormData(prev => ({ ...prev, renewalDate: e.target.value }))}
                          />
                        </FormControl>
                        
                        <FormControl>
                          <FormLabel>Montant cotisation (€)</FormLabel>
                          <Input
                            type="number"
                            step="0.01"
                            value={formData.paymentAmount}
                            onChange={(e) => setFormData(prev => ({ ...prev, paymentAmount: e.target.value }))}
                            placeholder="35.00"
                          />
                        </FormControl>
                        
                        <FormControl>
                          <FormLabel>Mode de paiement</FormLabel>
                          <Select
                            value={formData.paymentMethod}
                            onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                          >
                            <option value="">Sélectionner...</option>
                            {Object.entries(PAYMENT_METHODS).map(([key, label]) => (
                              <option key={key} value={key}>{label}</option>
                            ))}
                          </Select>
                        </FormControl>
                      </SimpleGrid>
                    </Box>
                  </VStack>
                </TabPanel>

                {/* Onglet Conducteur */}
                {formData.role === 'DRIVER' && (
                  <TabPanel>
                    <VStack spacing={6}>
                      <Box w="100%">
                        <Heading size="md" mb={4} color="green.600">
                          🚗 Informations conducteur
                        </Heading>
                        
                        <Alert status="info" mb={4}>
                          <AlertIcon />
                          Les informations ci-dessous sont obligatoires pour les conducteurs RétroBus Essonne.
                        </Alert>

                        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                          <FormControl isRequired>
                            <FormLabel>Type de permis</FormLabel>
                            <Select
                              value={formData.driverLicense}
                              onChange={(e) => setFormData(prev => ({ ...prev, driverLicense: e.target.value }))}
                            >
                              <option value="">Sélectionner le permis...</option>
                              {Object.entries(DRIVER_LICENSES).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                              ))}
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
                          
                          <FormControl>
                            <FormLabel>Visite médicale</FormLabel>
                            <Input
                              type="date"
                              value={formData.medicalCertificateDate}
                              onChange={(e) => setFormData(prev => ({ ...prev, medicalCertificateDate: e.target.value }))}
                            />
                          </FormControl>
                          
                          <FormControl isRequired>
                            <FormLabel>Contact d'urgence</FormLabel>
                            <Input
                              value={formData.emergencyContact}
                              onChange={(e) => setFormData(prev => ({ ...prev, emergencyContact: e.target.value }))}
                              placeholder="Nom du contact d'urgence"
                            />
                          </FormControl>
                          
                          <FormControl isRequired>
                            <FormLabel>Téléphone d'urgence</FormLabel>
                            <Input
                              value={formData.emergencyPhone}
                              onChange={(e) => setFormData(prev => ({ ...prev, emergencyPhone: e.target.value }))}
                              placeholder="06 12 34 56 78"
                            />
                          </FormControl>
                          
                          <FormControl>
                            <FormLabel>Nombre max de passagers</FormLabel>
                            <Input
                              type="number"
                              value={formData.maxPassengers}
                              onChange={(e) => setFormData(prev => ({ ...prev, maxPassengers: e.target.value }))}
                              placeholder="50"
                            />
                          </FormControl>
                        </SimpleGrid>

                        {/* Certifications */}
                        <Box mt={6}>
                          <FormLabel>Certifications et formations</FormLabel>
                          <CheckboxGroup
                            value={formData.driverCertifications}
                            onChange={(values) => setFormData(prev => ({ ...prev, driverCertifications: values }))}
                          >
                            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={2}>
                              {DRIVER_CERTIFICATIONS.map(cert => (
                                <Checkbox key={cert} value={cert}>
                                  {cert}
                                </Checkbox>
                              ))}
                            </SimpleGrid>
                          </CheckboxGroup>
                        </Box>

                        {/* Notes spécifiques conducteur */}
                        <Box mt={4}>
                          <FormControl>
                            <FormLabel>Notes spécifiques conducteur</FormLabel>
                            <Textarea
                              value={formData.driverNotes}
                              onChange={(e) => setFormData(prev => ({ ...prev, driverNotes: e.target.value }))}
                              placeholder="Expérience, restrictions, véhicules autorisés, etc."
                              rows={3}
                            />
                          </FormControl>
                        </Box>
                      </Box>
                    </VStack>
                  </TabPanel>
                )}

                {/* Onglet Documents */}
                {editingMember && (
                  <TabPanel>
                    <VStack spacing={6} align="stretch">
                      <Box>
                        <Heading size="md" mb={4}>📄 Documents du membre</Heading>
                        
                        {/* Progression des documents obligatoires */}
                        {(() => {
                          const progress = getDocumentProgress(memberDocuments);
                          return (
                            <Card mb={4}>
                              <CardBody>
                                <HStack justify="space-between" mb={2}>
                                  <Text fontWeight="semibold">Documents obligatoires</Text>
                                  <Text fontSize="sm" color="gray.600">
                                    {progress.current}/{progress.total} validés
                                  </Text>
                                </HStack>
                                <Progress 
                                  value={progress.percentage} 
                                  colorScheme={progress.percentage === 100 ? 'green' : 'orange'}
                                  size="lg"
                                />
                              </CardBody>
                            </Card>
                          );
                        })()}

                        {/* Upload de nouveau document */}
                        <Card mb={4}>
                          <CardBody>
                            <Heading size="sm" mb={4}>📤 Ajouter un document</Heading>
                            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mb={4}>
                              <FormControl>
                                <FormLabel>Type de document</FormLabel>
                                <Select
                                  value={documentUpload.type}
                                  onChange={(e) => setDocumentUpload(prev => ({ ...prev, type: e.target.value }))}
                                >
                                  {Object.entries(DOCUMENT_TYPES).map(([key, config]) => (
                                    <option key={key} value={key}>
                                      {config.label} {config.required && '*'}

                                    </option>
                                  ))}
                                </Select>
                              </FormControl>
                              
                              <FormControl>
                                <FormLabel>Date d'expiration (optionnel)</FormLabel>
                                <Input
                                  type="date"
                                  value={documentUpload.expiryDate}
                                  onChange={(e) => setDocumentUpload(prev => ({ ...prev, expiryDate: e.target.value }))}

                                />
                              </FormControl>
                              
                              <FormControl>
                                <FormLabel>Notes</FormLabel>
                                <Input
                                  value={documentUpload.notes}
                                  onChange={(e) => setDocumentUpload(prev => ({ ...prev, notes: e.target.value }))}

                                  placeholder="Notes optionnelles..."
                                />
                              </FormControl>
                            </SimpleGrid>
                            
                            <HStack>
                              <Input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                                display="none"
                              />
                              <Button
                                leftIcon={<FiUpload />}
                                onClick={() => fileInputRef.current?.click()}
                                isLoading={uploadingDocument}
                                loadingText="Upload en cours..."
                              >
                                Sélectionner un fichier
                              </Button>
                              <Text fontSize="sm" color="gray.600">
                                Formats acceptés: PDF, JPEG, PNG, GIF, WebP (max 10MB)
                              </Text>
                            </HStack>
                          </CardBody>
                        </Card>

                        {/* Liste des documents */}
                        <Card>
                          <CardBody>
                            <Heading size="sm" mb={4}>📋 Documents existants</Heading>
                            {memberDocuments.length === 0 ? (
                              <Center py={8}>
                                <VStack>
                                  <FiFile size={48} color="gray" />
                                  <Text color="gray.500">Aucun document uploadé</Text>
                                </VStack>
                              </Center>
                            ) : (
                              <VStack spacing={3} align="stretch">
                                {memberDocuments.map(doc => {
                                  const docConfig = DOCUMENT_TYPES[doc.documentType];
                                  const IconComponent = docConfig.icon;
                                  
                                  return (
                                    <Box
                                      key={doc.id}
                                      p={4}
                                      border="1px solid"
                                      borderColor="gray.200"
                                      borderRadius="md"
                                    >
                                      <HStack justify="space-between">
                                        <HStack spacing={3}>
                                          <IconComponent color={`${docConfig.color}.500`} size={20} />
                                          <VStack align="start" spacing={0}>
                                            <Text fontWeight="semibold">{docConfig.label}</Text>
                                            <Text fontSize="sm" color="gray.600">{doc.fileName}</Text>
                                            <HStack spacing={2}>
                                              {getDocumentStatusBadge(doc.status)}
                                              {doc.expiryDate && (
                                                <Badge size="sm" colorScheme="gray">
                                                  Expire: {new Date(doc.expiryDate).toLocaleDateString('fr-FR')}
                                                </Badge>
                                              )}
                                            </HStack>
                                          </VStack>
                                        </HStack>
                                        
                                        <ButtonGroup size="sm">
                                          <IconButton
                                            icon={<FiEye />}
                                            onClick={() => window.open(`/api/documents/${doc.id}/download`, '_blank')}
                                            aria-label="Voir"
                                          />
                                          <IconButton
                                            icon={<FiDownload />}
                                            onClick={() => {
                                              const link = document.createElement('a');
                                              link.href = `/api/documents/${doc.id}/download`;
                                              link.download = doc.fileName;
                                              link.click();
                                            }}
                                            aria-label="Télécharger"
                                          />
                                          <IconButton
                                            icon={<FiTrash2 />}
                                            colorScheme="red"
                                            variant="outline"
                                            onClick={() => handleDocumentDelete(doc.id)}
                                            aria-label="Supprimer"
                                          />
                                        </ButtonGroup>
                                      </HStack>
                                      
                                      {doc.notes && (
                                        <Text fontSize="sm" color="gray.600" mt={2}>
                                          📝 {doc.notes}
                                        </Text>
                                      )}
                                    </Box>
                                  );
                                })}
                              </VStack>
                            )}
                          </CardBody>
                        </Card>
                      </Box>
                    </VStack>
                  </TabPanel>
                )}

                {/* Onglet Accès */}
                <TabPanel>
                  <VStack spacing={6} align="stretch">
                    <Box>
                      <Heading size="md" mb={4}>🔐 Gestion des accès</Heading
                      >
                      
                      <VStack spacing={4} align="start">
                        <HStack>
                          <Switch
                            isChecked={formData.hasExternalAccess}
                            onChange={(e) => setFormData(prev => ({ ...prev, hasExternalAccess: e.target.checked }))}

                          />
                          <Text>Accès site externe (newsletter, événements)</Text>
                        </HStack>
                        
                        <HStack>
                          <Switch
                            isChecked={formData.hasInternalAccess}
                            onChange={(e) => setFormData(prev => ({ ...prev, hasInternalAccess: e.target.checked }))}

                          />
                          <Text>Accès MyRBE (tableau de bord interne)</Text>
                        </HStack>
                        
                        <HStack>
                          <Switch
                            isChecked={formData.newsletter}
                            onChange={(e) => setFormData(prev => ({ ...prev, newsletter: e.target.checked }))}

                          />
                          <Text>Newsletter</Text>
                        </HStack>
                      </VStack>

                      {editingMember && (
                        <>
                          <Divider my={6} />
                          
                          <Box>
                            <Heading size="sm" mb={4}>🔑 Gestion du mot de passe MyRBE</Heading>
                            
                            {editingMember.hasInternalAccess ? (
                              <VStack spacing={4} align="stretch">
                                <Alert status="info">
                                  <AlertIcon />
                                  <VStack align="start" spacing={1}>
                                    <Text fontWeight="semibold">Accès MyRBE activé</Text>
                                    <Text fontSize="sm">
                                      Cet adhérent peut se connecter à MyRBE avec son email et son mot de passe.
                                    </Text>
                                  </VStack>
                                </Alert>
                                
                                <Button
                                  leftIcon={<FiRefreshCw />}
                                  colorScheme="orange"
                                  variant="outline"
                                  onClick={() => handlePasswordReset(editingMember)}
                                >
                                  Envoyer un email de réinitialisation
                                </Button>
                              </VStack>
                            ) : (
                              <VStack spacing={4} align="stretch">
                                <Alert status="warning">
                                  <AlertIcon />
                                  <VStack align="start" spacing={1}>
                                    <Text fontWeight="semibold">Accès MyRBE inactif</Text>
                                    <Text fontSize="sm">
                                      Cet adhérent n'a pas encore d'accès à MyRBE.
                                    </Text>
                                  </VStack>
                                </Alert>
                                
                                <Button
                                  leftIcon={<FiKey />}
                                  colorScheme="green"
                                  onClick={() => handleCreateAccess(editingMember)}
                                >
                                  Créer l'accès et envoyer les identifiants
                                </Button>
                              </VStack>
                            )}
                          </Box>
                        </>
                      )}
                    </Box>
                    
                    <Divider />
                    
                    <Box>
                      <FormControl>
                        <FormLabel>Notes administratives</FormLabel>
                        <Textarea
                          value={formData.notes}
                          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                          placeholder="Notes internes..."
                          rows={3}
                        />
                      </FormControl>
                    </Box>
                  </VStack>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </ModalBody>
          
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Annuler
            </Button>
            <Button colorScheme="blue" onClick={handleSave} isLoading={saving}>
              {editingMember ? 'Modifier' : 'Créer'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default Members;
