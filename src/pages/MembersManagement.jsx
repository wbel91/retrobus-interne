import React, { useState, useEffect } from 'react';
import {
  Box, Heading, VStack, HStack, Button, Table, Thead, Tbody, Tr, Th, Td,
  Badge, Text, Spinner, Center, Input, InputGroup, InputLeftElement,
  useDisclosure, useToast, IconButton, Tooltip, Card, CardHeader, CardBody,
  SimpleGrid, Stat, StatLabel, StatNumber, Flex, Alert, AlertIcon,
  Menu, MenuButton, MenuList, MenuItem, Modal, ModalOverlay, ModalContent,
  ModalHeader, ModalCloseButton, ModalBody, ModalFooter, FormControl,
  FormLabel, Select, Switch, Textarea, AlertDialog, AlertDialogBody,
  AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogOverlay
} from '@chakra-ui/react';
import {
  FiUsers, FiPlus, FiSearch, FiEdit, FiTrash2, FiEye, FiKey,
  FiUserPlus, FiLock, FiUnlock, FiMoreVertical, FiRefreshCw
} from 'react-icons/fi';
import CreateMemberWithLogin from '../components/CreateMemberWithLogin';
import { membersAPI } from '../api';

const MEMBERSHIP_STATUS = {
  PENDING: { label: 'En attente', color: 'yellow' },
  ACTIVE: { label: 'Actif', color: 'green' },
  EXPIRED: { label: 'Expiré', color: 'red' },
  SUSPENDED: { label: 'Suspendu', color: 'orange' }
};

const MEMBER_ROLES = {
  MEMBER: { label: 'Membre', color: 'blue' },
  DRIVER: { label: 'Conducteur', color: 'green' },
  ADMIN: { label: 'Admin', color: 'red' }
};

export default function MembersManagement() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [stats, setStats] = useState({});
  
  const { isOpen: isCreateOpen, onOpen: onCreateOpen, onClose: onCreateClose } = useDisclosure();
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
  const { isOpen: isResetPasswordOpen, onOpen: onResetPasswordOpen, onClose: onResetPasswordClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  
  const toast = useToast();
  const cancelRef = React.useRef();

  // Charger les membres
  const fetchMembers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${membersAPI.baseURL}/members`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Erreur de chargement');
      
      const data = await response.json();
      setMembers(data);
      
      // Calculer les statistiques
      const totalMembers = data.length;
      const activeMembers = data.filter(m => m.membershipStatus === 'ACTIVE').length;
      const withLoginAccess = data.filter(m => m.loginEnabled).length;
      const pendingPassword = data.filter(m => m.mustChangePassword).length;
      
      setStats({
        total: totalMembers,
        active: activeMembers,
        withLogin: withLoginAccess,
        pendingPassword
      });
      
    } catch (error) {
      toast({
        status: 'error',
        title: 'Erreur',
        description: 'Impossible de charger les membres'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  // Filtrer les membres selon la recherche
  const filteredMembers = members.filter(member =>
    member.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.matricule?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Réinitialiser le mot de passe
  const handleResetPassword = async (memberId) => {
    try {
      const response = await fetch(`${membersAPI.baseURL}/members/${memberId}/reset-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Erreur de réinitialisation');
      
      const data = await response.json();
      
      toast({
        status: 'success',
        title: 'Mot de passe réinitialisé',
        description: `Nouveau mot de passe temporaire : ${data.temporaryPassword}`
      });
      
      onResetPasswordClose();
      fetchMembers();
      
    } catch (error) {
      toast({
        status: 'error',
        title: 'Erreur',
        description: 'Impossible de réinitialiser le mot de passe'
      });
    }
  };

  // Supprimer un membre
  const handleDeleteMember = async () => {
    if (!memberToDelete) return;
    
    try {
      const response = await fetch(`${membersAPI.baseURL}/members/${memberToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Erreur de suppression');
      
      toast({
        status: 'success',
        title: 'Membre supprimé',
        description: `${memberToDelete.firstName} ${memberToDelete.lastName} a été supprimé avec succès`
      });
      
      setMembers(members.filter(m => m.id !== memberToDelete.id));
      setMemberToDelete(null);
      onDeleteClose();
      
    } catch (error) {
      toast({
        status: 'error',
        title: 'Erreur',
        description: 'Impossible de supprimer le membre'
      });
    }
  };

  // Ouvrir la confirmation de suppression
  const confirmDeleteMember = (member) => {
    setMemberToDelete(member);
    onDeleteOpen();
  };

  // Activer/désactiver l'accès intranet
  const toggleInternalAccess = async (memberId, currentStatus) => {
    try {
      const response = await fetch(`${membersAPI.baseURL}/members/${memberId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          hasInternalAccess: !currentStatus,
          loginEnabled: !currentStatus
        })
      });
      
      if (!response.ok) throw new Error('Erreur de mise à jour');
      
      toast({
        status: 'success',
        title: 'Accès mis à jour',
        description: `Accès intranet ${!currentStatus ? 'activé' : 'désactivé'}`
      });
      
      fetchMembers();
      
    } catch (error) {
      toast({
        status: 'error',
        title: 'Erreur',
        description: 'Impossible de mettre à jour l\'accès'
      });
    }
  };

  const handleMemberCreated = (newMember) => {
    fetchMembers();
    onCreateClose();
  };

  if (loading) {
    return (
      <Center h="400px">
        <Spinner size="xl" />
      </Center>
    );
  }

  return (
    <Box p={6}>
      <VStack align="stretch" spacing={6}>
        {/* Header */}
        <Flex justify="space-between" align="center">
          <Heading size="lg" display="flex" alignItems="center">
            <FiUsers style={{ marginRight: '8px' }} />
            Gestion des Adhérents
          </Heading>
          <HStack>
            <Button leftIcon={<FiRefreshCw />} onClick={fetchMembers}>
              Actualiser
            </Button>
            <Button leftIcon={<FiUserPlus />} colorScheme="blue" onClick={onCreateOpen}>
              Créer un adhérent
            </Button>
          </HStack>
        </Flex>

        {/* Statistiques */}
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Total Adhérents</StatLabel>
                <StatNumber>{stats.total || 0}</StatNumber>
              </Stat>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Membres Actifs</StatLabel>
                <StatNumber>{stats.active || 0}</StatNumber>
              </Stat>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Accès Intranet</StatLabel>
                <StatNumber>{stats.withLogin || 0}</StatNumber>
              </Stat>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Mot de passe à changer</StatLabel>
                <StatNumber color="orange.500">{stats.pendingPassword || 0}</StatNumber>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* Barre de recherche */}
        <InputGroup maxW="400px">
          <InputLeftElement>
            <FiSearch color="gray.400" />
          </InputLeftElement>
          <Input
            placeholder="Rechercher par nom, email ou matricule..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </InputGroup>

        {/* Tableau des membres */}
        <Card>
          <CardBody>
            {filteredMembers.length === 0 ? (
              <Center p={8}>
                <Text color="gray.500">Aucun membre trouvé</Text>
              </Center>
            ) : (
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Nom</Th>
                    <Th>Email</Th>
                    <Th>Matricule</Th>
                    <Th>Statut</Th>
                    <Th>Rôle</Th>
                    <Th>Accès Intranet</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredMembers.map((member) => (
                    <Tr key={member.id}>
                      <Td>
                        <VStack align="start" spacing={0}>
                          <Text fontWeight="medium">
                            {member.firstName} {member.lastName}
                          </Text>
                          <Text fontSize="sm" color="gray.500">
                            #{member.memberNumber}
                          </Text>
                        </VStack>
                      </Td>
                      <Td>{member.email}</Td>
                      <Td>
                        {member.matricule ? (
                          <Badge colorScheme="blue">{member.matricule}</Badge>
                        ) : (
                          <Text fontSize="sm" color="gray.400">-</Text>
                        )}
                      </Td>
                      <Td>
                        <Badge colorScheme={MEMBERSHIP_STATUS[member.membershipStatus]?.color || 'gray'}>
                          {MEMBERSHIP_STATUS[member.membershipStatus]?.label || member.membershipStatus}
                        </Badge>
                      </Td>
                      <Td>
                        <Badge colorScheme={MEMBER_ROLES[member.role]?.color || 'gray'}>
                          {MEMBER_ROLES[member.role]?.label || member.role}
                        </Badge>
                      </Td>
                      <Td>
                        <HStack>
                          <Switch
                            isChecked={member.hasInternalAccess}
                            onChange={() => toggleInternalAccess(member.id, member.hasInternalAccess)}
                            size="sm"
                          />
                          {member.mustChangePassword && (
                            <Badge colorScheme="orange" size="sm">
                              Mot de passe à changer
                            </Badge>
                          )}
                        </HStack>
                      </Td>
                      <Td>
                        <HStack>
                          <Tooltip label="Réinitialiser le mot de passe">
                            <IconButton
                              size="sm"
                              icon={<FiKey />}
                              onClick={() => {
                                setSelectedMember(member);
                                onResetPasswordOpen();
                              }}
                              isDisabled={!member.hasInternalAccess}
                            />
                          </Tooltip>
                          <Tooltip label="Supprimer le membre">
                            <IconButton
                              size="sm"
                              icon={<FiTrash2 />}
                              colorScheme="red"
                              variant="ghost"
                              onClick={() => confirmDeleteMember(member)}
                            />
                          </Tooltip>
                        </HStack>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </CardBody>
        </Card>
      </VStack>

      {/* Modal de création d'adhérent */}
      <CreateMemberWithLogin
        isOpen={isCreateOpen}
        onClose={onCreateClose}
        onMemberCreated={handleMemberCreated}
      />

      {/* Confirmation de réinitialisation du mot de passe */}
      <Modal isOpen={isResetPasswordOpen} onClose={onResetPasswordClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Réinitialiser le mot de passe</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedMember && (
              <Text>
                Êtes-vous sûr de vouloir réinitialiser le mot de passe de{' '}
                <strong>{selectedMember.firstName} {selectedMember.lastName}</strong> ?
              </Text>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={onResetPasswordClose}>
              Annuler
            </Button>
            <Button
              colorScheme="orange"
              onClick={() => handleResetPassword(selectedMember?.id)}
              ml={3}
            >
              Réinitialiser
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Confirmation de suppression */}
      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Supprimer l'adhérent
            </AlertDialogHeader>

            <AlertDialogBody>
              {memberToDelete && (
                <>
                  Êtes-vous sûr de vouloir supprimer l'adhérent{' '}
                  <strong>{memberToDelete.firstName} {memberToDelete.lastName}</strong> ?
                  <br />
                  <Text color="red.500" mt={2} fontSize="sm">
                    ⚠️ Cette action est irréversible et supprimera définitivement toutes les données associées.
                  </Text>
                </>
              )}
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteClose}>
                Annuler
              </Button>
              <Button colorScheme="red" onClick={handleDeleteMember} ml={3}>
                Supprimer
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
}