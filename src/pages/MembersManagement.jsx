import React, { useState, useEffect } from 'react';
import {
  Box, Heading, VStack, HStack, Button, Table, Thead, Tbody, Tr, Th, Td,
  Badge, Text, Spinner, Center, Input, InputGroup, InputLeftElement,
  useDisclosure, useToast, IconButton, Tooltip, Card, CardHeader, CardBody,
  SimpleGrid, Stat, StatLabel, StatNumber, Flex, Alert, AlertIcon,
  Menu, MenuButton, MenuList, MenuItem, Modal, ModalOverlay, ModalContent,
  ModalHeader, ModalCloseButton, ModalBody, ModalFooter, FormControl,
  FormLabel, Select, Switch, Textarea
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
  const [stats, setStats] = useState({});
  
  const { isOpen: isCreateOpen, onOpen: onCreateOpen, onClose: onCreateClose } = useDisclosure();
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
  const { isOpen: isResetPasswordOpen, onOpen: onResetPasswordOpen, onClose: onResetPasswordClose } = useDisclosure();
  
  const toast = useToast();

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
    member.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.matricule?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Réinitialiser le mot de passe
  const handleResetPassword = async (memberId) => {
    try {
      const response = await fetch(`${membersAPI.baseURL}/members/${memberId}/reset-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      toast({
        status: 'success',
        title: 'Mot de passe réinitialisé',
        description: `Nouveau mot de passe temporaire : ${data.temporaryPassword}`,
        duration: 10000,
        isClosable: true
      });

      fetchMembers(); // Recharger la liste

    } catch (error) {
      toast({
        status: 'error',
        title: 'Erreur',
        description: error.message
      });
    }
  };

  // Activer/désactiver la connexion
  const toggleLoginAccess = async (memberId, currentStatus) => {
    try {
      const response = await fetch(`${membersAPI.baseURL}/members/${memberId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ loginEnabled: !currentStatus })
      });

      if (!response.ok) throw new Error('Erreur de mise à jour');

      toast({
        status: 'success',
        title: currentStatus ? 'Accès désactivé' : 'Accès activé',
        description: `L'accès à la connexion a été ${currentStatus ? 'désactivé' : 'activé'}`
      });

      fetchMembers();

    } catch (error) {
      toast({
        status: 'error',
        title: 'Erreur',
        description: error.message
      });
    }
  };

  if (loading) {
    return (
      <Center h="400px">
        <Spinner size="xl" color="blue.500" />
      </Center>
    );
  }

  return (
    <Box p={6}>
      <VStack spacing={6} align="stretch">
        {/* En-tête */}
        <Flex justify="space-between" align="center">
          <Heading size="lg" display="flex" alignItems="center">
            <FiUsers style={{ marginRight: '12px' }} />
            Gestion des Adhésions
          </Heading>
          <Button
            leftIcon={<FiUserPlus />}
            colorScheme="blue"
            onClick={onCreateOpen}
          >
            Nouvel adhérent
          </Button>
        </Flex>

        {/* Statistiques */}
        <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4}>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Total adhérents</StatLabel>
                <StatNumber color="blue.500">{stats.total || 0}</StatNumber>
              </Stat>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Adhérents actifs</StatLabel>
                <StatNumber color="green.500">{stats.active || 0}</StatNumber>
              </Stat>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Avec accès connexion</StatLabel>
                <StatNumber color="purple.500">{stats.withLogin || 0}</StatNumber>
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
        <HStack spacing={4}>
          <InputGroup flex={1}>
            <InputLeftElement pointerEvents="none">
              <FiSearch color="gray.300" />
            </InputLeftElement>
            <Input
              placeholder="Rechercher par nom, email ou matricule..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
          <Button leftIcon={<FiRefreshCw />} onClick={fetchMembers}>
            Actualiser
          </Button>
        </HStack>

        {/* Tableau des membres */}
        <Card>
          <CardBody p={0}>
            <Table variant="simple">
              <Thead bg="gray.50">
                <Tr>
                  <Th>Membre</Th>
                  <Th>Email</Th>
                  <Th>Matricule</Th>
                  <Th>Statut</Th>
                  <Th>Rôle</Th>
                  <Th>Connexion</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredMembers.map((member) => (
                  <Tr key={member.id}>
                    <Td>
                      <VStack align="start" spacing={1}>
                        <Text fontWeight="medium">
                          {member.firstName} {member.lastName}
                        </Text>
                        <Text fontSize="sm" color="gray.500">
                          N° {member.memberNumber}
                        </Text>
                      </VStack>
                    </Td>
                    <Td>
                      <Text fontSize="sm">{member.email}</Text>
                    </Td>
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
                      <VStack align="start" spacing={1}>
                        <HStack>
                          <Badge colorScheme={member.loginEnabled ? 'green' : 'gray'}>
                            {member.loginEnabled ? 'Activé' : 'Désactivé'}
                          </Badge>
                          {member.mustChangePassword && (
                            <Badge colorScheme="orange" size="sm">
                              Changer MDP
                            </Badge>
                          )}
                        </HStack>
                        {member.lastLoginAt && (
                          <Text fontSize="xs" color="gray.500">
                            Dernière: {new Date(member.lastLoginAt).toLocaleDateString()}
                          </Text>
                        )}
                      </VStack>
                    </Td>
                    <Td>
                      <Menu>
                        <MenuButton
                          as={IconButton}
                          icon={<FiMoreVertical />}
                          variant="ghost"
                          size="sm"
                        />
                        <MenuList>
                          <MenuItem icon={<FiEye />} onClick={() => {
                            setSelectedMember(member);
                            onEditOpen();
                          }}>
                            Voir détails
                          </MenuItem>
                          <MenuItem 
                            icon={member.loginEnabled ? <FiLock /> : <FiUnlock />}
                            onClick={() => toggleLoginAccess(member.id, member.loginEnabled)}
                          >
                            {member.loginEnabled ? 'Désactiver' : 'Activer'} connexion
                          </MenuItem>
                          {member.loginEnabled && (
                            <MenuItem 
                              icon={<FiKey />}
                              onClick={() => handleResetPassword(member.id)}
                            >
                              Réinitialiser mot de passe
                            </MenuItem>
                          )}
                        </MenuList>
                      </Menu>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>

            {filteredMembers.length === 0 && (
              <Center py={8}>
                <Text color="gray.500">Aucun membre trouvé</Text>
              </Center>
            )}
          </CardBody>
        </Card>
      </VStack>

      {/* Modal de création d'adhérent avec identifiants */}
      <CreateMemberWithLogin
        isOpen={isCreateOpen}
        onClose={onCreateClose}
        onMemberCreated={(member) => {
          fetchMembers();
          onCreateClose();
        }}
      />

      {/* Modal de détails du membre */}
      <Modal isOpen={isEditOpen} onClose={onEditClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Détails de l'adhérent</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedMember && (
              <VStack spacing={4} align="stretch">
                <SimpleGrid columns={2} spacing={4}>
                  <FormControl>
                    <FormLabel>Prénom</FormLabel>
                    <Input value={selectedMember.firstName} readOnly />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Nom</FormLabel>
                    <Input value={selectedMember.lastName} readOnly />
                  </FormControl>
                </SimpleGrid>
                
                <FormControl>
                  <FormLabel>Email</FormLabel>
                  <Input value={selectedMember.email} readOnly />
                </FormControl>

                <SimpleGrid columns={2} spacing={4}>
                  <FormControl>
                    <FormLabel>Matricule</FormLabel>
                    <Input value={selectedMember.matricule || '-'} readOnly />
                  </FormControl>
                  <FormControl>
                    <FormLabel>N° Adhérent</FormLabel>
                    <Input value={selectedMember.memberNumber} readOnly />
                  </FormControl>
                </SimpleGrid>

                {selectedMember.loginEnabled && (
                  <Alert status="info">
                    <AlertIcon />
                    <VStack align="start" spacing={1}>
                      <Text fontSize="sm">
                        Accès connexion activé avec le matricule : <strong>{selectedMember.matricule}</strong>
                      </Text>
                      {selectedMember.mustChangePassword && (
                        <Text fontSize="sm" color="orange.500">
                          ⚠️ Doit changer son mot de passe à la prochaine connexion
                        </Text>
                      )}
                      {selectedMember.lastLoginAt && (
                        <Text fontSize="sm" color="gray.500">
                          Dernière connexion : {new Date(selectedMember.lastLoginAt).toLocaleString()}
                        </Text>
                      )}
                    </VStack>
                  </Alert>
                )}
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button onClick={onEditClose}>Fermer</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}