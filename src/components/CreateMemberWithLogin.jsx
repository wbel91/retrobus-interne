import React, { useState, useEffect } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton,
  ModalBody, ModalFooter, Button, FormControl, FormLabel, Input,
  Select, Switch, VStack, HStack, Text, Alert, AlertIcon,
  useToast, Box, Badge, SimpleGrid, Textarea, Checkbox,
  Divider, Card, CardBody, CardHeader, Heading
} from '@chakra-ui/react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const MEMBERSHIP_TYPES = {
  STANDARD: { label: 'Adhésion Standard', description: 'Adhésion classique avec accès aux activités' },
  FAMILY: { label: 'Adhésion Famille', description: 'Adhésion pour une famille (2 adultes + enfants)' },
  STUDENT: { label: 'Adhésion Étudiant', description: 'Tarif réduit pour les étudiants' },
  HONORARY: { label: 'Membre d\'Honneur', description: 'Membre honorifique' },
  BIENFAITEUR: { label: 'Bienfaiteur', description: 'Soutien financier renforcé' }
};

const MEMBER_ROLES = {
  MEMBER: { label: 'Membre', description: 'Membre adhérent standard' },
  DRIVER: { label: 'Conducteur', description: 'Autorisé à conduire les véhicules' },
  SECRETARY: { label: 'Secrétaire Général', description: 'Responsable de la gestion administrative' },
  TREASURER: { label: 'Trésorier', description: 'Responsable des finances' },
  VICE_PRESIDENT: { label: 'Vice-Président', description: 'Adjoint du président' },
  PRESIDENT: { label: 'Président', description: 'Dirigeant de l\'association' },
  ADMIN: { label: 'Administrateur', description: 'Accès administrateur système' }
};

const MEMBERSHIP_STATUS = {
  PENDING: 'En attente',
  ACTIVE: 'Actif',
  EXPIRED: 'Expiré',
  SUSPENDED: 'Suspendu'
};

export default function CreateMemberWithLogin({ isOpen, onClose, onMemberCreated }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    matricule: '',
    membershipType: 'STANDARD',
    membershipStatus: 'ACTIVE',
    role: 'MEMBER',
    hasInternalAccess: true,
    hasExternalAccess: false,
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    birthDate: '',
    paymentAmount: '',
    paymentMethod: 'CASH',
    notes: '',
    newsletter: true
  });
  
  const [existingMembers, setExistingMembers] = useState([]);
  const [suggestedMember, setSuggestedMember] = useState(null);
  const [showLinkSuggestion, setShowLinkSuggestion] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const toast = useToast();

  // Charger les membres existants pour détecter les doublons
  const fetchExistingMembers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/members?limit=1000`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // L'API retourne { members: [...], pagination: {...} }
        setExistingMembers(data.members || []);
      }
    } catch (error) {
      console.error('Erreur chargement membres existants:', error);
      setExistingMembers([]); // Fallback sur tableau vide
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchExistingMembers();
    }
  }, [isOpen]);

  // Détecter les membres similaires
  useEffect(() => {
    if (formData.firstName && formData.lastName && formData.email && Array.isArray(existingMembers)) {
      const similar = existingMembers.find(member => 
        (member.email.toLowerCase() === formData.email.toLowerCase()) ||
        (member.firstName.toLowerCase() === formData.firstName.toLowerCase() && 
         member.lastName.toLowerCase() === formData.lastName.toLowerCase())
      );
      
      if (similar && !similar.matricule) {
        setSuggestedMember(similar);
        setShowLinkSuggestion(true);
      } else {
        setSuggestedMember(null);
        setShowLinkSuggestion(false);
      }
    }
  }, [formData.firstName, formData.lastName, formData.email, existingMembers]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      // Si on rattache un membre existant
      if (suggestedMember && showLinkSuggestion) {
        const response = await fetch(`${API_BASE_URL}/members/${suggestedMember.id}/add-login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            matricule: formData.matricule,
            role: formData.role,
            hasInternalAccess: formData.hasInternalAccess
          })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        
        setResult(data);
        toast({
          status: 'success',
          title: 'Accès créé',
          description: 'Identifiants de connexion ajoutés au membre existant'
        });
      } else {
        // Créer un nouveau membre
        const response = await fetch(`${API_BASE_URL}/members/create-with-login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(formData)
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        setResult(data);
        toast({
          status: 'success',
          title: 'Adhérent créé',
          description: 'Identifiants de connexion générés avec succès'
        });
      }

      if (onMemberCreated) {
        onMemberCreated(result?.member || suggestedMember);
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
      membershipStatus: 'ACTIVE',
      role: 'MEMBER',
      hasInternalAccess: true,
      hasExternalAccess: false,
      phone: '',
      address: '',
      city: '',
      postalCode: '',
      birthDate: '',
      paymentAmount: '',
      paymentMethod: 'CASH',
      notes: '',
      newsletter: true
    });
    setResult(null);
    setSuggestedMember(null);
    setShowLinkSuggestion(false);
    onClose();
  };

  const generateMatricule = () => {
    if (!formData.firstName || !formData.lastName) {
      toast({
        status: 'warning',
        title: 'Information manquante',
        description: 'Veuillez d\'abord saisir le prénom et le nom'
      });
      return;
    }

    const firstName = formData.firstName.trim().toLowerCase();
    const lastName = formData.lastName.trim().toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^a-z]/g, '');

    if (firstName.length === 0 || lastName.length === 0) {
      toast({
        status: 'error',
        title: 'Erreur',
        description: 'Prénom et nom invalides'
      });
      return;
    }

    const matricule = `${firstName.charAt(0)}.${lastName}`;
    setFormData(prev => ({ ...prev, matricule }));
  };

  // Auto-générer le matricule quand prénom et nom changent
  React.useEffect(() => {
    if (formData.firstName && formData.lastName && !formData.matricule) {
      generateMatricule();
    }
  }, [formData.firstName, formData.lastName]);

  const linkExistingMember = () => {
    if (suggestedMember) {
      setFormData(prev => ({
        ...prev,
        firstName: suggestedMember.firstName,
        lastName: suggestedMember.lastName,
        email: suggestedMember.email,
        phone: suggestedMember.phone || '',
        address: suggestedMember.address || '',
        city: suggestedMember.city || '',
        postalCode: suggestedMember.postalCode || '',
        birthDate: suggestedMember.birthDate || '',
        membershipType: suggestedMember.membershipType,
        membershipStatus: suggestedMember.membershipStatus
      }));
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent maxH="90vh">
        <ModalHeader>
          {suggestedMember && showLinkSuggestion ? 'Rattacher un membre existant' : 'Créer un adhérent avec identifiants'}
        </ModalHeader>
        <ModalCloseButton />
        
        <ModalBody>
          {result ? (
            <VStack spacing={4} align="stretch">
              <Alert status="success">
                <AlertIcon />
                {suggestedMember ? 'Accès créé avec succès !' : 'Adhérent créé avec succès !'}
              </Alert>
              
              <Box p={4} bg="gray.50" borderRadius="md">
                <Text fontWeight="bold" mb={3}>Informations de connexion :</Text>
                <SimpleGrid columns={2} spacing={3}>
                  <Box>
                    <Text fontSize="sm" color="gray.600">Matricule :</Text>
                    <Badge colorScheme="blue" fontSize="md">{result.member?.matricule || formData.matricule}</Badge>
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
            <VStack spacing={6}>
              {/* Suggestion de rattachement */}
              {showLinkSuggestion && suggestedMember && (
                <Alert status="info">
                  <AlertIcon />
                  <Box>
                    <Text fontWeight="bold">Membre existant détecté !</Text>
                    <Text fontSize="sm">
                      Un membre avec le même nom/email existe déjà : {suggestedMember.firstName} {suggestedMember.lastName} ({suggestedMember.email})
                    </Text>
                    <Button size="sm" mt={2} onClick={linkExistingMember}>
                      Rattacher cet adhérent
                    </Button>
                  </Box>
                </Alert>
              )}

              <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                <VStack spacing={4}>
                  {/* Informations personnelles */}
                  <Card w="full">
                    <CardHeader>
                      <Heading size="sm">Informations personnelles</Heading>
                    </CardHeader>
                    <CardBody>
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

                        <FormControl>
                          <FormLabel>Adresse</FormLabel>
                          <Input
                            value={formData.address}
                            onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                          />
                        </FormControl>

                        <SimpleGrid columns={2} spacing={4} width="100%">
                          <FormControl>
                            <FormLabel>Ville</FormLabel>
                            <Input
                              value={formData.city}
                              onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                            />
                          </FormControl>
                          <FormControl>
                            <FormLabel>Code postal</FormLabel>
                            <Input
                              value={formData.postalCode}
                              onChange={(e) => setFormData(prev => ({ ...prev, postalCode: e.target.value }))}
                            />
                          </FormControl>
                        </SimpleGrid>
                      </VStack>
                    </CardBody>
                  </Card>

                  {/* Adhésion */}
                  <Card w="full">
                    <CardHeader>
                      <Heading size="sm">Adhésion</Heading>
                    </CardHeader>
                    <CardBody>
                      <VStack spacing={4}>
                        <SimpleGrid columns={2} spacing={4} width="100%">
                          <FormControl>
                            <FormLabel>Type d'adhésion</FormLabel>
                            <Select
                              value={formData.membershipType}
                              onChange={(e) => setFormData(prev => ({ ...prev, membershipType: e.target.value }))}
                            >
                              {Object.entries(MEMBERSHIP_TYPES).map(([key, type]) => (
                                <option key={key} value={key}>
                                  {type.label}
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
                              {Object.entries(MEMBERSHIP_STATUS).map(([key, label]) => (
                                <option key={key} value={key}>
                                  {label}
                                </option>
                              ))}
                            </Select>
                          </FormControl>
                        </SimpleGrid>

                        <FormControl>
                          <FormLabel>Rôle dans l'association</FormLabel>
                          <Select
                            value={formData.role}
                            onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                          >
                            {Object.entries(MEMBER_ROLES).map(([key, role]) => (
                              <option key={key} value={key}>
                                {role.label} - {role.description}
                              </option>
                            ))}
                          </Select>
                        </FormControl>

                        <SimpleGrid columns={2} spacing={4} width="100%">
                          <FormControl>
                            <FormLabel>Montant cotisation (€)</FormLabel>
                            <Input
                              type="number"
                              step="0.01"
                              value={formData.paymentAmount}
                              onChange={(e) => setFormData(prev => ({ ...prev, paymentAmount: e.target.value }))}
                            />
                          </FormControl>
                          <FormControl>
                            <FormLabel>Mode de paiement</FormLabel>
                            <Select
                              value={formData.paymentMethod}
                              onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                            >
                              <option value="CASH">Espèces</option>
                              <option value="CHECK">Chèque</option>
                              <option value="BANK_TRANSFER">Virement</option>
                              <option value="CARD">Carte bancaire</option>
                              <option value="PAYPAL">PayPal</option>
                              <option value="HELLOASSO">HelloAsso</option>
                            </Select>
                          </FormControl>
                        </SimpleGrid>
                      </VStack>
                    </CardBody>
                  </Card>

                  {/* Accès et connexion */}
                  <Card w="full">
                    <CardHeader>
                      <Heading size="sm">Accès et connexion</Heading>
                    </CardHeader>
                    <CardBody>
                      <VStack spacing={4}>
                        <FormControl isRequired>
                          <FormLabel>Matricule de connexion</FormLabel>
                          <HStack>
                            <Input
                              placeholder="j.dupont"
                              value={formData.matricule}
                              onChange={(e) => setFormData(prev => ({ ...prev, matricule: e.target.value }))}
                            />
                            <Button size="md" onClick={generateMatricule} colorScheme="gray">
                              Générer
                            </Button>
                          </HStack>
                          <Text fontSize="xs" color="gray.500">
                            Format : première lettre du prénom + point + nom de famille
                          </Text>
                        </FormControl>

                        <SimpleGrid columns={1} spacing={4} width="100%">
                          <HStack justify="space-between">
                            <FormLabel mb={0}>Accès intranet</FormLabel>
                            <Switch
                              isChecked={formData.hasInternalAccess}
                              onChange={(e) => setFormData(prev => ({ ...prev, hasInternalAccess: e.target.checked }))}
                            />
                          </HStack>
                          <HStack justify="space-between">
                            <FormLabel mb={0}>Accès site externe</FormLabel>
                            <Switch
                              isChecked={formData.hasExternalAccess}
                              onChange={(e) => setFormData(prev => ({ ...prev, hasExternalAccess: e.target.checked }))}
                            />
                          </HStack>
                          <HStack justify="space-between">
                            <FormLabel mb={0}>Newsletter</FormLabel>
                            <Switch
                              isChecked={formData.newsletter}
                              onChange={(e) => setFormData(prev => ({ ...prev, newsletter: e.target.checked }))}
                            />
                          </HStack>
                        </SimpleGrid>
                      </VStack>
                    </CardBody>
                  </Card>

                  {/* Notes */}
                  <FormControl>
                    <FormLabel>Notes</FormLabel>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Notes internes sur l'adhérent..."
                    />
                  </FormControl>
                </VStack>
              </form>
            </VStack>
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
                {suggestedMember && showLinkSuggestion ? 'Rattacher l\'adhérent' : 'Créer l\'adhérent'}
              </Button>
            </HStack>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}