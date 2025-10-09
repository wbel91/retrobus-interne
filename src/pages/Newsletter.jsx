import React, { useEffect, useState, useCallback } from "react";
import {
  Box, Heading, HStack, VStack, Button, Table, Thead, Tbody, Tr, Th, Td,
  Input, useToast, IconButton, Text, Flex, Tag, TagLabel, TagCloseButton, 
  Alert, AlertIcon, Spinner, Center, Badge, Stat, StatLabel, StatNumber,
  StatGroup, FormControl, FormLabel, Select, Modal, ModalOverlay, ModalContent,
  ModalHeader, ModalBody, ModalFooter, ModalCloseButton, useDisclosure,
  Textarea, Switch
} from "@chakra-ui/react";
import { FiRefreshCw, FiTrash2, FiMail, FiPlus, FiDownload, FiEdit, FiUsers } from "react-icons/fi";
import { useUser } from '../context/UserContext';
import { newsletterAPI } from '../api/newsletter.js';

export default function Newsletter() {
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newStatus, setNewStatus] = useState("CONFIRMED");
  const [fallback, setFallback] = useState(false);
  const [stats, setStats] = useState({ total: 0, confirmed: 0, pending: 0 });
  const [selectedSubscriber, setSelectedSubscriber] = useState(null);
  const [filterStatus, setFilterStatus] = useState("ALL");
  
  const toast = useToast();
  const { token, isAuthenticated } = useUser();
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();

  const fetchSubscribers = useCallback(async (opts = { manual: false }) => {
    if (!token) {
      return; // on attend le token
    }
    setLoading(true);
    setFallback(false);
    try {
      const data = await newsletterAPI.getAll();
      setSubscribers(Array.isArray(data) ? data : []);
      
      // Calculer les statistiques
      const total = data.length;
      const confirmed = data.filter(s => s.status === 'CONFIRMED').length;
      const pending = data.filter(s => s.status === 'PENDING').length;
      setStats({ total, confirmed, pending });
      
    } catch (e) {
      console.error('[Newsletter] fetch error:', e);
      
      if (e.status === 401) {
        toast({ 
          status: "error", 
          title: "Session expirée", 
          description: "Veuillez vous reconnecter" 
        });
        setSubscribers([]);
        return;
      }
      
      // Mode dégradé uniquement si vraiment échec réseau ou serveur (et pas auth)
      setFallback(true);
      if (!opts.manual) {
        toast({
          status: "warning",
          title: "Mode dégradé",
          description: "Affichage de données de démonstration (échec API)"
        });
      }
      setSubscribers([
        { id: "demo1", email: "demo@example.com", status: "CONFIRMED", createdAt: new Date().toISOString() },
        { id: "demo2", email: "test@rbe.fr", status: "PENDING", createdAt: new Date().toISOString() }
      ]);
      setStats({ total: 2, confirmed: 1, pending: 1 });
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  // Requête quand le token devient disponible
  useEffect(() => {
    if (token) {
      fetchSubscribers();
    }
  }, [token, fetchSubscribers]);

  const handleAdd = async () => {
    if (!newEmail.includes('@')) {
      toast({ status: "error", title: "Email invalide" });
      return;
    }
    if (!token) {
      toast({ status: "error", title: "Authentification requise" });
      return;
    }
    setAdding(true);
    try {
      await newsletterAPI.create({ 
        email: newEmail.trim().toLowerCase(), 
        status: newStatus 
      });
      toast({ status: "success", title: "Abonné ajouté avec succès" });
      setNewEmail("");
      setNewStatus("CONFIRMED");
      fetchSubscribers({ manual: true });
    } catch (e) {
      if (e.status === 401) {
        toast({ status: "error", title: "Session expirée" });
        return;
      }
      if (e.status === 409) {
        toast({ 
          status: "info", 
          title: "Email déjà existant", 
          description: "Cet email est déjà dans la liste" 
        });
        return;
      }
      toast({ status: "error", title: "Erreur lors de l'ajout" });
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id, email) => {
    if (!confirm(`Supprimer l'abonné ${email} ?`)) return;
    if (!token) {
      toast({ status: "error", title: "Authentification requise" });
      return;
    }
    try {
      await newsletterAPI.delete(id);
      toast({ status: "success", title: "Abonné supprimé" });
      setSubscribers(prev => prev.filter(s => s.id !== id));
      setStats(prev => ({
        ...prev,
        total: prev.total - 1,
        confirmed: prev.confirmed - (subscribers.find(s => s.id === id)?.status === 'CONFIRMED' ? 1 : 0),
        pending: prev.pending - (subscribers.find(s => s.id === id)?.status === 'PENDING' ? 1 : 0)
      }));
    } catch (e) {
      if (e.status === 401) {
        toast({ status: "error", title: "Session expirée" });
        return;
      }
      toast({ status: "error", title: "Erreur lors de la suppression" });
    }
  };

  const handleEditStatus = (subscriber) => {
    setSelectedSubscriber(subscriber);
    onEditOpen();
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!selectedSubscriber) return;
    
    try {
      await newsletterAPI.updateStatus(selectedSubscriber.id, newStatus);
      toast({ 
        status: "success", 
        title: "Statut mis à jour",
        description: `${selectedSubscriber.email} → ${newStatus}`
      });
      
      // Mettre à jour localement
      setSubscribers(prev => 
        prev.map(s => 
          s.id === selectedSubscriber.id 
            ? { ...s, status: newStatus }
            : s
        )
      );
      
      onEditClose();
      fetchSubscribers({ manual: true }); // Rafraîchir pour les stats
    } catch (e) {
      toast({ status: "error", title: "Erreur lors de la mise à jour" });
    }
  };

  const handleExport = async () => {
    try {
      toast({ 
        status: "info", 
        title: "Export en cours...", 
        description: "Génération du fichier CSV" 
      });
      
      // Pour l'instant, génération côté client
      const csvData = subscribers.map(s => ({
        Email: s.email,
        Statut: s.status,
        'Date inscription': new Date(s.createdAt).toLocaleDateString('fr-FR')
      }));
      
      const csvContent = [
        Object.keys(csvData[0]).join(';'),
        ...csvData.map(row => Object.values(row).join(';'))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `newsletter-subscribers-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      
      toast({ status: "success", title: "Export terminé" });
    } catch (e) {
      toast({ status: "error", title: "Erreur lors de l'export" });
    }
  };

  // Filtrer les abonnés selon le statut sélectionné
  const filteredSubscribers = filterStatus === "ALL" 
    ? subscribers 
    : subscribers.filter(s => s.status === filterStatus);

  if (!isAuthenticated) {
    return (
      <Center minH="300px">
        <VStack>
          <Text>Veuillez vous connecter pour accéder à la gestion newsletter.</Text>
          <Text fontSize="sm" color="gray.500">
            Cette section nécessite des droits d'administration.
          </Text>
        </VStack>
      </Center>
    );
  }

  return (
    <Box p={6}>
      <VStack spacing={6} align="stretch">
        {/* Header avec titre et actions principales */}
        <HStack justify="space-between">
          <VStack align="start" spacing={1}>
            <Heading size="lg">📧 Gestion Newsletter</Heading>
            <Text fontSize="sm" color="gray.600">
              Gérez les abonnements à la newsletter RétroBus Essonne
            </Text>
          </VStack>
          <HStack>
            <Button
              leftIcon={<FiRefreshCw />}
              size="sm"
              variant="outline"
              onClick={() => fetchSubscribers({ manual: true })}
              isLoading={loading}
            >
              Rafraîchir
            </Button>
            <Button
              leftIcon={<FiDownload />}
              size="sm"
              colorScheme="green"
              variant="outline"
              onClick={handleExport}
              isDisabled={subscribers.length === 0}
            >
              Exporter CSV
            </Button>
            <Button
              leftIcon={<FiMail />}
              size="sm"
              colorScheme="blue"
              isDisabled
              title="Fonction à venir - Intégration avec service de mailing"
            >
              Campagne (bientôt)
            </Button>
          </HStack>
        </HStack>

        {/* Statistiques */}
        <StatGroup>
          <Stat>
            <StatLabel>Total abonnés</StatLabel>
            <StatNumber color="blue.500">{stats.total}</StatNumber>
          </Stat>
          <Stat>
            <StatLabel>Confirmés</StatLabel>
            <StatNumber color="green.500">{stats.confirmed}</StatNumber>
          </Stat>
          <Stat>
            <StatLabel>En attente</StatLabel>
            <StatNumber color="orange.500">{stats.pending}</StatNumber>
          </Stat>
        </StatGroup>

        {fallback && (
          <Alert status="warning">
            <AlertIcon />
            <VStack align="start" spacing={1}>
              <Text fontWeight="bold">Mode dégradé</Text>
              <Text fontSize="sm">
                Données de démonstration affichées (API indisponible)
              </Text>
            </VStack>
          </Alert>
        )}

        {/* Formulaire d'ajout */}
        <Box p={4} borderWidth="1px" borderRadius="lg" bg="gray.50">
          <VStack spacing={4}>
            <Heading size="sm">➕ Ajouter un nouvel abonné</Heading>
            <HStack w="100%" spacing={4}>
              <FormControl flex={2}>
                <FormLabel fontSize="sm">Email</FormLabel>
                <Input
                  placeholder="nouvel.abonne@email.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  bg="white"
                />
              </FormControl>
              <FormControl flex={1}>
                <FormLabel fontSize="sm">Statut</FormLabel>
                <Select 
                  value={newStatus} 
                  onChange={(e) => setNewStatus(e.target.value)}
                  bg="white"
                >
                  <option value="CONFIRMED">Confirmé</option>
                  <option value="PENDING">En attente</option>
                </Select>
              </FormControl>
              <Button
                leftIcon={<FiPlus />}
                colorScheme="green"
                onClick={handleAdd}
                isLoading={adding}
                alignSelf="end"
              >
                Ajouter
              </Button>
            </HStack>
          </VStack>
        </Box>

        {/* Filtres et compteurs */}
        <HStack justify="space-between">
          <HStack>
            <Text fontSize="sm" fontWeight="medium">Filtrer par statut :</Text>
            <Select 
              size="sm" 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              maxW="150px"
            >
              <option value="ALL">Tous</option>
              <option value="CONFIRMED">Confirmés</option>
              <option value="PENDING">En attente</option>
            </Select>
          </HStack>
          
          <Tag size="lg" variant="subtle" colorScheme="purple">
            <TagLabel>
              <FiUsers style={{ marginRight: '4px' }} />
              {filteredSubscribers.length} affiché{filteredSubscribers.length > 1 ? 's' : ''}
            </TagLabel>
            {subscribers.length > 0 && (
              <TagCloseButton
                title="Vider la liste locale (ne supprime pas en base)"
                onClick={() => {
                  if (confirm("Vider la liste locale affichée ? (ne supprime pas en base)")) {
                    setSubscribers([]);
                    setStats({ total: 0, confirmed: 0, pending: 0 });
                  }
                }}
              />
            )}
          </Tag>
        </HStack>

        {/* Table des abonnés */}
        <Box borderWidth="1px" borderRadius="lg" overflowX="auto">
          {loading ? (
            <Center py={10}>
              <VStack>
                <Spinner size="lg" color="blue.500" />
                <Text color="gray.600">Chargement des abonnés...</Text>
              </VStack>
            </Center>
          ) : (
            <Table size="sm">
              <Thead bg="gray.50">
                <Tr>
                  <Th>Email</Th>
                  <Th>Statut</Th>
                  <Th>Date d'inscription</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredSubscribers.map(sub => (
                  <Tr key={sub.id} _hover={{ bg: "gray.50" }}>
                    <Td fontWeight="semibold" maxW="300px" isTruncated>
                      {sub.email}
                    </Td>
                    <Td>
                      <Badge
                        colorScheme={sub.status === 'CONFIRMED' ? 'green' : 'orange'}
                        variant="subtle"
                        fontSize="xs"
                        px={2}
                        py={1}
                        borderRadius="md"
                        cursor="pointer"
                        onClick={() => handleEditStatus(sub)}
                        _hover={{ opacity: 0.8 }}
                        title="Cliquer pour modifier"
                      >
                        {sub.status === 'CONFIRMED' ? '✅ Confirmé' : '⏳ En attente'}
                      </Badge>
                    </Td>
                    <Td fontSize="sm" color="gray.600">
                      {sub.createdAt ? new Date(sub.createdAt).toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      }) : '-'}
                    </Td>
                    <Td>
                      <HStack spacing={1}>
                        <IconButton
                          aria-label="Modifier le statut"
                          icon={<FiEdit />}
                          size="xs"
                          colorScheme="blue"
                          variant="ghost"
                          onClick={() => handleEditStatus(sub)}
                          title="Modifier le statut"
                        />
                        <IconButton
                          aria-label="Supprimer"
                          icon={<FiTrash2 />}
                          size="xs"
                          colorScheme="red"
                          variant="ghost"
                          onClick={() => handleDelete(sub.id, sub.email)}
                          title="Supprimer cet abonné"
                        />
                      </HStack>
                    </Td>
                  </Tr>
                ))}
                {filteredSubscribers.length === 0 && !loading && (
                  <Tr>
                    <Td colSpan={4}>
                      <Center py={8}>
                        <VStack>
                          <Text fontSize="lg">📭</Text>
                          <Text fontSize="sm" color="gray.500">
                            {filterStatus === "ALL" 
                              ? "Aucun abonné pour le moment."
                              : `Aucun abonné avec le statut "${filterStatus}".`
                            }
                          </Text>
                          {filterStatus !== "ALL" && (
                            <Button 
                              size="sm" 
                              variant="link" 
                              onClick={() => setFilterStatus("ALL")}
                            >
                              Voir tous les abonnés
                            </Button>
                          )}
                        </VStack>
                      </Center>
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          )}
        </Box>

        {/* Roadmap */}
        <Box mt={8} p={4} bg="blue.50" borderRadius="lg">
          <VStack align="start" spacing={3}>
            <Heading size="sm" color="blue.700">🚀 Feuille de route</Heading>
            <VStack align="start" spacing={1} fontSize="sm" color="blue.600">
              <Text>✅ Ajout / suppression manuelle d'abonnés</Text>
              <Text>✅ Gestion des statuts (confirmé / en attente)</Text>
              <Text>✅ Export CSV des abonnés</Text>
              <Text>✅ Statistiques en temps réel</Text>
              <Text>⏳ Import CSV en masse</Text>
              <Text>⏳ Double opt-in avec email de confirmation</Text>
              <Text>⏳ Intégration service de mailing (Sendinblue, Mailjet...)</Text>
              <Text>⏳ Templates d'emails personnalisables</Text>
              <Text>⏳ Segmentation avancée des abonnés</Text>
            </VStack>
          </VStack>
        </Box>

        {/* Modal d'édition du statut */}
        <Modal isOpen={isEditOpen} onClose={onEditClose} isCentered>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>
              Modifier le statut de l'abonné
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              {selectedSubscriber && (
                <VStack spacing={4} align="stretch">
                  <Text fontSize="sm" color="gray.600">
                    <strong>Email :</strong> {selectedSubscriber.email}
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    <strong>Statut actuel :</strong> {selectedSubscriber.status}
                  </Text>
                  <FormControl>
                    <FormLabel>Nouveau statut</FormLabel>
                    <Select 
                      defaultValue={selectedSubscriber.status}
                      onChange={(e) => setSelectedSubscriber({
                        ...selectedSubscriber, 
                        newStatus: e.target.value
                      })}
                    >
                      <option value="CONFIRMED">Confirmé</option>
                      <option value="PENDING">En attente</option>
                    </Select>
                  </FormControl>
                </VStack>
              )}
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={onEditClose}>
                Annuler
              </Button>
              <Button 
                colorScheme="blue" 
                onClick={() => handleUpdateStatus(selectedSubscriber?.newStatus || selectedSubscriber?.status)}
              >
                Mettre à jour
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </VStack>
    </Box>
  );
}