import React, { useState, useEffect } from 'react';
import {
  Box, VStack, HStack, Text, Card, CardHeader, CardBody, Badge, 
  Heading, SimpleGrid, Stat, StatLabel, StatNumber, Button,
  Table, Thead, Tbody, Tr, Th, Td, Spinner, Center, Alert,
  AlertIcon, Divider, Progress, useToast, Modal, ModalOverlay,
  ModalContent, ModalHeader, ModalBody, ModalFooter, FormControl,
  FormLabel, Input, useDisclosure, Textarea, Switch
} from '@chakra-ui/react';
import { 
  FiUser, FiCreditCard, FiCalendar, FiMail, FiPhone, 
  FiMapPin, FiKey, FiEdit, FiDownload, FiSave, FiX 
} from 'react-icons/fi';
import { useUser } from '../context/UserContext';

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
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const { isOpen: isPasswordModalOpen, onOpen: onPasswordModalOpen, onClose: onPasswordModalClose } = useDisclosure();
  const toast = useToast();

  useEffect(() => {
    fetchMemberData();
  }, []);

  const fetchMemberData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/members/me`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Erreur de chargement');
      
      const memberInfo = await response.json();
      setMemberData(memberInfo);
      setEditData(memberInfo);
      
    } catch (error) {
      console.error('Erreur chargement:', error);
      toast({
        status: 'error',
        title: 'Erreur',
        description: 'Impossible de charger les données d\'adhésion'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditProfile = () => {
    setEditMode(true);
    setEditData({ ...memberData });
  };

  const handleSaveProfile = async () => {
    try {
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
        throw new Error(error.error || 'Erreur de mise à jour');
      }

      const updatedData = await response.json();
      setMemberData(updatedData);
      setEditMode(false);
      
      toast({
        status: 'success',
        title: 'Profil mis à jour',
        description: 'Vos informations ont été sauvegardées'
      });
      
    } catch (error) {
      toast({
        status: 'error',
        title: 'Erreur',
        description: error.message
      });
    }
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setEditData({ ...memberData });
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        status: 'error',
        title: 'Erreur',
        description: 'Les mots de passe ne correspondent pas'
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        status: 'error',
        title: 'Erreur',
        description: 'Le mot de passe doit faire au moins 6 caractères'
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
        title: 'Mot de passe changé',
        description: 'Votre mot de passe a été mis à jour avec succès'
      });

      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      onPasswordModalClose();
      
    } catch (error) {
      toast({
        status: 'error',
        title: 'Erreur',
        description: error.message
      });
    }
  };

  const calculateDaysToExpiry = () => {
    if (!memberData?.renewalDate) return null;
    const renewalDate = new Date(memberData.renewalDate);
    const today = new Date();
    const diffTime = renewalDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <Center h="400px">
        <Spinner size="xl" />
      </Center>
    );
  }

  if (!memberData) {
    return (
      <Center h="400px">
        <Alert status="warning">
          <AlertIcon />
          Aucune donnée d'adhésion disponible
        </Alert>
      </Center>
    );
  }

  const statusConfig = MEMBERSHIP_STATUS_CONFIG[memberData.membershipStatus] || 
    { label: memberData.membershipStatus, color: 'gray', progress: 0 };
  const daysToExpiry = calculateDaysToExpiry();

  return (
    <Box p={6}>
      <VStack align="stretch" spacing={6}>
        {/* Header */}
        <HStack justify="space-between">
          <Heading size="lg" display="flex" alignItems="center">
            <FiUser style={{ marginRight: '8px' }} />
            Mon Adhésion
          </Heading>
          
          {editMode ? (
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

        {/* Alerte si mot de passe à changer */}
        {memberData.mustChangePassword && (
          <Alert status="warning">
            <AlertIcon />
            <Box>
              <Text fontWeight="bold">Action requise</Text>
              <Text fontSize="sm">
                Vous devez changer votre mot de passe temporaire pour sécuriser votre compte.
              </Text>
              <Button size="sm" mt={2} onClick={onPasswordModalOpen}>
                Changer maintenant
              </Button>
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
                <Badge colorScheme={statusConfig.color} fontSize="md" p={2}>
                  {statusConfig.label}
                </Badge>
                <Progress 
                  value={statusConfig.progress} 
                  colorScheme={statusConfig.color}
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
              
              {memberData.renewalDate && (
                <Box>
                  <Text fontSize="sm" color="gray.600" mb={2}>Renouvellement</Text>
                  <Text fontWeight="bold">
                    {new Date(memberData.renewalDate).toLocaleDateString('fr-FR')}
                  </Text>
                  {daysToExpiry !== null && (
                    <Text fontSize="sm" color={daysToExpiry < 30 ? 'red.500' : 'gray.500'}>
                      {daysToExpiry > 0 ? `Dans ${daysToExpiry} jours` : `Expiré depuis ${Math.abs(daysToExpiry)} jours`}
                    </Text>
                  )}
                </Box>
              )}
            </SimpleGrid>
          </CardBody>
        </Card>

        {/* Informations personnelles */}
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
          <Card>
            <CardHeader>
              <Heading size="md">Informations Personnelles</Heading>
            </CardHeader>
            <CardBody>
              <VStack align="stretch" spacing={4}>
                {editMode ? (
                  <>
                    <FormControl>
                      <FormLabel>Prénom</FormLabel>
                      <Input
                        value={editData.firstName || ''}
                        onChange={(e) => setEditData(prev => ({ ...prev, firstName: e.target.value }))}
                      />
                    </FormControl>
                    
                    <FormControl>
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
                    
                    <FormControl>
                      <FormLabel>Adresse</FormLabel>
                      <Input
                        value={editData.address || ''}
                        onChange={(e) => setEditData(prev => ({ ...prev, address: e.target.value }))}
                      />
                    </FormControl>
                    
                    <SimpleGrid columns={2} spacing={4}>
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
                    
                    <FormControl>
                      <FormLabel>Date de naissance</FormLabel>
                      <Input
                        type="date"
                        value={editData.birthDate ? editData.birthDate.split('T')[0] : ''}
                        onChange={(e) => setEditData(prev => ({ ...prev, birthDate: e.target.value }))}
                      />
                    </FormControl>

                    <FormControl display="flex" alignItems="center">
                      <FormLabel htmlFor="newsletter" mb="0">Newsletter</FormLabel>
                      <Switch
                        id="newsletter"
                        isChecked={editData.newsletter}
                        onChange={(e) => setEditData(prev => ({ ...prev, newsletter: e.target.checked }))}
                      />
                    </FormControl>
                  </>
                ) : (
                  <>
                    <HStack>
                      <FiUser />
                      <Box>
                        <Text fontSize="sm" color="gray.600">Nom complet</Text>
                        <Text fontWeight="bold">{memberData.firstName} {memberData.lastName}</Text>
                      </Box>
                    </HStack>
                    
                    <HStack>
                      <FiMail />
                      <Box>
                        <Text fontSize="sm" color="gray.600">Email</Text>
                        <Text fontWeight="bold">{memberData.email}</Text>
                      </Box>
                    </HStack>
                    
                    {memberData.phone && (
                      <HStack>
                        <FiPhone />
                        <Box>
                          <Text fontSize="sm" color="gray.600">Téléphone</Text>
                          <Text fontWeight="bold">{memberData.phone}</Text>
                        </Box>
                      </HStack>
                    )}
                    
                    {(memberData.address || memberData.city) && (
                      <HStack>
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
                      <HStack>
                        <FiCalendar />
                        <Box>
                          <Text fontSize="sm" color="gray.600">Date de naissance</Text>
                          <Text fontWeight="bold">
                            {new Date(memberData.birthDate).toLocaleDateString('fr-FR')}
                          </Text>
                        </Box>
                      </HStack>
                    )}
                  </>
                )}
              </VStack>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <Heading size="md">Informations d'Adhésion</Heading>
            </CardHeader>
            <CardBody>
              <VStack align="stretch" spacing={4}>
                <HStack>
                  <FiCreditCard />
                  <Box>
                    <Text fontSize="sm" color="gray.600">Numéro d'adhérent</Text>
                    <Text fontWeight="bold">#{memberData.memberNumber}</Text>
                  </Box>
                </HStack>
                
                <HStack>
                  <FiKey />
                  <Box>
                    <Text fontSize="sm" color="gray.600">Matricule de connexion</Text>
                    <Text fontWeight="bold">{memberData.matricule}</Text>
                  </Box>
                </HStack>
                
                {memberData.createdAt && (
                  <HStack>
                    <FiCalendar />
                    <Box>
                      <Text fontSize="sm" color="gray.600">Date d'adhésion</Text>
                      <Text fontWeight="bold">
                        {new Date(memberData.createdAt).toLocaleDateString('fr-FR')}
                      </Text>
                    </Box>
                  </HStack>
                )}
                
                {memberData.lastPaymentDate && (
                  <HStack>
                    <FiCreditCard />
                    <Box>
                      <Text fontSize="sm" color="gray.600">Dernier paiement</Text>
                      <Text fontWeight="bold">
                        {memberData.paymentAmount && `${memberData.paymentAmount}€ `}
                        le {new Date(memberData.lastPaymentDate).toLocaleDateString('fr-FR')}
                        {memberData.paymentMethod && ` (${PAYMENT_METHODS[memberData.paymentMethod] || memberData.paymentMethod})`}
                      </Text>
                    </Box>
                  </HStack>
                )}
              </VStack>
            </CardBody>
          </Card>
        </SimpleGrid>

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

        {/* Notes admin si présentes */}
        {memberData.notes && (
          <Card>
            <CardHeader>
              <Heading size="md">Notes</Heading>
            </CardHeader>
            <CardBody>
              <Text>{memberData.notes}</Text>
            </CardBody>
          </Card>
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
              Changer
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
