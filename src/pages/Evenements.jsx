import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Heading, SimpleGrid, Card, CardHeader, CardBody,
  Text, Badge, HStack, Spinner, Center, Button, Flex, useToast,
  VStack, useDisclosure, Modal, ModalOverlay, ModalContent,
  ModalHeader, ModalCloseButton, ModalBody, FormControl, FormLabel,
  Input, Textarea, Select, ModalFooter, Table, Thead, Tbody, Tr, Th, Td,
  Tabs, TabList, TabPanels, Tab, TabPanel, Alert, AlertIcon
} from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import { FiEdit, FiPlus, FiEye, FiTrash2, FiCalendar, FiGrid, FiList } from 'react-icons/fi';
import { eventsAPI } from '../api/events.js';
import { vehiculesAPI } from '../api/vehicles.js';

const Evenements = () => {
  const [events, setEvents] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState('cards'); // 'cards' ou 'table'
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [editingEvent, setEditingEvent] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '',
    location: '',
    description: '',
    adultPrice: '',
    childPrice: '',
    helloAssoUrl: '',
    vehicleId: '',
    status: 'DRAFT'
  });

  // Ajouter un fallback temporaire au début de fetchEvents:
  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const data = await eventsAPI.getAll();
      setEvents(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Erreur events API:', e);
      // Fallback temporaire
      setEvents([
        {
          id: 'halloween2025',
          title: 'RétroWouh ! Halloween',
          date: '2025-10-31',
          time: '20:00',
          location: 'Salle des Fêtes de Villebon',
          description: 'Soirée spéciale Halloween avec animations, musique et surprises !',
          adultPrice: 15,
          childPrice: 8,
          helloAssoUrl: 'https://www.helloasso.com/associations/rbe/evenements/halloween2025',
          vehicleId: '920',
          status: 'PUBLISHED'
        }
      ]);
      toast({ 
        status: "warning", 
        title: "Mode hors ligne",
        description: "Utilisation des données de test (API indisponible)"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchVehicles = useCallback(async () => {
    try {
      const data = await vehiculesAPI.getAll();
      setVehicles(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setVehicles([]);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    fetchVehicles();
  }, [fetchEvents, fetchVehicles]);

  const handleCreate = () => {
    setEditingEvent(null);
    setFormData({
      title: '',
      date: '',
      time: '',
      location: '',
      description: '',
      adultPrice: '',
      childPrice: '',
      helloAssoUrl: '',
      vehicleId: '',
      status: 'DRAFT'
    });
    onOpen();
  };

  const handleEdit = (event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title || '',
      date: event.date || '',
      time: event.time || '',
      location: event.location || '',
      description: event.description || '',
      adultPrice: event.adultPrice || '',
      childPrice: event.childPrice || '',
      helloAssoUrl: event.helloAssoUrl || '',
      vehicleId: event.vehicleId || '',
      status: event.status || 'DRAFT'
    });
    onOpen();
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast({ status: "warning", title: "Le titre est requis" });
      return;
    }

    try {
      setSaving(true);
      const eventData = {
        title: formData.title.trim(),
        date: formData.date,
        time: formData.time,
        location: formData.location.trim(),
        description: formData.description.trim(),
        adultPrice: formData.adultPrice ? parseFloat(formData.adultPrice) : null,
        childPrice: formData.childPrice ? parseFloat(formData.childPrice) : null,
        helloAssoUrl: formData.helloAssoUrl.trim(),
        vehicleId: formData.vehicleId || null,
        status: formData.status
      };

      if (editingEvent) {
        await eventsAPI.update(editingEvent.id, eventData);
        toast({ status: "success", title: "Événement modifié avec succès" });
      } else {
        await eventsAPI.create(eventData);
        toast({ status: "success", title: "Événement créé avec succès" });
      }

      await fetchEvents();
      onClose();
    } catch (e) {
      toast({ 
        status: "error", 
        title: "Erreur lors de la sauvegarde",
        description: e.message
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (event) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'événement "${event.title}" ?`)) {
      return;
    }

    try {
      await eventsAPI.delete(event.id);
      toast({ status: "success", title: "Événement supprimé" });
      await fetchEvents();
    } catch (e) {
      toast({ 
        status: "error", 
        title: "Erreur lors de la suppression",
        description: e.message
      });
    }
  };

  const togglePublish = async (event) => {
    const newStatus = event.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    try {
      // Utiliser update au lieu de publish pour plus de clarté
      await eventsAPI.update(event.id, { status: newStatus });
      toast({ 
        status: "success", 
        title: `Événement ${newStatus === 'PUBLISHED' ? 'publié' : 'dépublié'}` 
      });
      await fetchEvents();
    } catch (e) {
      console.error('Erreur toggle publish:', e);
      toast({ 
        status: "error", 
        title: "Erreur lors de la publication",
        description: e.message
      });
    }
  };

  const getStatusBadge = (status) => {
    return status === 'PUBLISHED' 
      ? <Badge colorScheme="green">Publié</Badge>
      : <Badge colorScheme="gray">Brouillon</Badge>;
  };

  const getVehicleName = (vehicleId) => {
    const vehicle = vehicles.find(v => v.parc === vehicleId);
    return vehicle ? `${vehicle.parc} - ${vehicle.modele}` : 'Aucun véhicule';
  };

  const selectedEvent = events.find(e => e.id === selectedEventId);
  const selectedVehicle = selectedEvent ? vehicles.find(v => v.parc === selectedEvent.vehicleId) : null;

  // Vue en cartes
  const CardsView = () => (
    <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
      {events.map((event) => (
        <Card key={event.id} shadow="md">
          <CardHeader pb={2}>
            <HStack justify="space-between">
              <Heading size="md" noOfLines={2}>{event.title}</Heading>
              {getStatusBadge(event.status)}
            </HStack>
          </CardHeader>
          <CardBody pt={0}>
            <VStack align="start" spacing={2}>
              <HStack>
                <FiCalendar />
                <Text fontSize="sm">
                  {event.date} {event.time && `à ${event.time}`}
                </Text>
              </HStack>
              
              {event.location && (
                <Text fontSize="sm">📍 {event.location}</Text>
              )}

              {event.vehicleId && (
                <Text fontSize="sm">🚌 {getVehicleName(event.vehicleId)}</Text>
              )}
              
              {event.description && (
                <Text fontSize="sm" color="gray.600" noOfLines={3}>
                  {event.description}
                </Text>
              )}
              
              {(event.adultPrice || event.childPrice) && (
                <HStack spacing={4}>
                  {event.adultPrice && (
                    <Text fontSize="sm" fontWeight="bold" color="green.600">
                      Adulte: {event.adultPrice}€
                    </Text>
                  )}
                  {event.childPrice && (
                    <Text fontSize="sm" fontWeight="bold" color="green.600">
                      Enfant: {event.childPrice}€
                    </Text>
                  )}
                </HStack>
              )}
              
              <HStack spacing={2} pt={4} w="100%">
                <Button
                  leftIcon={<FiEdit />}
                  size="sm"
                  onClick={() => handleEdit(event)}
                >
                  Modifier
                </Button>
                <Button
                  leftIcon={<FiEye />}
                  size="sm"
                  colorScheme={event.status === 'PUBLISHED' ? 'red' : 'green'}
                  onClick={() => togglePublish(event)}
                >
                  {event.status === 'PUBLISHED' ? 'Dépublier' : 'Publier'}
                </Button>
                <Button
                  leftIcon={<FiTrash2 />}
                  size="sm"
                  colorScheme="red"
                  variant="outline"
                  onClick={() => handleDelete(event)}
                >
                  Supprimer
                </Button>
              </HStack>
            </VStack>
          </CardBody>
        </Card>
      ))}
    </SimpleGrid>
  );

  // Vue en tableau
  const TableView = () => (
    <Box overflowX="auto">
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>Titre</Th>
            <Th>Date</Th>
            <Th>Lieu</Th>
            <Th>Véhicule</Th>
            <Th>Statut</Th>
            <Th>Actions</Th>
          </Tr>
        </Thead>
        <Tbody>
          {events.map(event => (
            <Tr 
              key={event.id} 
              bg={event.id === selectedEventId ? "blue.50" : undefined}
              cursor="pointer"
              onClick={() => setSelectedEventId(event.id === selectedEventId ? null : event.id)}
              _hover={{ bg: "gray.50" }}
            >
              <Td fontWeight="semibold">{event.title}</Td>
              <Td>{event.date} {event.time && `à ${event.time}`}</Td>
              <Td>{event.location || '-'}</Td>
              <Td>{event.vehicleId ? getVehicleName(event.vehicleId) : '-'}</Td>
              <Td>{getStatusBadge(event.status)}</Td>
              <Td>
                <HStack spacing={1}>
                  <Button size="sm" onClick={(e) => { e.stopPropagation(); handleEdit(event); }}>
                    Éditer
                  </Button>
                  <Button 
                    size="sm" 
                    colorScheme={event.status === 'PUBLISHED' ? 'red' : 'green'}
                    onClick={(e) => { e.stopPropagation(); togglePublish(event); }}
                  >
                    {event.status === 'PUBLISHED' ? 'Dépublier' : 'Publier'}
                  </Button>
                  <Button 
                    size="sm" 
                    colorScheme="red" 
                    variant="outline"
                    onClick={(e) => { e.stopPropagation(); handleDelete(event); }}
                  >
                    Supprimer
                  </Button>
                </HStack>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      {/* Détails de l'événement sélectionné */}
      {selectedEvent && selectedEventId && (
        <Box mt={6} p={6} borderWidth="1px" borderRadius="lg" bg="blue.50">
          {selectedVehicle && (
            <Alert status="info" mb={4} borderRadius="md">
              <AlertIcon />
              <strong>{selectedVehicle.parc} - {selectedVehicle.modele}</strong> participera à cet événement !
            </Alert>
          )}
          
          <Heading size="md" mb={4}>{selectedEvent.title}</Heading>
          <VStack align="start" spacing={2}>
            <Text><strong>Date :</strong> {selectedEvent.date} à {selectedEvent.time}</Text>
            <Text><strong>Lieu :</strong> {selectedEvent.location}</Text>
            <Text><strong>Tarif adulte :</strong> {selectedEvent.adultPrice}€</Text>
            <Text><strong>Tarif enfant :</strong> {selectedEvent.childPrice}€</Text>
            <Text><strong>Description :</strong> {selectedEvent.description}</Text>
            {selectedEvent.helloAssoUrl && (
              <Text>
                <strong>Lien HelloAsso :</strong>{' '}
                <a href={selectedEvent.helloAssoUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'blue' }}>
                  {selectedEvent.helloAssoUrl}
                </a>
              </Text>
            )}
            <Text><strong>Véhicule participant :</strong> {selectedVehicle ? `${selectedVehicle.parc} - ${selectedVehicle.modele}` : 'Aucun'}</Text>
          </VStack>
        </Box>
      )}
    </Box>
  );

  return (
    <Box p={6}>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading>Gestion des Événements</Heading>
        <HStack spacing={3}>
          <Button
            leftIcon={viewMode === 'cards' ? <FiList /> : <FiGrid />}
            size="sm"
            variant="outline"
            onClick={() => setViewMode(viewMode === 'cards' ? 'table' : 'cards')}
          >
            {viewMode === 'cards' ? 'Vue tableau' : 'Vue cartes'}
          </Button>
          <Button
            leftIcon={<FiPlus />}
            colorScheme="blue"
            onClick={handleCreate}
          >
            Nouvel événement
          </Button>
        </HStack>
      </Flex>

      {loading ? (
        <Center py={20}>
          <Spinner size="xl" />
        </Center>
      ) : events.length === 0 ? (
        <Center py={20}>
          <VStack spacing={4}>
            <Text color="gray.500" fontSize="lg">Aucun événement trouvé</Text>
            <Button leftIcon={<FiPlus />} colorScheme="blue" onClick={handleCreate}>
              Créer le premier événement
            </Button>
          </VStack>
        </Center>
      ) : viewMode === 'cards' ? (
        <CardsView />
      ) : (
        <TableView />
      )}

      {/* Modal de création/édition */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {editingEvent ? 'Modifier l\'événement' : 'Nouvel événement'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Titre</FormLabel>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Nom de l'événement"
                />
              </FormControl>

              <HStack w="100%" spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Date</FormLabel>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Heure</FormLabel>
                  <Input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                  />
                </FormControl>
              </HStack>

              <FormControl>
                <FormLabel>Lieu</FormLabel>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Lieu de l'événement"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Véhicule participant</FormLabel>
                <Select
                  value={formData.vehicleId}
                  onChange={(e) => setFormData(prev => ({ ...prev, vehicleId: e.target.value }))}
                  placeholder="Sélectionner un véhicule (optionnel)"
                >
                  {vehicles.map(vehicle => (
                    <option key={vehicle.parc} value={vehicle.parc}>
                      {vehicle.parc} - {vehicle.modele} ({vehicle.marque})
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Description</FormLabel>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Description de l'événement"
                  rows={4}
                />
              </FormControl>

              <HStack w="100%" spacing={4}>
                <FormControl>
                  <FormLabel>Prix adulte (€)</FormLabel>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.adultPrice}
                    onChange={(e) => setFormData(prev => ({ ...prev, adultPrice: e.target.value }))}
                    placeholder="15.00"
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Prix enfant (€)</FormLabel>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.childPrice}
                    onChange={(e) => setFormData(prev => ({ ...prev, childPrice: e.target.value }))}
                    placeholder="8.00"
                  />
                </FormControl>
              </HStack>

              <FormControl>
                <FormLabel>Lien HelloAsso</FormLabel>
                <Input
                  value={formData.helloAssoUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, helloAssoUrl: e.target.value }))}
                  placeholder="https://www.helloasso.com/..."
                />
              </FormControl>

              <FormControl>
                <FormLabel>Statut</FormLabel>
                <Select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                >
                  <option value="DRAFT">Brouillon</option>
                  <option value="PUBLISHED">Publié</option>
                </Select>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Annuler
            </Button>
            <Button colorScheme="blue" onClick={handleSave} isLoading={saving}>
              {editingEvent ? 'Modifier' : 'Créer'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default Evenements;