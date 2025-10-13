import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Input,
  Textarea,
  FormControl,
  FormLabel,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Badge,
  IconButton,
  Flex,
  Spacer,
  Alert,
  AlertIcon,
  Spinner,
  Center
} from '@chakra-ui/react';
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa';
import { apiClient } from '../api/config';

export default function SiteManagement() {
  const [changelogs, setChangelogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChangelog, setSelectedChangelog] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    version: '',
    date: '',
    changes: ['']
  });
  
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  // Charger les changelogs avec gestion d'erreur améliorée
  const fetchChangelogs = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/changelog');
      
      // Vérifier que response.data existe et est un tableau
      if (response.data && Array.isArray(response.data)) {
        setChangelogs(response.data);
      } else {
        console.warn('Réponse inattendue de l\'API:', response.data);
        setChangelogs([]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des changelogs:', error);
      setChangelogs([]); // S'assurer qu'on a toujours un tableau
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les changelogs',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChangelogs();
  }, []);

  // Réinitialiser le formulaire
  const resetForm = () => {
    setFormData({
      title: '',
      version: '',
      date: new Date().toISOString().split('T')[0],
      changes: ['']
    });
    setSelectedChangelog(null);
  };

  // Ouvrir le modal pour créer
  const handleCreate = () => {
    resetForm();
    onOpen();
  };

  // Ouvrir le modal pour éditer avec validation
  const handleEdit = (changelog) => {
    setSelectedChangelog(changelog);
    
    // S'assurer que changes est toujours un tableau
    let changes = [''];
    if (changelog.changes) {
      if (Array.isArray(changelog.changes)) {
        changes = changelog.changes.length > 0 ? changelog.changes : [''];
      } else if (typeof changelog.changes === 'string') {
        try {
          const parsed = JSON.parse(changelog.changes);
          changes = Array.isArray(parsed) ? parsed : [''];
        } catch (e) {
          console.warn('Impossible de parser changes:', changelog.changes);
          changes = [changelog.changes];
        }
      }
    }
    
    setFormData({
      title: changelog.title || '',
      version: changelog.version || '',
      date: changelog.date ? changelog.date.split('T')[0] : new Date().toISOString().split('T')[0],
      changes
    });
    onOpen();
  };

  // Ajouter une nouvelle ligne de changement
  const addChange = () => {
    setFormData(prev => ({
      ...prev,
      changes: [...prev.changes, '']
    }));
  };

  // Supprimer une ligne de changement
  const removeChange = (index) => {
    if (formData.changes.length > 1) {
      setFormData(prev => ({
        ...prev,
        changes: prev.changes.filter((_, i) => i !== index)
      }));
    }
  };

  // Mettre à jour une ligne de changement
  const updateChange = (index, value) => {
    setFormData(prev => ({
      ...prev,
      changes: prev.changes.map((change, i) => i === index ? value : change)
    }));
  };

  // Sauvegarder le changelog
  const handleSave = async () => {
    try {
      // Validation
      if (!formData.title.trim() || !formData.version.trim()) {
        toast({
          title: 'Erreur de validation',
          description: 'Le titre et la version sont requis',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      const payload = {
        ...formData,
        changes: formData.changes.filter(change => change.trim() !== '')
      };

      if (selectedChangelog) {
        // Mise à jour
        await apiClient.put(`/changelog/${selectedChangelog.id}`, payload);
        toast({
          title: 'Succès',
          description: 'Changelog mis à jour avec succès',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        // Création
        await apiClient.post('/changelog', payload);
        toast({
          title: 'Succès',
          description: 'Changelog créé avec succès',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }

      fetchChangelogs();
      onClose();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder le changelog',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Supprimer un changelog
  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce changelog ?')) {
      return;
    }

    try {
      await apiClient.delete(`/changelog/${id}`);
      toast({
        title: 'Succès',
        description: 'Changelog supprimé avec succès',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      fetchChangelogs();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le changelog',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Fonction pour afficher les changements de manière sécurisée
  const renderChanges = (changes) => {
    if (!changes) return null;
    
    let changesList = [];
    if (Array.isArray(changes)) {
      changesList = changes;
    } else if (typeof changes === 'string') {
      try {
        const parsed = JSON.parse(changes);
        changesList = Array.isArray(parsed) ? parsed : [changes];
      } catch {
        changesList = [changes];
      }
    }
    
    return changesList.map((change, index) => (
      <Text key={index} fontSize="sm">
        • {change}
      </Text>
    ));
  };

  if (loading) {
    return (
      <Center minH="400px">
        <VStack>
          <Spinner size="xl" color="var(--rbe-red)" />
          <Text>Chargement des changelogs...</Text>
        </VStack>
      </Center>
    );
  }

  return (
    <Box p={6}>
      <Flex mb={6} align="center">
        <Heading size="lg">Gestion du Site</Heading>
        <Spacer />
        <Button leftIcon={<FaPlus />} colorScheme="blue" onClick={handleCreate}>
          Nouveau Changelog
        </Button>
      </Flex>

      <VStack spacing={4} align="stretch">
        {changelogs.length === 0 ? (
          <Alert status="info">
            <AlertIcon />
            Aucun changelog trouvé. Créez le premier !
          </Alert>
        ) : (
          changelogs.map((changelog) => (
            <Card key={changelog.id}>
              <CardHeader>
                <Flex align="center">
                  <VStack align="start" spacing={1}>
                    <Heading size="md">{changelog.title}</Heading>
                    <HStack>
                      <Badge colorScheme="blue">v{changelog.version}</Badge>
                      <Text fontSize="sm" color="gray.600">
                        {changelog.date ? new Date(changelog.date).toLocaleDateString('fr-FR') : 'Date inconnue'}
                      </Text>
                    </HStack>
                  </VStack>
                  <Spacer />
                  <HStack>
                    <IconButton
                      icon={<FaEdit />}
                      size="sm"
                      colorScheme="blue"
                      variant="ghost"
                      onClick={() => handleEdit(changelog)}
                      aria-label="Modifier"
                    />
                    <IconButton
                      icon={<FaTrash />}
                      size="sm"
                      colorScheme="red"
                      variant="ghost"
                      onClick={() => handleDelete(changelog.id)}
                      aria-label="Supprimer"
                    />
                  </HStack>
                </Flex>
              </CardHeader>
              <CardBody pt={0}>
                <VStack align="start" spacing={2}>
                  {renderChanges(changelog.changes)}
                </VStack>
              </CardBody>
            </Card>
          ))
        )}
      </VStack>

      {/* Modal pour créer/éditer */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {selectedChangelog ? 'Modifier le changelog' : 'Nouveau changelog'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Titre</FormLabel>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Nouvelle version du site"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Version</FormLabel>
                <Input
                  value={formData.version}
                  onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
                  placeholder="Ex: 2.1.0"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Date</FormLabel>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Changements</FormLabel>
                <VStack spacing={2} align="stretch">
                  {formData.changes.map((change, index) => (
                    <HStack key={index}>
                      <Input
                        value={change}
                        onChange={(e) => updateChange(index, e.target.value)}
                        placeholder="Décrivez le changement..."
                      />
                      {formData.changes.length > 1 && (
                        <IconButton
                          icon={<FaTrash />}
                          size="sm"
                          colorScheme="red"
                          variant="ghost"
                          onClick={() => removeChange(index)}
                          aria-label="Supprimer"
                        />
                      )}
                    </HStack>
                  ))}
                  <Button size="sm" variant="ghost" onClick={addChange}>
                    + Ajouter un changement
                  </Button>
                </VStack>
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Annuler
            </Button>
            <Button colorScheme="blue" onClick={handleSave}>
              {selectedChangelog ? 'Mettre à jour' : 'Créer'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}