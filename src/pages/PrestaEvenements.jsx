import React, { useState } from "react";
import {
  Box,
  Button,
  Container,
  Heading,
  VStack,
  Input,
  Textarea,
  FormLabel,
  FormControl,
  HStack,
  Select,
  Alert,
  AlertIcon,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Text,
} from "@chakra-ui/react";

// Exemple de véhicules disponibles
const vehiclesList = [
  { id: "bus920", name: "RétroBus 920" },
  { id: "bus921", name: "RétroBus 921" },
  { id: "bus922", name: "RétroBus 922" },
];

// Exemple d'événements existants
const initialEvents = [
  {
    id: "halloween2025",
    title: "RétroWouh ! Halloween",
    date: "2025-10-31",
    time: "20:00",
    location: "Salle des Fêtes de Villebon",
    adultPrice: 15,
    childPrice: 8,
    description: "Soirée spéciale Halloween avec animations, musique et surprises !",
    helloAssoUrl: "https://www.helloasso.com/associations/rbe/evenements/halloween2025",
    vehicleId: "bus920",
  },
  // ...autres événements
];

export default function PrestaEvenements() {
  const [events, setEvents] = useState(initialEvents);
  const [selectedId, setSelectedId] = useState(events[0]?.id || "");
  const [form, setForm] = useState(events[0] || {});
  const [isEditing, setIsEditing] = useState(false);

  // Sélection d'un événement
  const handleSelect = (id) => {
    const event = events.find(e => e.id === id);
    setSelectedId(id);
    setForm(event);
    setIsEditing(false);
  };

  // Modification du formulaire
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "adultPrice" || name === "childPrice" ? Number(value) : value,
    }));
  };

  // Enregistrement
  const handleSubmit = (e) => {
    e.preventDefault();
    setEvents((prev) =>
      prev.map(ev => (ev.id === form.id ? form : ev))
    );
    setIsEditing(false);
  };

  // Ajout d'un nouvel événement
  const handleAdd = () => {
    setForm({
      id: "",
      title: "",
      date: "",
      time: "",
      location: "",
      adultPrice: 0,
      childPrice: 0,
      description: "",
      helloAssoUrl: "",
      vehicleId: vehiclesList[0]?.id || "",
    });
    setIsEditing(true);
    setSelectedId("");
  };

  // Suppression
  const handleDelete = (id) => {
    setEvents(events.filter(ev => ev.id !== id));
    if (selectedId === id) {
      setSelectedId(events[0]?.id || "");
      setForm(events[0] || {});
      setIsEditing(false);
    }
  };

  const selectedVehicle = vehiclesList.find(v => v.id === form.vehicleId);

  return (
    <Container maxW="container.xl" py={10}>
      <Heading mb={6}>Gestion des événements</Heading>

      {/* Liste des événements */}
      <Box mb={8}>
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>ID</Th>
              <Th>Titre</Th>
              <Th>Date</Th>
              <Th>Véhicule</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {events.map(ev => (
              <Tr key={ev.id} bg={ev.id === selectedId ? "orange.50" : undefined}>
                <Td>{ev.id}</Td>
                <Td>{ev.title}</Td>
                <Td>{ev.date}</Td>
                <Td>{vehiclesList.find(v => v.id === ev.vehicleId)?.name || "-"}</Td>
                <Td>
                  <Button size="sm" onClick={() => handleSelect(ev.id)} mr={2}>Voir</Button>
                  <Button size="sm" colorScheme="blue" onClick={() => { handleSelect(ev.id); setIsEditing(true); }}>Éditer</Button>
                  <Button size="sm" colorScheme="red" onClick={() => handleDelete(ev.id)}>Supprimer</Button>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
        <Button colorScheme="green" mt={4} onClick={handleAdd}>Ajouter un événement</Button>
      </Box>

      {/* Bandeau pub véhicule */}
      {selectedVehicle && !isEditing && (
        <Alert status="info" mb={6} borderRadius="md">
          <AlertIcon />
          <strong>{selectedVehicle.name}</strong> participera à cet événement !
        </Alert>
      )}

      {/* Formulaire d'édition/ajout */}
      {(isEditing || !selectedId) && (
        <Box as="form" onSubmit={handleSubmit} p={6} borderWidth="1px" borderRadius="lg" bg="gray.50">
          <VStack spacing={4} align="stretch">
            <FormControl isRequired>
              <FormLabel>ID (eventId)</FormLabel>
              <Input name="id" value={form.id} onChange={handleChange} />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Titre</FormLabel>
              <Input name="title" value={form.title} onChange={handleChange} />
            </FormControl>
            <HStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Date</FormLabel>
                <Input type="date" name="date" value={form.date} onChange={handleChange} />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Heure</FormLabel>
                <Input type="time" name="time" value={form.time} onChange={handleChange} />
              </FormControl>
            </HStack>
            <FormControl isRequired>
              <FormLabel>Lieu</FormLabel>
              <Input name="location" value={form.location} onChange={handleChange} />
            </FormControl>
            <HStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Tarif adulte (€)</FormLabel>
                <Input type="number" name="adultPrice" value={form.adultPrice} onChange={handleChange} min={0} />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Tarif enfant (€)</FormLabel>
                <Input type="number" name="childPrice" value={form.childPrice} onChange={handleChange} min={0} />
              </FormControl>
            </HStack>
            <FormControl>
              <FormLabel>Description</FormLabel>
              <Textarea name="description" value={form.description} onChange={handleChange} />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Lien HelloAsso</FormLabel>
              <Input name="helloAssoUrl" value={form.helloAssoUrl} onChange={handleChange} type="url" />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Véhicule participant</FormLabel>
              <Select name="vehicleId" value={form.vehicleId} onChange={handleChange}>
                {vehiclesList.map(vehicle => (
                  <option key={vehicle.id} value={vehicle.id}>{vehicle.name}</option>
                ))}
              </Select>
            </FormControl>
            <Button colorScheme="blue" type="submit" mt={4}>
              {selectedId ? "Enregistrer les modifications" : "Créer l'événement"}
            </Button>
          </VStack>
        </Box>
      )}

      {/* Visualisation individuelle */}
      {!isEditing && selectedId && (
        <Box p={6} borderWidth="1px" borderRadius="lg" bg="white" mt={8}>
          <Heading size="md" mb={4}>{form.title}</Heading>
          <Text><strong>Date :</strong> {form.date} à {form.time}</Text>
          <Text><strong>Lieu :</strong> {form.location}</Text>
          <Text><strong>Tarif adulte :</strong> {form.adultPrice}€</Text>
          <Text><strong>Tarif enfant :</strong> {form.childPrice}€</Text>
          <Text><strong>Description :</strong> {form.description}</Text>
          <Text mt={2}><strong>Lien HelloAsso :</strong> <a href={form.helloAssoUrl} target="_blank" rel="noopener noreferrer">{form.helloAssoUrl}</a></Text>
          <Text mt={2}><strong>Véhicule participant :</strong> {selectedVehicle?.name}</Text>
        </Box>
      )}
    </Container>
  );
}