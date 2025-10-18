import React, { useState, useEffect } from "react";
import {
  Box, Card, CardBody, Heading, Text, Button, VStack, HStack, 
  Badge, useToast, Modal, ModalOverlay, ModalContent, ModalHeader, 
  ModalBody, ModalFooter, ModalCloseButton, useDisclosure, FormControl, 
  FormLabel, Textarea, Flex, Icon, SimpleGrid, Alert, AlertIcon, 
  Container, Stat, StatLabel, StatNumber, StatHelpText, IconButton, 
  Menu, MenuButton, MenuList, MenuItem, useColorModeValue, Spinner, 
  Divider, Avatar, Tag, TagLabel, Input, Select
} from "@chakra-ui/react";
import {
  FiSettings, FiRefreshCw, FiPlus, FiBell, FiBookOpen, FiAlertTriangle,
  FiMessageSquare, FiFlag, FiActivity, FiSend, FiMoreHorizontal,
  FiCheck, FiX
} from "react-icons/fi";
import { useUser } from '../context/UserContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Composant pour les statistiques
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
            <StatHelpText>En attente</StatHelpText>
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
            <StatHelpText>En traitement</StatHelpText>
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
            <StatHelpText>Ce mois</StatHelpText>
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

// Composant pour les cards RétroReports
const RetroReportCard = ({ report, onComment, onStatusChange }) => {
  const cardBg = useColorModeValue("white", "gray.800");
  const priorityColors = { low: 'green', medium: 'yellow', high: 'orange', critical: 'red' };
  const statusColors = { open: 'red', in_progress: 'orange', resolved: 'green', closed: 'gray' };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <Card bg={cardBg} borderLeft="4px solid" borderLeftColor={`${priorityColors[report.priority]}.500`}>
      <CardBody>
        <Flex justify="space-between" align="start" mb={3}>
          <VStack align="start" spacing={2}>
            <HStack>
              <Badge colorScheme={priorityColors[report.priority]} variant="solid" size="sm">
                {report.priority === 'low' ? 'Faible' :
                 report.priority === 'medium' ? 'Moyen' :
                 report.priority === 'high' ? 'Élevé' : 'Critique'}
              </Badge>
              <Badge colorScheme={statusColors[report.status]} variant="subtle">
                {report.status === 'open' ? 'Ouvert' :
                 report.status === 'in_progress' ? 'En cours' :
                 report.status === 'resolved' ? 'Résolu' : 'Fermé'}
              </Badge>
            </HStack>
            <Heading size="sm">#{report.id.slice(-8)} - {report.title}</Heading>
            <Text fontSize="xs" color="gray.500">
              Par {report.createdBy} le {formatDate(report.createdAt)}
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
            </MenuList>
          </Menu>
        </Flex>
        
        <Text fontSize="sm" color="gray.700" mb={3}>{report.description}</Text>
        
        {report.category && (
          <Tag size="sm" variant="subtle" colorScheme="blue" mb={3}>
            <TagLabel>{report.category}</TagLabel>
          </Tag>
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
          </VStack>
        )}
      </CardBody>
    </Card>
  );
};

// Composant principal
export default function AdminGeneral() {
  const { user } = useUser();
  const toast = useToast();
  
  const { isOpen: isReportOpen, onOpen: onReportOpen, onClose: onReportClose } = useDisclosure();
  const { isOpen: isCommentOpen, onOpen: onCommentOpen, onClose: onCommentClose } = useDisclosure();
  
  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retroReports, setRetroReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [reportFormData, setReportFormData] = useState({
    title: '', description: '', category: '', priority: 'medium', type: 'bug'
  });
  
  const [commentFormData, setCommentFormData] = useState({
    message: '', status: ''
  });

  const cardBg = useColorModeValue("white", "gray.800");
  const gradientBg = useColorModeValue(
    "linear(to-r, red.500, blue.600)",
    "linear(to-r, red.600, blue.700)"
  );

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
      console.log('📡 Chargement reports depuis:', `${API_BASE}/admin/retro-reports`);
      
      const response = await fetch(`${API_BASE}/admin/retro-reports`, {
        headers: getAuthHeaders()
      });
      
      console.log('📊 Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        setRetroReports(data.reports || []);
        
        const reports = data.reports || [];
        setAdminData({
          openReports: reports.filter(r => r.status === 'open').length,
          progressReports: reports.filter(r => r.status === 'in_progress').length,
          resolvedReports: reports.filter(r => r.status === 'resolved').length,
          totalReports: reports.length
        });
      } else {
        console.error('Erreur chargement reports:', response.status);
        const errorText = await response.text();
        console.error('Détails erreur:', errorText);
        
        toast({
          title: "Erreur de chargement",
          description: `Impossible de charger les reports (${response.status})`,
          status: "error",
          duration: 5000
        });
        
        setRetroReports([]);
        setAdminData({
          openReports: 0, progressReports: 0, resolvedReports: 0, totalReports: 0
        });
      }
    } catch (error) {
      console.error('❌ Erreur chargement RétroReports:', error);
      toast({
        title: "Erreur de connexion",
        description: `Impossible de se connecter au serveur: ${error.message}`,
        status: "error",
        duration: 8000
      });
      setRetroReports([]);
      setAdminData({
        openReports: 0, progressReports: 0, resolvedReports: 0, totalReports: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    try {
      toast({
        title: "Test de connexion",
        description: "Vérification du serveur...",
        status: "info",
        duration: 2000
      });

      console.log('🔍 Test connexion vers:', API_BASE);
      console.log('🔑 Token présent:', !!localStorage.getItem('token'));

      // Test simple du serveur
      const response = await fetch(`${API_BASE}/health`, {
        method: 'GET'
      });

      if (response.ok) {
        toast({
          title: "✅ Serveur accessible",
          description: `Connexion OK vers ${API_BASE}`,
          status: "success",
          duration: 3000
        });
      } else {
        toast({
          title: "⚠️ Serveur répond avec erreur",
          description: `Status: ${response.status}`,
          status: "warning",
          duration: 5000
        });
      }
    } catch (error) {
      console.error('❌ Erreur test connexion:', error);
      toast({
        title: "❌ Serveur inaccessible",
        description: `Erreur: ${error.message}. Serveur démarré ?`,
        status: "error",
        duration: 8000
      });
    }
  };

  const handleReportSubmit = async () => {
    if (!reportFormData.title || !reportFormData.description) {
      toast({
        title: "Erreur",
        description: "Titre et description requis",
        status: "error",
        duration: 3000,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('🚀 Création report:', reportFormData);
      
      const response = await fetch(`${API_BASE}/admin/retro-reports`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(reportFormData)
      });

      if (response.ok) {
        const newReport = await response.json();
        console.log('✅ Report créé:', newReport);
        
        toast({
          title: "Succès",
          description: "RétroReport créé",
          status: "success",
          duration: 3000,
        });

        setReportFormData({
          title: '', description: '', category: '', priority: 'medium', type: 'bug'
        });
        onReportClose();
        await loadRetroReports();
      } else {
        const errorText = await response.text();
        console.error('❌ Erreur création:', errorText);
        throw new Error(`Erreur ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Erreur complète:', error);
      toast({
        title: "Erreur de création",
        description: `Impossible de créer: ${error.message}`,
        status: "error",
        duration: 8000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCommentSubmit = async () => {
    if (!commentFormData.message) {
      toast({
        title: "Erreur",
        description: "Message requis",
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
        toast({
          title: "Succès",
          description: "Commentaire ajouté",
          status: "success",
          duration: 3000,
        });

        setCommentFormData({ message: '', status: '' });
        onCommentClose();
        await loadRetroReports();
      } else {
        throw new Error(`Erreur ${response.status}`);
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: `Impossible d'ajouter le commentaire: ${error.message}`,
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
          message: `Statut changé: ${newStatus}`,
          status: newStatus
        })
      });

      if (response.ok) {
        toast({
          title: "Statut mis à jour",
          description: `Report ${newStatus}`,
          status: "success",
          duration: 3000,
        });
        await loadRetroReports();
      }
    } catch (error) {
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
      <Box bgGradient={gradientBg} color="white" p={8} borderRadius="xl" mb={8} textAlign="center">
        <Heading size="xl" mb={4}>🎯 RétroReports</Heading>
        <Text fontSize="lg" opacity={0.9}>Système de tickets et suivi des incidents</Text>
      </Box>

      <AdminStats data={adminData} loading={false} />

      <VStack spacing={6} align="stretch">
        <HStack justify="space-between" align="flex-start">
          <VStack align="start" spacing={1}>
            <Heading size="md" color="red.600">🎫 Système de tickets</Heading>
            <Text fontSize="sm" color="gray.600">
              Signalement et suivi des incidents
            </Text>
          </VStack>
          <HStack>
            <Button 
              leftIcon={<FiActivity />} 
              size="sm" variant="outline" colorScheme="green"
              onClick={testConnection}
            >
              Test Serveur
            </Button>
            <Button leftIcon={<FiPlus />} colorScheme="red" onClick={onReportOpen}>
              Nouveau Report
            </Button>
          </HStack>
        </HStack>

        <VStack spacing={4} align="stretch">
          {retroReports.length === 0 ? (
            <Alert status="info">
              <AlertIcon />
              <VStack align="start" spacing={1}>
                <Text fontWeight="bold" fontSize="sm">Aucun RétroReport</Text>
                <Text fontSize="xs">
                  Créez votre premier ticket ou vérifiez la connexion serveur.
                </Text>
              </VStack>
            </Alert>
          ) : (
            retroReports.map((report) => (
              <RetroReportCard 
                key={report.id} 
                report={report}
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

      {/* Modal création report */}
      <Modal isOpen={isReportOpen} onClose={onReportClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>🎫 Nouveau RétroReport</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Titre</FormLabel>
                <Input
                  value={reportFormData.title}
                  onChange={(e) => setReportFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Titre du problème"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Description</FormLabel>
                <Textarea
                  value={reportFormData.description}
                  onChange={(e) => setReportFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Description détaillée"
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
                    <option value="bug">Bug</option>
                    <option value="feature">Amélioration</option>
                    <option value="performance">Performance</option>
                    <option value="security">Sécurité</option>
                    <option value="other">Autre</option>
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel>Priorité</FormLabel>
                  <Select
                    value={reportFormData.priority}
                    onChange={(e) => setReportFormData(prev => ({ ...prev, priority: e.target.value }))}
                  >
                    <option value="low">Faible</option>
                    <option value="medium">Moyen</option>
                    <option value="high">Élevé</option>
                    <option value="critical">Critique</option>
                  </Select>
                </FormControl>
              </SimpleGrid>

              <FormControl>
                <FormLabel>Catégorie</FormLabel>
                <Input
                  value={reportFormData.category}
                  onChange={(e) => setReportFormData(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="Ex: Interface, Base de données..."
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onReportClose}>Annuler</Button>
            <Button 
              colorScheme="red" onClick={handleReportSubmit} leftIcon={<FiFlag />}
              isLoading={isSubmitting} loadingText="Création..."
            >
              Créer
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal commentaire */}
      <Modal isOpen={isCommentOpen} onClose={onCommentClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>💬 Commentaire</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Message</FormLabel>
                <Textarea
                  value={commentFormData.message}
                  onChange={(e) => setCommentFormData(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Votre commentaire..."
                  rows={4}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Nouveau statut</FormLabel>
                <Select
                  value={commentFormData.status}
                  onChange={(e) => setCommentFormData(prev => ({ ...prev, status: e.target.value }))}
                  placeholder="Garder le statut actuel"
                >
                  <option value="open">Ouvert</option>
                  <option value="in_progress">En cours</option>
                  <option value="resolved">Résolu</option>
                  <option value="closed">Fermé</option>
                </Select>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onCommentClose}>Annuler</Button>
            <Button 
              colorScheme="blue" onClick={handleCommentSubmit} leftIcon={<FiSend />}
              isLoading={isSubmitting} loadingText="Envoi..."
            >
              Ajouter
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
}