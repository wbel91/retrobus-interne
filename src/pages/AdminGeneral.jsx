import React, { useState, useEffect } from "react";
import {
  Box, Grid, Card, CardBody, CardHeader, Heading, Text, Button,
  Input, Select, VStack, HStack, Badge, useToast, Modal, ModalOverlay,
  ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
  useDisclosure, FormControl, FormLabel, Textarea, Flex,
  Icon, SimpleGrid, Alert, AlertIcon, Container, Stat, StatLabel,
  StatNumber, StatHelpText, ButtonGroup, IconButton, Menu, MenuButton, 
  MenuList, MenuItem, useColorModeValue, Spinner, Table, Thead, Tbody,
  Tr, Th, Td, Progress, Divider, Tabs, TabList, TabPanels, Tab, TabPanel,
  Avatar, AvatarGroup, Tag, TagLabel, useBreakpointValue
} from "@chakra-ui/react";
import {
  FiUsers, FiCalendar, FiFileText, FiSettings, FiDownload, FiUpload,
  FiEdit3, FiTrash2, FiMoreHorizontal, FiCheck, FiX, FiRefreshCw, 
  FiEye, FiPlus, FiBell, FiMail, FiPhone, FiMapPin, FiClock,
  FiUser, FiShield, FiBookOpen, FiAward, FiTrendingUp, FiAlertTriangle,
  FiMessageSquare, FiFlag, FiActivity, FiFilter, FiSend
} from "react-icons/fi";
import { useUser } from '../context/UserContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Composant pour les statistiques administratives
const AdminStats = ({ data, loading }) => {
  const cardBg = useColorModeValue("white", "gray.800");
  
  if (loading) {
    return (
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6} mb={8}>
        {[1, 2, 3, 4].map(i => (
          <Card key={i} bg={cardBg}>
            <CardBody>
              <Stat>
                <StatLabel color="gray.600">Chargement...</StatLabel>
                <StatNumber><Spinner size="sm" /></StatNumber>
              </Stat>
            </CardBody>
          </Card>
        ))}
      </SimpleGrid>
    );
  }
  
  return (
    <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6} mb={8}>
      <Card bg={cardBg}>
        <CardBody>
          <Stat>
            <StatLabel color="gray.600">Reports ouverts</StatLabel>
            <StatNumber color="red.500">
              <HStack>
                <Icon as={FiAlertTriangle} />
                <Text>{data?.openReports || 0}</Text>
              </HStack>
            </StatNumber>
            <StatHelpText>En attente de traitement</StatHelpText>
          </Stat>
        </CardBody>
      </Card>

      <Card bg={cardBg}>
        <CardBody>
          <Stat>
            <StatLabel color="gray.600">Reports en cours</StatLabel>
            <StatNumber color="orange.500">
              <HStack>
                <Icon as={FiActivity} />
                <Text>{data?.progressReports || 0}</Text>
              </HStack>
            </StatNumber>
            <StatHelpText>Actuellement traités</StatHelpText>
          </Stat>
        </CardBody>
      </Card>

      <Card bg={cardBg}>
        <CardBody>
          <Stat>
            <StatLabel color="gray.600">Reports résolus</StatLabel>
            <StatNumber color="green.500">
              <HStack>
                <Icon as={FiCheck} />
                <Text>{data?.resolvedReports || 0}</Text>
              </HStack>
            </StatNumber>
            <StatHelpText>Ce mois-ci</StatHelpText>
          </Stat>
        </CardBody>
      </Card>

      <Card bg={cardBg}>
        <CardBody>
          <Stat>
            <StatLabel color="gray.600">Total reports</StatLabel>
            <StatNumber color="blue.500">
              <HStack>
                <Icon as={FiFlag} />
                <Text>{data?.totalReports || 0}</Text>
              </HStack>
            </StatNumber>
            <StatHelpText>Tous statuts</StatHelpText>
          </Stat>
        </CardBody>
      </Card>
    </SimpleGrid>
  );
};

// Composant pour les RétroReports
const RetroReportCard = ({ report, onUpdate, onComment, onStatusChange }) => {
  const cardBg = useColorModeValue("white", "gray.800");
  const priorityColors = {
    low: 'green',
    medium: 'yellow',
    high: 'orange',
    critical: 'red'
  };
  
  const statusColors = {
    open: 'red',
    in_progress: 'orange',
    resolved: 'green',
    closed: 'gray'
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card bg={cardBg} borderLeft="4px solid" borderLeftColor={`${priorityColors[report.priority]}.500`}>
      <CardHeader pb={3}>
        <Flex justify="space-between" align="start">
          <VStack align="start" spacing={2}>
            <HStack>
              <Badge colorScheme={priorityColors[report.priority]} variant="solid" size="sm">
                {report.priority === 'low' ? '🟢 Faible' :
                 report.priority === 'medium' ? '🟡 Moyen' :
                 report.priority === 'high' ? '🟠 Élevé' : '🔴 Critique'}
              </Badge>
              <Badge colorScheme={statusColors[report.status]} variant="subtle">
                {report.status === 'open' ? 'Ouvert' :
                 report.status === 'in_progress' ? 'En cours' :
                 report.status === 'resolved' ? 'Résolu' : 'Fermé'}
              </Badge>
              <Badge variant="outline">
                {report.type === 'bug' ? '🐛 Bug' :
                 report.type === 'feature' ? '✨ Feature' :
                 report.type === 'performance' ? '⚡ Performance' :
                 report.type === 'security' ? '🔒 Sécurité' : '📋 Autre'}
              </Badge>
            </HStack>
            <Heading size="sm">#{report.id.slice(-8)} - {report.title}</Heading>
            <Text fontSize="xs" color="gray.500">
              Créé par {report.createdBy} le {formatDate(report.createdAt)}
            </Text>
          </VStack>
          <Menu>
            <MenuButton as={IconButton} icon={<FiMoreHorizontal />} variant="ghost" size="sm" />
            <MenuList>
              <MenuItem icon={<FiMessageSquare />} onClick={() => onComment(report)}>
                Commenter
              </MenuItem>
              {report.status === 'open' && (
                <MenuItem icon={<FiActivity />} onClick={() => onStatusChange(report.id, 'in_progress')}>
                  Marquer en cours
                </MenuItem>
              )}
              {report.status === 'in_progress' && (
                <MenuItem icon={<FiCheck />} onClick={() => onStatusChange(report.id, 'resolved')}>
                  Marquer résolu
                </MenuItem>
              )}
              {report.status === 'resolved' && (
                <MenuItem icon={<FiX />} onClick={() => onStatusChange(report.id, 'closed')}>
                  Fermer définitivement
                </MenuItem>
              )}
            </MenuList>
          </Menu>
        </Flex>
      </CardHeader>
      <CardBody pt={0}>
        <VStack align="start" spacing={3}>
          <Text fontSize="sm" color="gray.700">{report.description}</Text>
          
          {report.category && (
            <Tag size="sm" variant="subtle" colorScheme="blue">
              <TagLabel>{report.category}</TagLabel>
            </Tag>
          )}
          
          {report.assignedTo && (
            <HStack>
              <Avatar size="xs" name={report.assignedTo} />
              <Text fontSize="xs">Assigné à {report.assignedTo}</Text>
            </HStack>
          )}
          
          {report.comments && report.comments.length > 0 && (
            <VStack align="start" spacing={2} w="full">
              <Divider />
              <HStack>
                <Icon as={FiMessageSquare} color="gray.500" />
                <Text fontSize="xs" fontWeight="bold" color="gray.600">
                  {report.comments.length} commentaire(s)
                </Text>
              </HStack>
              <Box bg="gray.50" p={3} borderRadius="md" w="full">
                <Text fontSize="sm">{report.comments[report.comments.length - 1].message}</Text>
                <Text fontSize="xs" color="gray.500" mt={2}>
                  Par {report.comments[report.comments.length - 1].author} - 
                  {formatDate(report.comments[report.comments.length - 1].createdAt)}
                </Text>
              </Box>
            </VStack>
          )}
        </VStack>
      </CardBody>
    </Card>
  );
};

// Composant principal
export default function AdminGeneral() {
  const { user } = useUser();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { 
    isOpen: isReportOpen, 
    onOpen: onReportOpen, 
    onClose: onReportClose 
  } = useDisclosure();
  const { 
    isOpen: isCommentOpen, 
    onOpen: onCommentOpen, 
    onClose: onCommentClose 
  } = useDisclosure();
  const { 
    isOpen: isHelpOpen, 
    onOpen: onHelpOpen, 
    onClose: onHelpClose 
  } = useDisclosure();
  
  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retroReports, setRetroReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [reportFormData, setReportFormData] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'medium',
    type: 'bug'
  });
  
  const [commentFormData, setCommentFormData] = useState({
    message: '',
    status: ''
  });

  const cardBg = useColorModeValue("white", "gray.800");
  const gradientBg = useColorModeValue(
    "linear(to-r, red.500, blue.600)",
    "linear(to-r, red.600, blue.700)"
  );

  // Charger les données depuis l'API
  useEffect(() => {
    loadRetroReports();
  }, []);

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  });

  const loadRetroReports = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/admin/retro-reports`, {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        setRetroReports(data.reports || []);
        
        // Calculer les statistiques
        const reports = data.reports || [];
        setAdminData({
          openReports: reports.filter(r => r.status === 'open').length,
          progressReports: reports.filter(r => r.status === 'in_progress').length,
          resolvedReports: reports.filter(r => r.status === 'resolved').length,
          totalReports: reports.length
        });
      } else {
        console.error('Erreur chargement reports:', response.status);
        setRetroReports([]);
        setAdminData({
          openReports: 0,
          progressReports: 0,
          resolvedReports: 0,
          totalReports: 0
        });
      }
    } catch (error) {
      console.error('❌ Erreur chargement RétroReports:', error);
      setRetroReports([]);
      setAdminData({
        openReports: 0,
        progressReports: 0,
        resolvedReports: 0,
        totalReports: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReportSubmit = async () => {
    if (!reportFormData.title || !reportFormData.description) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir le titre et la description",
        status: "error",
        duration: 3000,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('🚀 Création RétroReport avec données:', reportFormData);
      console.log('📡 API URL:', `${API_BASE}/admin/retro-reports`);
      console.log('🔑 Token présent:', !!localStorage.getItem('token'));

      const response = await fetch(`${API_BASE}/admin/retro-reports`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(reportFormData)
      });

      console.log('📊 Response status:', response.status);
      console.log('📊 Response ok:', response.ok);

      if (response.ok) {
        const newReport = await response.json();
        console.log('✅ Report créé:', newReport);
        
        setRetroReports(prev => [newReport, ...prev]);
        
        setReportFormData({
          title: '',
          description: '',
          category: '',
          priority: 'medium',
          type: 'bug'
        });
        
        onReportClose();
        
        toast({
          title: "Succès",
          description: "RétroReport créé avec succès",
          status: "success",
          duration: 3000,
        });

        // Recharger les statistiques
        await loadRetroReports();
      } else {
        const errorText = await response.text();
        console.error('❌ Erreur réponse serveur:', errorText);
        throw new Error(`Erreur ${response.status}: ${errorText}`);
      }
    } catch (error) {
      console.error('❌ Erreur création RétroReport:', error);
      toast({
        title: "Erreur de création",
        description: `Impossible de créer le RétroReport: ${error.message}`,
        status: "error",
        duration: 8000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInitializeRetroReports = async (resetData = false) => {
    setIsInitializing(true);
    try {
      console.log('🔧 Initialisation RétroReports, reset:', resetData);
      console.log('📡 API URL:', `${API_BASE}/admin/retro-reports/setup`);

      const response = await fetch(`${API_BASE}/admin/retro-reports/setup`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ resetData })
      });

      console.log('📊 Setup response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Setup réussi:', result);
        
        toast({
          title: "RétroReports initialisé !",
          description: `${result.message}. Actualisation des données...`,
          status: "success",
          duration: 3000
        });
        
        // Recharger les données
        await loadRetroReports();
      } else {
        const errorText = await response.text();
        console.error('❌ Erreur setup:', errorText);
        throw new Error(`Erreur ${response.status}: ${errorText}`);
      }
    } catch (error) {
      console.error('❌ Erreur initialisation complète:', error);
      toast({
        title: "Erreur d'initialisation",
        description: `${error.message}`,
        status: "error",
        duration: 8000
      });
    } finally {
      setIsInitializing(false);
    }
  };

  const handleCommentSubmit = async () => {
    if (!commentFormData.message) {
      toast({
        title: "Erreur",
        description: "Veuillez écrire un commentaire",
        status: "error",
        duration: 3000,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/admin/retro-reports/${selectedReport.id}/comments`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(commentFormData)
      });

      if (response.ok) {
        setCommentFormData({ message: '', status: '' });
        onCommentClose();
        
        toast({
          title: "Succès",
          description: "Commentaire ajouté avec succès",
          status: "success",
          duration: 3000,
        });

        // Recharger les données
        await loadRetroReports();
      } else {
        throw new Error('Erreur lors de l\'ajout du commentaire');
      }
    } catch (error) {
      console.error('❌ Erreur ajout commentaire:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le commentaire",
        status: "error",
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (reportId, newStatus) => {
    try {
      const response = await fetch(`${API_BASE}/admin/retro-reports/${reportId}/comments`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          message: `Statut changé vers: ${newStatus === 'in_progress' ? 'En cours' : newStatus === 'resolved' ? 'Résolu' : 'Fermé'}`,
          status: newStatus
        })
      });

      if (response.ok) {
        toast({
          title: "Statut mis à jour",
          description: `Report marqué comme ${newStatus === 'in_progress' ? 'en cours' : newStatus === 'resolved' ? 'résolu' : 'fermé'}`,
          status: "success",
          duration: 3000,
        });

        // Recharger les données
        await loadRetroReports();
      } else {
        throw new Error('Erreur lors de la mise à jour du statut');
      }
    } catch (error) {
      console.error('❌ Erreur changement statut:', error);
      toast({
        title: "Erreur",
        description: "Impossible de changer le statut",
        status: "error",
        duration: 5000,
      });
    }
  };

  if (loading) {
    return (
      <Container maxW="container.xl" py={8}>
        <VStack spacing={8}>
          <Spinner size="xl" color="red.500" />
          <Text>Chargement des RétroReports...</Text>
        </VStack>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={8} fontFamily="Montserrat, sans-serif">
      {/* En-tête avec gradient */}
      <Box
        bgGradient={gradientBg}
        color="white"
        p={8}
        borderRadius="xl"
        mb={8}
        textAlign="center"
      >
        <Heading size="xl" mb={4}>
          🎯 RétroReports
        </Heading>
        <Text fontSize="lg" opacity={0.9}>
          Système de tickets • Signalement et suivi des incidents
        </Text>
      </Box>

      {/* Statistiques */}
      <AdminStats data={adminData} loading={false} />

      {/* Section RétroReports */}
      <VStack spacing={6} align="stretch">
        <HStack justify="space-between" align="flex-start">
          <VStack align="start" spacing={1}>
            <Heading size="md" color="red.600">🎫 RétroReports - Système de tickets</Heading>
            <Text fontSize="sm" color="gray.600">
              Signalement et suivi des incidents, bugs et demandes d'amélioration
            </Text>
          </VStack>
          <HStack>
            <Button 
              leftIcon={<FiSettings />} 
              size="sm"
              variant="outline" 
              colorScheme="blue"
              onClick={() => handleInitializeRetroReports(false)}
              isLoading={isInitializing}
              loadingText="Initialisation..."
            >
              Initialiser
            </Button>
            <Button 
              leftIcon={<FiRefreshCw />} 
              size="sm"
              variant="outline" 
              colorScheme="orange"
              onClick={() => handleInitializeRetroReports(true)}
              isLoading={isInitializing}
              loadingText="Réinitialisation..."
            >
              Réinitialiser
            </Button>
            <Button 
              leftIcon={<FiBookOpen />} 
              size="sm"
              variant="ghost" 
              onClick={onHelpOpen}
            >
              Guide
            </Button>
            <Button leftIcon={<FiPlus />} colorScheme="red" onClick={onReportOpen}>
              Nouveau RétroReport
            </Button>
          </HStack>
        </HStack>

        {/* Liste des RétroReports */}
        <VStack spacing={4} align="stretch">
          {retroReports.length === 0 ? (
            <Alert status="info">
              <AlertIcon />
              <VStack align="start" spacing={1}>
                <Text fontWeight="bold" fontSize="sm">
                  Aucun RétroReport
                </Text>
                <Text fontSize="xs">
                  Cliquez sur "Initialiser" pour créer des tickets d'exemple, ou "Nouveau RétroReport" pour créer votre premier ticket.
                </Text>
              </VStack>
            </Alert>
          ) : (
            retroReports.map((report) => (
              <RetroReportCard 
                key={report.id} 
                report={report}
                onUpdate={(report) => {
                  setSelectedReport(report);
                }}
                onComment={(report) => {
                  setSelectedReport(report);
                  onCommentOpen();
                }}
                onStatusChange={handleStatusChange}
              />
            ))
          )}
        </VStack>
      </VStack>

      {/* Modal pour créer un RétroReport */}
      <Modal isOpen={isReportOpen} onClose={onReportClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>🎫 Nouveau RétroReport</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <Alert status="info">
                <AlertIcon />
                <VStack align="start" spacing={1}>
                  <Text fontWeight="bold" fontSize="sm">
                    Système de tickets RétroReports
                  </Text>
                  <Text fontSize="xs">
                    Signalez les incidents, bugs, demandes d'amélioration ou tout problème nécessitant un suivi.
                  </Text>
                </VStack>
              </Alert>

              <FormControl isRequired>
                <FormLabel>Titre du rapport</FormLabel>
                <Input
                  value={reportFormData.title}
                  onChange={(e) => setReportFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Problème de connexion, Page lente..."
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Description détaillée</FormLabel>
                <Textarea
                  value={reportFormData.description}
                  onChange={(e) => setReportFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Décrivez le problème en détail, les étapes pour le reproduire..."
                  rows={4}
                />
              </FormControl>

              <SimpleGrid columns={2} spacing={4} w="full">
                <FormControl>
                  <FormLabel>Type</FormLabel>
                  <Select
                    value={reportFormData.type}
                    onChange={(e) => setReportFormData(prev => ({ ...prev, type: e.target.value }))}
                  >
                    <option value="bug">🐛 Bug</option>
                    <option value="feature">✨ Demande d'amélioration</option>
                    <option value="performance">⚡ Performance</option>
                    <option value="security">🔒 Sécurité</option>
                    <option value="other">📋 Autre</option>
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel>Priorité</FormLabel>
                  <Select
                    value={reportFormData.priority}
                    onChange={(e) => setReportFormData(prev => ({ ...prev, priority: e.target.value }))}
                  >
                    <option value="low">🟢 Faible</option>
                    <option value="medium">🟡 Moyen</option>
                    <option value="high">🟠 Élevé</option>
                    <option value="critical">🔴 Critique</option>
                  </Select>
                </FormControl>
              </SimpleGrid>

              <FormControl>
                <FormLabel>Catégorie</FormLabel>
                <Input
                  value={reportFormData.category}
                  onChange={(e) => setReportFormData(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="Ex: Technique, Interface, Base de données..."
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onReportClose}>
              Annuler
            </Button>
            <Button 
              colorScheme="red" 
              onClick={handleReportSubmit} 
              leftIcon={<FiFlag />}
              isLoading={isSubmitting}
              loadingText="Création..."
            >
              Créer le RétroReport
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal pour commenter un RétroReport */}
      <Modal isOpen={isCommentOpen} onClose={onCommentClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>💬 Commenter le RétroReport #{selectedReport?.id?.slice(-8)}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <Box w="full" p={3} bg="gray.50" borderRadius="md">
                <Text fontWeight="bold" fontSize="sm" mb={1}>
                  {selectedReport?.title}
                </Text>
                <Text fontSize="xs" color="gray.600">
                  {selectedReport?.description}
                </Text>
              </Box>

              <FormControl isRequired>
                <FormLabel>Commentaire</FormLabel>
                <Textarea
                  value={commentFormData.message}
                  onChange={(e) => setCommentFormData(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Ajoutez une mise à jour, une solution ou un commentaire..."
                  rows={4}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Changer le statut (optionnel)</FormLabel>
                <Select
                  value={commentFormData.status}
                  onChange={(e) => setCommentFormData(prev => ({ ...prev, status: e.target.value }))}
                  placeholder="Garder le statut actuel"
                >
                  <option value="open">🔴 Ouvert</option>
                  <option value="in_progress">🟠 En cours</option>
                  <option value="resolved">🟢 Résolu</option>
                  <option value="closed">⚫ Fermé</option>
                </Select>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onCommentClose}>
              Annuler
            </Button>
            <Button 
              colorScheme="blue" 
              onClick={handleCommentSubmit} 
              leftIcon={<FiSend />}
              isLoading={isSubmitting}
              loadingText="Envoi..."
            >
              Ajouter le commentaire
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal d'aide RétroReports */}
      <Modal isOpen={isHelpOpen} onClose={onHelpClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>📋 Guide RétroReports</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Box>
                <Heading size="sm" mb={2}>🚀 Premiers pas</Heading>
                <Text fontSize="sm" color="gray.600" mb={2}>
                  1. Cliquez sur "Initialiser" pour créer des tickets d'exemple
                </Text>
                <Text fontSize="sm" color="gray.600" mb={2}>
                  2. Explorez les différents types de tickets et priorités
                </Text>
                <Text fontSize="sm" color="gray.600">
                  3. Utilisez "Nouveau RétroReport" pour créer vos propres tickets
                </Text>
              </Box>
              
              <Divider />
              
              <Box>
                <Heading size="sm" mb={2}>🎯 Types de tickets</Heading>
                <HStack spacing={2} mb={2}>
                  <Badge colorScheme="red">🐛 Bug</Badge>
                  <Text fontSize="sm">Problèmes et dysfonctionnements</Text>
                </HStack>
                <HStack spacing={2} mb={2}>
                  <Badge colorScheme="blue">✨ Feature</Badge>
                  <Text fontSize="sm">Nouvelles fonctionnalités</Text>
                </HStack>
                <HStack spacing={2} mb={2}>
                  <Badge colorScheme="orange">⚡ Performance</Badge>
                  <Text fontSize="sm">Optimisations et améliorations</Text>
                </HStack>
                <HStack spacing={2} mb={2}>
                  <Badge colorScheme="purple">🔒 Security</Badge>
                  <Text fontSize="sm">Questions de sécurité</Text>
                </HStack>
                <HStack spacing={2}>
                  <Badge colorScheme="gray">📋 Other</Badge>
                  <Text fontSize="sm">Autres demandes</Text>
                </HStack>
              </Box>
              
              <Divider />
              
              <Box>
                <Heading size="sm" mb={2}>⚡ Priorités</Heading>
                <HStack spacing={2} mb={1}>
                  <Badge colorScheme="red" variant="solid">🔴 Critical</Badge>
                  <Text fontSize="sm">Bloquant, intervention immédiate</Text>
                </HStack>
                <HStack spacing={2} mb={1}>
                  <Badge colorScheme="orange" variant="solid">🟠 High</Badge>
                  <Text fontSize="sm">Important, à traiter rapidement</Text>
                </HStack>
                <HStack spacing={2} mb={1}>
                  <Badge colorScheme="yellow" variant="solid">🟡 Medium</Badge>
                  <Text fontSize="sm">Normal, planification standard</Text>
                </HStack>
                <HStack spacing={2}>
                  <Badge colorScheme="green" variant="solid">🟢 Low</Badge>
                  <Text fontSize="sm">Peut attendre, non urgent</Text>
                </HStack>
              </Box>

              <Divider />
              
              <Box>
                <Heading size="sm" mb={2}>📈 Workflow</Heading>
                <VStack spacing={1} align="stretch">
                  <HStack>
                    <Badge colorScheme="red">🔴 Open</Badge>
                    <Text fontSize="sm">Nouveau ticket, en attente de prise en charge</Text>
                  </HStack>
                  <Text fontSize="xs" color="gray.500" ml={6}>↓ Clic sur "Marquer en cours"</Text>
                  <HStack>
                    <Badge colorScheme="orange">🟠 In Progress</Badge>
                    <Text fontSize="sm">En cours de traitement par l'équipe</Text>
                  </HStack>
                  <Text fontSize="xs" color="gray.500" ml={6}>↓ Clic sur "Marquer résolu"</Text>
                  <HStack>
                    <Badge colorScheme="green">🟢 Resolved</Badge>
                    <Text fontSize="sm">Résolu, en attente de validation</Text>
                  </HStack>
                  <Text fontSize="xs" color="gray.500" ml={6}>↓ Clic sur "Fermer définitivement"</Text>
                  <HStack>
                    <Badge colorScheme="gray">⚫ Closed</Badge>
                    <Text fontSize="sm">Terminé et validé</Text>
                  </HStack>
                </VStack>
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" onClick={onHelpClose}>Compris !</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
}