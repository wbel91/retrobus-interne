import React, { useState, useEffect } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton,
  ModalBody, ModalFooter, Button, FormControl, FormLabel, Input,
  Select, Switch, VStack, HStack, Text, Alert, AlertIcon,
  useToast, Box, Badge, SimpleGrid, Textarea, Checkbox,
  Divider, Card, CardBody, CardHeader, Heading
} from '@chakra-ui/react';
import { USERS } from '../api/auth.js';

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

  // Fonction pour détecter les admins existants
  const detectExistingAdmin = (firstName, lastName, email) => {
    const adminEntries = Object.entries(USERS);
    
    for (const [matricule, admin] of adminEntries) {
      // Correspondance par nom
      if (admin.prenom?.toLowerCase() === firstName.toLowerCase() && 
          admin.nom?.toLowerCase() === lastName.toLowerCase()) {
        return { 
          ...admin, 
          matricule,
          isAdmin: true,
          type: 'admin'
        };
      }
      
      // Correspondance par matricule généré
      const expectedMatricule = `${firstName.toLowerCase().charAt(0)}.${lastName.toLowerCase().replace(/[^a-z]/g, '')}`;
      if (matricule === expectedMatricule) {
        return { 
          ...admin, 
          matricule,
          isAdmin: true,
          type: 'admin'
        };
      }
    }
    return null;
  };

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
        setExistingMembers(data.members || []);
      }
    } catch (error) {
      console.error('Erreur chargement membres existants:', error);
      setExistingMembers([]);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchExistingMembers();
    }
  }, [isOpen]);

  // Rechercher des membres similaires quand les champs changent
  useEffect(() => {
    const searchSimilar = async () => {
      if (formData.firstName && formData.lastName) {
        
        // 1. D'abord chercher dans les admins existants
        const existingAdmin = detectExistingAdmin(formData.firstName, formData.lastName, formData.email);
        
        if (existingAdmin) {
          console.log('🔑 Admin existant détecté:', existingAdmin);
          setSuggestedMember({
            firstName: existingAdmin.prenom,
            lastName: existingAdmin.nom,
            matricule: existingAdmin.matricule,
            isAdmin: true,
            type: 'admin',
            roles: existingAdmin.roles
          });
          setShowLinkSuggestion(true);
          return;
        }

        // 2. Sinon chercher dans les membres de la base de données
        if (formData.email) {
          try {
            const params = new URLSearchParams({
              firstName: formData.firstName,
              lastName: formData.lastName,
              email: formData.email
            });

            const response = await fetch(`${API_BASE_URL}/api/members/search-similar?${params}`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            });

            if (response.ok) {
              const data = await response.json();
              const similar = data.members.find(member => 
                (member.email.toLowerCase() === formData.email.toLowerCase()) ||
                (member.firstName.toLowerCase() === formData.firstName.toLowerCase() && 
                 member.lastName.toLowerCase() === formData.lastName.toLowerCase())
              );

              if (similar && (!similar.loginEnabled || similar.loginEnabled === false)) {
                console.log('✅ Membre sans accès détecté:', similar);
                setSuggestedMember({ ...similar, type: 'member' });
                setShowLinkSuggestion(true);
              } else if (similar && similar.loginEnabled) {
                console.log('⚠️ Membre avec accès déjà activé:', similar);
                setSuggestedMember({ ...similar, type: 'member' });
                setShowLinkSuggestion(false);
              } else {
                setSuggestedMember(null);
                setShowLinkSuggestion(false);
              }
            }
          } catch (error) {
            console.error('❌ Erreur recherche membres:', error);
          }
        }
      } else {
        setSuggestedMember(null);
        setShowLinkSuggestion(false);
      }
    };

    const timer = setTimeout(searchSimilar, 300);
    return () => clearTimeout(timer);
  }, [formData.firstName, formData.lastName, formData.email]);

  // Auto-générer le matricule basé sur prénom.nom
  useEffect(() => {
    if (formData.firstName && formData.lastName && !suggestedMember?.isAdmin) {
      const matricule = `${formData.firstName.toLowerCase().charAt(0)}.${formData.lastName.toLowerCase().replace(/[^a-z]/g, '')}`;
      setFormData(prev => ({ ...prev, matricule }));
    }
  }, [formData.firstName, formData.lastName, suggestedMember]);

  const linkExistingMember = () => {
    if (suggestedMember) {
      if (suggestedMember.isAdmin) {
        setFormData(prev => ({
          ...prev,
          firstName: suggestedMember.firstName,
          lastName: suggestedMember.lastName,
          matricule: suggestedMember.matricule,
          role: 'ADMIN',
          hasInternalAccess: true,
          hasExternalAccess: true,
        }));
        
        setShowLinkSuggestion(false);
        
        toast({
          title: 'Données admin importées',
          description: 'Informations admin pré-remplies. Complétez les détails d\'adhérent.',
          status: 'info',
          duration: 3000
        });
      } else {
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
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      if (suggestedMember && showLinkSuggestion) {
        if (suggestedMember.isAdmin) {
          // Créer un profil adhérent pour un admin existant
          const response = await fetch(`${API_BASE_URL}/api/members/create-admin-profile`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              ...formData,
              adminMatricule: suggestedMember.matricule
            })
          });

          const data = await response.json();
          if (!response.ok) throw new Error(data.error);
          
          setResult(data);
          toast({
            status: 'success',
            title: 'Profil adhérent créé',
            description: `Profil adhérent créé pour l'admin ${suggestedMember.matricule}`
          });
        } else {
          // Rattacher un membre existant
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
            description: 'Identifiants ajoutés au membre existant'
          });
        }
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
          description: 'Nouveau membre créé avec identifiants'
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

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent maxH="90vh">
        <ModalHeader>
          {suggestedMember && showLinkSuggestion ? 
            (suggestedMember.isAdmin ? 'Créer profil adhérent pour admin' : 'Rattacher un membre existant') : 
            'Créer un adhérent avec identifiants'
          }
        </ModalHeader>
        <ModalCloseButton />
        
        <ModalBody>
          {result ? (
            <VStack spacing={4} align="stretch">
              <Alert status="success">
                <AlertIcon />
                {suggestedMember?.isAdmin ? 'Profil adhérent créé pour admin !' : 
                 suggestedMember ? 'Accès créé avec succès !' : 'Adhérent créé avec succès !'}
              </Alert>
              
              <Box p={4} bg="gray.50" borderRadius="md">
                <Text fontWeight="bold" mb={3}>Informations de connexion :</Text>
                <SimpleGrid columns={2} spacing={3}>
                  <Box>
                    <Text fontSize="sm" color="gray.600">Matricule :</Text>
                    <Badge colorScheme="blue" fontSize="md">{result.member?.matricule || formData.matricule}</Badge>
                  </Box>
                  {result.temporaryPassword && (
                    <Box>
                      <Text fontSize="sm" color="gray.600">Mot de passe temporaire :</Text>
                      <Badge colorScheme="red" fontSize="md">{result.temporaryPassword}</Badge>
                    </Box>
                  )}
                </SimpleGrid>
                {result.temporaryPassword && (
                  <Alert status="warning" mt={3}>
                    <AlertIcon />
                    <Text fontSize="sm">
                      Communiquez ces identifiants de manière sécurisée. 
                      L'utilisateur devra changer le mot de passe à la première connexion.
                    </Text>
                  </Alert>
                )}
                {result.isAdminProfile && (
                  <Alert status="info" mt={3}>
                    <AlertIcon />
                    <Text fontSize="sm">
                      Profil adhérent créé pour l'admin. Il peut maintenant accéder à "Mon Adhésion" avec son matricule admin.
                    </Text>
                  </Alert>
                )}
              </Box>
            </VStack>
          ) : (
            <VStack spacing={6}>
              {/* Suggestion de fusion admin */}
              {showLinkSuggestion && suggestedMember?.isAdmin && (
                <Alert status="success">
                  <AlertIcon />
                  <Box>
                    <Text fontWeight="bold">Compte administrateur détecté !</Text>
                    <Text fontSize="sm">
                      Compte admin : {suggestedMember.firstName} {suggestedMember.lastName} ({suggestedMember.matricule})
                    </Text>
                    <Text fontSize="xs" color="green.600">
                      Rôles admin : {suggestedMember.roles?.join(', ')}
                    </Text>
                    <Button size="sm" mt={2} onClick={linkExistingMember}>
                      Créer profil adhérent pour cet admin
                    </Button>
                  </Box>
                </Alert>
              )}

              {/* Suggestion de fusion membre */}
              {showLinkSuggestion && suggestedMember && !suggestedMember.isAdmin && (
                <Alert status="info">
                  <AlertIcon />
                  <Box>
                    <Text fontWeight="bold">Membre existant détecté !</Text>
                    <Text fontSize="sm">
                      Membre : {suggestedMember.firstName} {suggestedMember.lastName} ({suggestedMember.email})
                    </Text>
                    <Button size="sm" mt={2} onClick={linkExistingMember}>
                      Rattacher cet adhérent
                    </Button>
                  </Box>
                </Alert>
              )}

              {/* Avertissement membre avec accès */}
              {suggestedMember && !showLinkSuggestion && !suggestedMember.isAdmin && (
                <Alert status="warning">
                  <AlertIcon />
                  <Box>
                    <Text fontWeight="bold">Membre existant détecté !</Text>
                    <Text fontSize="sm">
                      Un membre avec ces informations existe déjà : {suggestedMember.firstName} {suggestedMember.lastName} ({suggestedMember.email})
                    </Text>
                    <Text fontSize="sm" color="orange.600">
                      Matricule : {suggestedMember.matricule} - Accès déjà activé
                    </Text>
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
                      </VStack>
                    </CardBody>
                  </Card>

                  {/* Adresse */}
                  <Card w="full">
                    <CardHeader>
                      <Heading size="sm">Adresse</Heading>
                    </CardHeader>
                    <CardBody>
                      <VStack spacing={4}>
                        <FormControl>
                          <FormLabel>Adresse</FormLabel>
                          <Input
                            value={formData.address}
                            onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                          />
                        </FormControl>
                        <SimpleGrid columns={2} spacing={4} width="100%">
                          <FormControl>
                            <FormLabel>Code postal</FormLabel>
                            <Input
                              value={formData.postalCode}
                              onChange={(e) => setFormData(prev => ({ ...prev, postalCode: e.target.value }))}
                            />
                          </FormControl>
                          <FormControl>
                            <FormLabel>Ville</FormLabel>
                            <Input
                              value={formData.city}
                              onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
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
                                <option key={key} value={key}>{type.label}</option>
                              ))}
                            </Select>
                          </FormControl>
                          <FormControl>
                            <FormLabel>Statut</FormLabel>
                            <Select
                              value={formData.membershipStatus}
                              onChange={(e) => setFormData(prev => ({ ...prev, membershipStatus: e.target.value }))}
                            >
                              {Object.entries(MEMBERSHIP_STATUS).map(([key, status]) => (
                                <option key={key} value={key}>{status}</option>
                              ))}
                            </Select>
                          </FormControl>
                        </SimpleGrid>

                        <SimpleGrid columns={2} spacing={4} width="100%">
                          <FormControl>
                            <FormLabel>Montant cotisation (€)</FormLabel>
                            <Input
                              type="number"
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
                              <option value="CARD">Carte</option>
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
                          <Input
                            value={formData.matricule}
                            onChange={(e) => setFormData(prev => ({ ...prev, matricule: e.target.value }))}
                            placeholder="w.belaidi"
                            isReadOnly={suggestedMember?.isAdmin}
                          />
                          <Text fontSize="xs" color="gray.500">
                            {suggestedMember?.isAdmin ? 
                              'Matricule admin importé automatiquement' :
                              'Format: première lettre du prénom + point + nom (lettres minuscules)'
                            }
                          </Text>
                        </FormControl>

                        <FormControl>
                          <FormLabel>Rôle</FormLabel>
                          <Select
                            value={formData.role}
                            onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                          >
                            {Object.entries(MEMBER_ROLES).map(([key, role]) => (
                              <option key={key} value={key}>{role.label}</option>
                            ))}
                          </Select>
                        </FormControl>

                        <SimpleGrid columns={2} spacing={4} width="100%">
                          <Box>
                            <Text fontSize="sm" fontWeight="medium" mb={2}>Accès interne</Text>
                            <Switch
                              isChecked={formData.hasInternalAccess}
                              onChange={(e) => setFormData(prev => ({ ...prev, hasInternalAccess: e.target.checked }))}
                            />
                          </Box>
                          <Box>
                            <Text fontSize="sm" fontWeight="medium" mb={2}>Accès externe</Text>
                            <Switch
                              isChecked={formData.hasExternalAccess}
                              onChange={(e) => setFormData(prev => ({ ...prev, hasExternalAccess: e.target.checked }))}
                            />
                          </Box>
                        </SimpleGrid>

                        <Box w="full">
                          <Text fontSize="sm" fontWeight="medium" mb={2}>Newsletter</Text>
                          <Switch
                            isChecked={formData.newsletter}
                            onChange={(e) => setFormData(prev => ({ ...prev, newsletter: e.target.checked }))}
                          />
                        </Box>
                      </VStack>
                    </CardBody>
                  </Card>

                  {/* Notes */}
                  <Card w="full">
                    <CardHeader>
                      <Heading size="sm">Notes</Heading>
                    </CardHeader>
                    <CardBody>
                      <FormControl>
                        <FormLabel>Notes administratives</FormLabel>
                        <Textarea
                          value={formData.notes}
                          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                          placeholder="Notes internes sur l'adhérent..."
                        />
                      </FormControl>
                    </CardBody>
                  </Card>
                </VStack>
              </form>
            </VStack>
          )}
        </ModalBody>

        <ModalFooter>
          {result ? (
            <Button onClick={handleClose}>Fermer</Button>
          ) : (
            <HStack spacing={3}>
              <Button variant="ghost" onClick={handleClose}>
                Annuler
              </Button>
              <Button
                colorScheme="blue"
                onClick={handleSubmit}
                isLoading={loading}
                loadingText={suggestedMember?.isAdmin ? "Création profil..." : 
                            suggestedMember ? "Rattachement..." : "Création..."}
              >
                {suggestedMember?.isAdmin ? 'Créer profil adhérent' :
                 suggestedMember && showLinkSuggestion ? 'Rattacher' : 'Créer l\'adhérent'}
              </Button>
            </HStack>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
