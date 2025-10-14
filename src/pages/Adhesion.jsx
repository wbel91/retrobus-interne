import React, { useState, useEffect } from 'react';
import {
  Box, VStack, HStack, Text, Card, CardHeader, CardBody, Badge, 
  Heading, SimpleGrid, Button, Center, Alert, AlertIcon, 
  Divider, Progress, useToast, Modal, ModalOverlay, ModalContent, 
  ModalHeader, ModalBody, ModalFooter, FormControl, FormLabel, 
  Input, useDisclosure, Textarea, Switch, Spinner, Select
} from '@chakra-ui/react';
import { 
  FiUser, FiCreditCard, FiCalendar, FiMail, FiPhone, 
  FiMapPin, FiKey, FiEdit, FiDownload, FiSave, FiX, FiPlus 
} from 'react-icons/fi';
import { useUser } from '../context/UserContext';
import { USERS } from '../api/auth.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const MEMBERSHIP_STATUS_CONFIG = {
  PENDING: { label: 'En attente', color: 'yellow', progress: 25 },
  ACTIVE: { label: 'Actif', color: 'green', progress: 100 },
  EXPIRED: { label: 'Expiré', color: 'red', progress: 0 },
  SUSPENDED: { label: 'Suspendu', color: 'orange', progress: 50 }
};

const MEMBERSHIP_TYPES = {
  STANDARD: 'Adhésion Standard',
  FAMILY: 'Adhésion Famille',
  STUDENT: 'Adhésion Étudiant',
  HONORARY: 'Membre d\'Honneur',
  BIENFAITEUR: 'Bienfaiteur'
};

const PAYMENT_METHODS = {
  CASH: 'Espèces',
  CHECK: 'Chèque',
  BANK_TRANSFER: 'Virement',
  CARD: 'Carte bancaire',
  PAYPAL: 'PayPal',
  HELLOASSO: 'HelloAsso'
};

export default function MyMembership() {
  const { user } = useUser();
  const [memberData, setMemberData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [createMode, setCreateMode] = useState(false);
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const { isOpen: isPasswordModalOpen, onOpen: onPasswordModalOpen, onClose: onPasswordModalClose } = useDisclosure();
  const toast = useToast();

  // Détection du profil admin local
  const detectAdminProfile = () => {
    if (!user?.matricule) return null;
    
    // Chercher dans les comptes admin
    const adminAccount = USERS[user.matricule];
    if (adminAccount) {
      return {
        matricule: user.matricule,
        firstName: adminAccount.prenom,
        lastName: adminAccount.nom,
        role: 'ADMIN',
        membershipType: 'HONORARY',
        membershipStatus: 'ACTIVE',
        hasInternalAccess: true,
        hasExternalAccess: true,
        loginEnabled: true,
        isAdminAccount: true,
        roles: adminAccount.roles
      };
    }
    
    return null;
  };

  useEffect(() => {
    fetchMemberData();
  }, []);

  const fetchMemberData = async () => {
    try {
      setLoading(true);
      
      // D'abord essayer les données locales admin
      const adminProfile = detectAdminProfile();
      if (adminProfile) {
        console.log('🔑 Profil admin détecté:', adminProfile);
        
        // Chercher si un profil adhérent existe pour cet admin
        const savedProfiles = JSON.parse(localStorage.getItem('adminProfiles') || '[]');
        const existingProfile = savedProfiles.find(p => p.adminMatricule === user.matricule);
        
        if (existingProfile) {
          console.log('✅ Profil adhérent local trouvé:', existingProfile);
          setMemberData(existingProfile);
          setEditData(existingProfile);
          setCreateMode(false);
        } else {
          console.log('ℹ️ Pas de profil adhérent, affichage données admin de base');
          setMemberData(adminProfile);
          setEditData(adminProfile);
          setCreateMode(true); // Proposer de créer le profil adhérent
        }
      } else {
        // Essayer l'API pour les membres normaux
        console.log('👤 Tentative chargement profil membre via API');
        
        const response = await fetch(`${API_BASE_URL}/api/members/me`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          const memberInfo = await response.json();
          console.log('✅ Profil membre chargé via API:', memberInfo);
          setMemberData(memberInfo);
          setEditData(memberInfo);
          setCreateMode(false);
        } else if (response.status === 404) {
          console.log('ℹ️ Profil membre non trouvé via API');
          setMemberData(null);
          setCreateMode(true);
        } else {
          throw new Error(`Erreur API: ${response.status}`);
        }
      }
      
    } catch (error) {
      console.error('❌ Erreur chargement:', error);
      
      // Fallback sur les données admin si disponibles
      const adminProfile = detectAdminProfile();
      if (adminProfile) {
        console.log('🔄 Fallback sur profil admin:', adminProfile);
        setMemberData(adminProfile);
        setEditData(adminProfile);
        setCreateMode(true);
      } else {
        toast({
          status: 'error',
          title: 'Erreur',
          description: 'Impossible de charger les données d\'adhésion',
          duration: 5000
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditProfile = () => {
    setEditMode(true);
    setCreateMode(false);
    setEditData({ ...memberData });
  };

  const handleCreateProfile = () => {
    const adminProfile = detectAdminProfile();
    if (adminProfile) {
      setEditData({
        ...adminProfile,
        email: '',
        phone: '',
        address: '',
        city: '',
        postalCode: '',
        birthDate: '',
        paymentAmount: '',
        paymentMethod: 'CASH',
        newsletter: true,
        notes: `Profil adhérent pour l'admin ${adminProfile.matricule}`
      });
      setEditMode(true);
      setCreateMode(true);
    }
  };

  const handleSaveProfile = async () => {
    try {
      if (!editData.firstName || !editData.lastName) {
        throw new Error('Prénom et nom requis');
      }

      if (memberData?.isAdminAccount || createMode) {
        // Sauvegarde locale pour les admins
        console.log('💾 Sauvegarde locale du profil admin');
        
        const profileToSave = {
          ...editData,
          id: memberData?.id || `admin-${Date.now()}`,
          memberNumber: memberData?.memberNumber || `ADM-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`,
          createdAt: memberData?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isLinkedToAdmin: true,
          adminMatricule: user.matricule
        };

        // Sauvegarder localement
        const savedProfiles = JSON.parse(localStorage.getItem('adminProfiles') || '[]');
        const existingIndex = savedProfiles.findIndex(p => p.adminMatricule === user.matricule);
        
        if (existingIndex >= 0) {
          savedProfiles[existingIndex] = profileToSave;
        } else {
          savedProfiles.push(profileToSave);
        }
        
        localStorage.setItem('adminProfiles', JSON.stringify(savedProfiles));
        
        setMemberData(profileToSave);
        setEditMode(false);
        setCreateMode(false);
        
        toast({
          status: 'success',
          title: 'Profil sauvegardé',
          description: 'Profil adhérent sauvegardé localement',
          duration: 3000
        });

      } else {
        // Sauvegarde via API pour les membres normaux
        console.log('📡 Sauvegarde via API');
        
        const response = await fetch(`${API_BASE_URL}/api/members/me`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(editData)
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Erreur de sauvegarde');
        }

        const updatedData = await response.json();
        setMemberData(updatedData);
        setEditMode(false);
        
        toast({
          status: 'success',
          title: 'Profil mis à jour',
          description: 'Vos informations ont été sauvegardées',
          duration: 3000
        });
      }
      
    } catch (error) {
      toast({
        status: 'error',
        title: 'Erreur',
        description: error.message,
        duration: 5000
      });
    }
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setCreateMode(false);
    setEditData({ ...memberData });
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        status: 'error',
        title: 'Erreur',
        description: 'Les mots de passe ne correspondent pas',
        duration: 3000
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        status: 'error',
        title: 'Erreur',
        description: 'Le mot de passe doit faire au moins 6 caractères',
        duration: 3000
      });
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/members/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur de changement de mot de passe');
      }

      toast({
        status: 'success',
        title: 'Mot de passe modifié',
        description: 'Votre mot de passe a été mis à jour avec succès',
        duration: 3000
      });

      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      onPasswordModalClose();
      
    } catch (error) {
      toast({
        status: 'error',
        title: 'Erreur',
        description: error.message,
        duration: 5000
      });
    }
  };

  if (loading) {
    return (
      <Center h="400px">
        <Spinner size="xl" />
      </Center>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE': return 'green';
      case 'PENDING': return 'orange';
      case 'EXPIRED': return 'red';
      case 'SUSPENDED': return 'gray';
      default: return 'gray';
    }
  };

  const statusConfig = MEMBERSHIP_STATUS_CONFIG[memberData?.membershipStatus] || 
    { label: memberData?.membershipStatus || 'Non défini', color: 'gray', progress: 0 };

  return (
    <Box p={6} maxW="4xl" mx="auto">
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <HStack justify="space-between">
          <Heading size="lg" display="flex" alignItems="center">
            <FiUser style={{ marginRight: '8px' }} />
            Mon Adhésion
          </Heading>
          
          {!memberData && !createMode ? (
            <Button leftIcon={<FiPlus />} colorScheme="blue" onClick={handleCreateProfile}>
              Créer mon profil adhérent
            </Button>
          ) : editMode ? (
            <HStack>
              <Button leftIcon={<FiSave />} colorScheme="green" onClick={handleSaveProfile}>
                Sauvegarder
              </Button>
              <Button leftIcon={<FiX />} variant="outline" onClick={handleCancelEdit}>
                Annuler
              </Button>
            </HStack>
          ) : (
            <Button leftIcon={<FiEdit />} onClick={handleEditProfile}>
              Modifier
            </Button>
          )}
        </HStack>

        {/* Message pour création de profil */}
        {createMode && !editMode && (
          <Alert status="info">
            <AlertIcon />
            <Box>
              <Text fontWeight="bold">Profil adhérent non trouvé</Text>
              <Text fontSize="sm">
                Vous pouvez créer votre profil adhérent pour accéder aux informations de cotisation et aux services membres.
              </Text>
              <Button size="sm" mt={2} onClick={handleCreateProfile}>
                Créer mon profil adhérent
              </Button>
            </Box>
          </Alert>
        )}

        {memberData && (
          <>
            {/* Alerte si profil local */}
            {memberData.isAdminAccount && (
              <Alert status="info">
                <AlertIcon />
                <Box>
                  <Text fontWeight="bold">Compte administrateur</Text>
                  <Text fontSize="sm">
                    Vous êtes connecté avec un compte admin. 
                    {memberData.isLinkedToAdmin ? ' Votre profil adhérent est géré localement.' : ' Créez votre profil adhérent pour accéder aux fonctionnalités membre.'}
                  </Text>
                </Box>
              </Alert>
            )}

            {/* Statut d'adhésion */}
            <Card>
              <CardHeader>
                <Heading size="md">Statut de l'Adhésion</Heading>
              </CardHeader>
              <CardBody>
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
                  <Box>
                    <Text fontSize="sm" color="gray.600" mb={2}>Statut actuel</Text>
                    <Badge colorScheme={getStatusColor(memberData.membershipStatus)} fontSize="md" p={2}>
                      {statusConfig.label}
                    </Badge>
                    <Progress 
                      value={statusConfig.progress} 
                      colorScheme={getStatusColor(memberData.membershipStatus)}
                      mt={2}
                      size="sm"
                    />
                  </Box>
                  
                  <Box>
                    <Text fontSize="sm" color="gray.600" mb={2}>Type d'adhésion</Text>
                    <Text fontWeight="bold">
                      {MEMBERSHIP_TYPES[memberData.membershipType] || memberData.membershipType}
                    </Text>
                  </Box>
                  
                  <Box>
                    <Text fontSize="sm" color="gray.600" mb={2}>Matricule</Text>
                    <Text fontWeight="bold" color="blue.600">
                      {memberData.matricule}
                    </Text>
                  </Box>
                </SimpleGrid>
              </CardBody>
            </Card>

            {/* Informations personnelles */}
            <Card>
              <CardHeader>
                <Heading size="md">Informations personnelles</Heading>
              </CardHeader>
              <CardBody>
                <VStack spacing={4} align="stretch">
                  {editMode ? (
                    <>
                      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                        <FormControl isRequired>
                          <FormLabel>Prénom</FormLabel>
                          <Input
                            value={editData.firstName || ''}
                            onChange={(e) => setEditData(prev => ({ ...prev, firstName: e.target.value }))}
                          />
                        </FormControl>
                        <FormControl isRequired>
                          <FormLabel>Nom</FormLabel>
                          <Input
                            value={editData.lastName || ''}
                            onChange={(e) => setEditData(prev => ({ ...prev, lastName: e.target.value }))}
                          />
                        </FormControl>
                        <FormControl>
                          <FormLabel>Email</FormLabel>
                          <Input
                            type="email"
                            value={editData.email || ''}
                            onChange={(e) => setEditData(prev => ({ ...prev, email: e.target.value }))}
                          />
                        </FormControl>
                        <FormControl>
                          <FormLabel>Téléphone</FormLabel>
                          <Input
                            value={editData.phone || ''}
                            onChange={(e) => setEditData(prev => ({ ...prev, phone: e.target.value }))}
                          />
                        </FormControl>
                      </SimpleGrid>

                      <FormControl>
                        <FormLabel>Adresse</FormLabel>
                        <Input
                          value={editData.address || ''}
                          onChange={(e) => setEditData(prev => ({ ...prev, address: e.target.value }))}
                        />
                      </FormControl>

                      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                        <FormControl>
                          <FormLabel>Code postal</FormLabel>
                          <Input
                            value={editData.postalCode || ''}
                            onChange={(e) => setEditData(prev => ({ ...prev, postalCode: e.target.value }))}
                          />
                        </FormControl>
                        <FormControl>
                          <FormLabel>Ville</FormLabel>
                          <Input
                            value={editData.city || ''}
                            onChange={(e) => setEditData(prev => ({ ...prev, city: e.target.value }))}
                          />
                        </FormControl>
                      </SimpleGrid>

                      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                        <FormControl>
                          <FormLabel>Date de naissance</FormLabel>
                          <Input
                            type="date"
                            value={editData.birthDate ? editData.birthDate.split('T')[0] : ''}
                            onChange={(e) => setEditData(prev => ({ ...prev, birthDate: e.target.value }))}
                          />
                        </FormControl>
                        <FormControl>
                          <FormLabel>Type d'adhésion</FormLabel>
                          <Select
                            value={editData.membershipType || 'STANDARD'}
                            onChange={(e) => setEditData(prev => ({ ...prev, membershipType: e.target.value }))}
                          >
                            {Object.entries(MEMBERSHIP_TYPES).map(([key, label]) => (
                              <option key={key} value={key}>{label}</option>
                            ))}
                          </Select>
                        </FormControl>
                      </SimpleGrid>

                      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                        <FormControl>
                          <FormLabel>Montant cotisation (€)</FormLabel>
                          <Input
                            type="number"
                            value={editData.paymentAmount || ''}
                            onChange={(e) => setEditData(prev => ({ ...prev, paymentAmount: e.target.value }))}
                          />
                        </FormControl>
                        <FormControl>
                          <FormLabel>Mode de paiement</FormLabel>
                          <Select
                            value={editData.paymentMethod || 'CASH'}
                            onChange={(e) => setEditData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                          >
                            {Object.entries(PAYMENT_METHODS).map(([key, label]) => (
                              <option key={key} value={key}>{label}</option>
                            ))}
                          </Select>
                        </FormControl>
                      </SimpleGrid>

                      <FormControl display="flex" alignItems="center">
                        <FormLabel htmlFor="newsletter" mb="0">Newsletter</FormLabel>
                        <Switch
                          id="newsletter"
                          isChecked={editData.newsletter}
                          onChange={(e) => setEditData(prev => ({ ...prev, newsletter: e.target.checked }))}
                        />
                      </FormControl>

                      <FormControl>
                        <FormLabel>Notes</FormLabel>
                        <Textarea
                          value={editData.notes || ''}
                          onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
                          placeholder="Notes personnelles..."
                        />
                      </FormControl>
                    </>
                  ) : (
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                      <Box>
                        <HStack mb={4}>
                          <FiUser />
                          <Box>
                            <Text fontSize="sm" color="gray.600">Nom complet</Text>
                            <Text fontWeight="bold">{memberData.firstName} {memberData.lastName}</Text>
                          </Box>
                        </HStack>
                        
                        {memberData.email && (
                          <HStack mb={4}>
                            <FiMail />
                            <Box>
                              <Text fontSize="sm" color="gray.600">Email</Text>
                              <Text fontWeight="bold">{memberData.email}</Text>
                            </Box>
                          </HStack>
                        )}
                        
                        {memberData.phone && (
                          <HStack mb={4}>
                            <FiPhone />
                            <Box>
                              <Text fontSize="sm" color="gray.600">Téléphone</Text>
                              <Text fontWeight="bold">{memberData.phone}</Text>
                            </Box>
                          </HStack>
                        )}
                      </Box>

                      <Box>
                        {(memberData.address || memberData.city) && (
                          <HStack mb={4}>
                            <FiMapPin />
                            <Box>
                              <Text fontSize="sm" color="gray.600">Adresse</Text>
                              <Text fontWeight="bold">
                                {memberData.address && `${memberData.address}, `}
                                {memberData.postalCode} {memberData.city}
                              </Text>
                            </Box>
                          </HStack>
                        )}
                        
                        {memberData.birthDate && (
                          <HStack mb={4}>
                            <FiCalendar />
                            <Box>
                              <Text fontSize="sm" color="gray.600">Date de naissance</Text>
                              <Text fontWeight="bold">
                                {new Date(memberData.birthDate).toLocaleDateString('fr-FR')}
                              </Text>
                            </Box>
                          </HStack>
                        )}

                        {memberData.paymentAmount && (
                          <HStack mb={4}>
                            <FiCreditCard />
                            <Box>
                              <Text fontSize="sm" color="gray.600">Cotisation</Text>
                              <Text fontWeight="bold">
                                {memberData.paymentAmount}€ ({PAYMENT_METHODS[memberData.paymentMethod] || memberData.paymentMethod})
                              </Text>
                            </Box>
                          </HStack>
                        )}
                      </Box>
                    </SimpleGrid>
                  )}
                </VStack>
              </CardBody>
            </Card>

            {/* Actions */}
            {!editMode && (
              <Card>
                <CardHeader>
                  <Heading size="md">Actions</Heading>
                </CardHeader>
                <CardBody>
                  <HStack spacing={4} wrap="wrap">
                    <Button leftIcon={<FiKey />} onClick={onPasswordModalOpen}>
                      Changer le mot de passe
                    </Button>
                    <Button leftIcon={<FiDownload />} variant="outline">
                      Télécharger ma carte d'adhérent
                    </Button>
                  </HStack>
                </CardBody>
              </Card>
            )}

            {/* Notes si présentes */}
            {memberData.notes && !editMode && (
              <Card>
                <CardHeader>
                  <Heading size="md">Notes</Heading>
                </CardHeader>
                <CardBody>
                  <Text>{memberData.notes}</Text>
                </CardBody>
              </Card>
            )}
          </>
        )}
      </VStack>

      {/* Modal de changement de mot de passe */}
      <Modal isOpen={isPasswordModalOpen} onClose={onPasswordModalClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Changer le mot de passe</ModalHeader>
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Mot de passe actuel</FormLabel>
                <Input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData(prev => ({...prev, currentPassword: e.target.value}))}
                />
              </FormControl>
              
              <FormControl>
                <FormLabel>Nouveau mot de passe</FormLabel>
                <Input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({...prev, newPassword: e.target.value}))}
                />
              </FormControl>
              
              <FormControl>
                <FormLabel>Confirmer le nouveau mot de passe</FormLabel>
                <Input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({...prev, confirmPassword: e.target.value}))}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onPasswordModalClose}>
              Annuler
            </Button>
            <Button colorScheme="blue" onClick={handlePasswordChange}>
              Modifier
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
