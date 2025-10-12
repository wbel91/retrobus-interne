import React, { useState } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton,
  ModalBody, ModalFooter, Button, FormControl, FormLabel, Input,
  Select, Switch, VStack, HStack, Text, Alert, AlertIcon,
  useToast, Box, Badge, SimpleGrid
} from '@chakra-ui/react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function CreateMemberWithLogin({ isOpen, onClose, onMemberCreated }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    matricule: '',
    membershipType: 'STANDARD',
    role: 'MEMBER',
    hasInternalAccess: true,
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    birthDate: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/members/create-with-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur de création');
      }

      setResult(data);
      toast({
        status: 'success',
        title: 'Adhérent créé',
        description: 'Identifiants de connexion générés avec succès'
      });

      if (onMemberCreated) {
        onMemberCreated(data.member);
      }

    } catch (error) {
      toast({
        status: 'error',
        title: 'Erreur',
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      matricule: '',
      membershipType: 'STANDARD',
      role: 'MEMBER',
      hasInternalAccess: true,
      phone: '',
      address: '',
      city: '',
      postalCode: '',
      birthDate: ''
    });
    setResult(null);
    onClose();
  };

  const generateMatricule = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 999) + 1;
    const matricule = `${year}-${random.toString().padStart(3, '0')}`;
    setFormData(prev => ({ ...prev, matricule }));
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Créer un adhérent avec identifiants</ModalHeader>
        <ModalCloseButton />
        
        <ModalBody>
          {result ? (
            <VStack spacing={4} align="stretch">
              <Alert status="success">
                <AlertIcon />
                Adhérent créé avec succès !
              </Alert>
              
              <Box p={4} bg="gray.50" borderRadius="md">
                <Text fontWeight="bold" mb={3}>Informations de connexion :</Text>
                <SimpleGrid columns={2} spacing={3}>
                  <Box>
                    <Text fontSize="sm" color="gray.600">Matricule :</Text>
                    <Badge colorScheme="blue" fontSize="md">{result.member.matricule}</Badge>
                  </Box>
                  <Box>
                    <Text fontSize="sm" color="gray.600">Mot de passe temporaire :</Text>
                    <Badge colorScheme="red" fontSize="md">{result.temporaryPassword}</Badge>
                  </Box>
                </SimpleGrid>
                <Alert status="warning" mt={3}>
                  <AlertIcon />
                  <Text fontSize="sm">
                    Communiquez ces identifiants de manière sécurisée. 
                    L'utilisateur devra changer le mot de passe à la première connexion.
                  </Text>
                </Alert>
              </Box>
            </VStack>
          ) : (
            <form onSubmit={handleSubmit}>
              <VStack spacing={4}>
                <SimpleGrid columns={2} spacing={4} width="100%">
                  <FormControl isRequired>
                    <FormLabel>Prénom</FormLabel>
                    <Input
                      value={formData.firstName}
                      onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    />
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel>Nom</FormLabel>
                    <Input
                      value={formData.lastName}
                      onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    />
                  </FormControl>
                </SimpleGrid>

                <FormControl isRequired>
                  <FormLabel>Email</FormLabel>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Matricule de connexion</FormLabel>
                  <HStack>
                    <Input
                      placeholder="2025-001"
                      value={formData.matricule}
                      onChange={(e) => setFormData(prev => ({ ...prev, matricule: e.target.value }))}
                    />
                    <Button size="md" onClick={generateMatricule} colorScheme="gray">
                      Générer
                    </Button>
                  </HStack>
                  <Text fontSize="xs" color="gray.500">
                    Format : YYYY-XXX (ex: 2025-001)
                  </Text>
                </FormControl>

                <SimpleGrid columns={2} spacing={4} width="100%">
                  <FormControl>
                    <FormLabel>Type d'adhésion</FormLabel>
                    <Select
                      value={formData.membershipType}
                      onChange={(e) => setFormData(prev => ({ ...prev, membershipType: e.target.value }))}
                    >
                      <option value="STANDARD">Standard</option>
                      <option value="FAMILY">Famille</option>
                      <option value="STUDENT">Étudiant</option>
                      <option value="HONORARY">Honoraire</option>
                    </Select>
                  </FormControl>
                  <FormControl>
                    <FormLabel>Rôle</FormLabel>
                    <Select
                      value={formData.role}
                      onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                    >
                      <option value="MEMBER">Membre</option>
                      <option value="DRIVER">Conducteur</option>
                      <option value="ADMIN">Administrateur</option>
                    </Select>
                  </FormControl>
                </SimpleGrid>

                <FormControl>
                  <HStack>
                    <FormLabel mb={0}>Accès intranet</FormLabel>
                    <Switch
                      isChecked={formData.hasInternalAccess}
                      onChange={(e) => setFormData(prev => ({ ...prev, hasInternalAccess: e.target.checked }))}
                    />
                  </HStack>
                  <Text fontSize="xs" color="gray.500">
                    Active automatiquement la connexion avec matricule
                  </Text>
                </FormControl>

                <SimpleGrid columns={2} spacing={4} width="100%">
                  <FormControl>
                    <FormLabel>Téléphone</FormLabel>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
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
                </SimpleGrid>
              </VStack>
            </form>
          )}
        </ModalBody>

        <ModalFooter>
          {result ? (
            <Button colorScheme="blue" onClick={handleClose}>
              Fermer
            </Button>
          ) : (
            <HStack>
              <Button variant="ghost" onClick={handleClose}>
                Annuler
              </Button>
              <Button
                colorScheme="blue"
                isLoading={loading}
                onClick={handleSubmit}
              >
                Créer l'adhérent
              </Button>
            </HStack>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}