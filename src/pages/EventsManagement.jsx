import React, { useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Container, VStack, HStack, Heading, Text, Button, Card, CardBody, CardHeader,
  Table, Thead, Tbody, Tr, Th, Td, Badge, IconButton, Tooltip, Spinner, Center,
  SimpleGrid, Stat, StatLabel, StatNumber, Input, InputGroup, InputLeftElement,
  Select, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
  ModalCloseButton, Tabs, TabList, Tab, TabPanels, TabPanel, FormControl, FormLabel,
  useDisclosure, useToast, Box, Progress, NumberInput, NumberInputField, NumberInputStepper,
  NumberIncrementStepper, NumberDecrementStepper, Code, Divider
} from "@chakra-ui/react";
import {
  FiEye, FiEdit, FiDownload, FiPlus, FiRefreshCw, FiSearch, FiMapPin,
  FiTruck, FiUsers, FiTrash2, FiSave
} from "react-icons/fi";
import { eventsAPI } from "../api/events";
// NOTE: On supprime les dépendances non utilisées (membersAPI, RouteMapManager) pour concision

const getStatusBadge = (status) => {
  const map = {
    DRAFT: { cs: "gray", label: "Brouillon" },
    PUBLISHED: { cs: "green", label: "Publié" },
    ARCHIVED: { cs: "orange", label: "Archivé" },
  };
  const cfg = map[status] ?? map.DRAFT;
  return <Badge colorScheme={cfg.cs}>{cfg.label}</Badge>;
};

const formatDate = (d) => {
  if (!d) return "Date non définie";
  try {
    return new Date(d).toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return "Date invalide";
  }
};

export default function EventsManagement() {
  const toast = useToast();

  // Base
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");

  // Détail
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [fin, setFin] = useState({ revenue: 0, expenses: 0, profit: 0, capacity: 0, occupancy: 0, rate: 0, breakdown: null });

  // HelloAsso (simple)
  const [ha, setHa] = useState({ url: "", org: "", event: "" });

  const { isOpen: isDetailOpen, onOpen: onDetailOpen, onClose: onDetailClose } = useDisclosure();
  const [saving, setSaving] = useState(false);

  // Fetch
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await eventsAPI.getAll();
        setEvents(Array.isArray(data) ? data : []);
      } catch (e) {
        toast({ status: "error", title: "Erreur", description: "Impossible de charger les événements" });
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  // Filtres / recherche
  const filtered = useMemo(() => {
    const t = searchTerm.trim().toLowerCase();
    return (events || []).filter((e) => {
      const mSearch =
        e.title?.toLowerCase().includes(t) ||
        e.location?.toLowerCase().includes(t);
      const mStatus = filterStatus === "ALL" || e.status === filterStatus;
      return mSearch && mStatus;
    });
  }, [events, searchTerm, filterStatus]);

  // Stats (simples)
  const stats = useMemo(() => {
    const total = events.length;
    const published = events.filter(e => e.status === "PUBLISHED").length;
    const upcoming = events.filter(e => e.status === "PUBLISHED" && new Date(e.date) > new Date()).length;
    return { total, published, upcoming, totalParticipants: 0, totalRevenue: 0 };
  }, [events]);

  // Ouvrir la gestion
  const openEvent = (e) => {
    setSelectedEvent(e);
    // Valeurs par défaut
    setParticipants([]);
    setRoutes([{
      id: 1,
      name: "Trajet principal",
      vehicle: e.vehicleId || "Bus",
      capacity: 45,
      stops: [
        { name: "Départ", time: "09:00", address: "—" },
        { name: e.location || "Arrivée", time: "10:00", address: e.location || "—" },
      ],
    }]);
    setHa({
      url: e.helloAssoUrl || "",
      org: e.helloAssoOrg || "",
      event: e.helloAssoEvent || "",
    });
    onDetailOpen();
  };

  // Participants
  const addParticipant = (p) => {
    if (!p?.name || !p?.email) {
      toast({ status: "warning", title: "Nom et email requis" });
      return;
    }
    // Capacité
    const totalCap = routes.reduce((s, r) => s + (r.capacity || 0), 0);
    const confirmed = participants.filter(x => x.status === "confirmed").length;
    if (p.status === "confirmed" && confirmed >= totalCap) {
      toast({ status: "error", title: "Capacité atteinte" });
      return;
    }
    setParticipants(prev => [...prev, { id: Date.now(), type: "adult", status: "pending", ...p }]);
  };

  const updateParticipant = (id, updates) => {
    setParticipants(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const deleteParticipant = (id) => setParticipants(prev => prev.filter(p => p.id !== id));

  // Trajets
  const addRoute = () => {
    setRoutes(prev => [...prev, { id: Date.now(), name: "Nouveau trajet", vehicle: "", capacity: 0, stops: [] }]);
  };

  const updateRouteCapacity = (id, v) => {
    const cap = parseInt(v || 0, 10);
    setRoutes(prev => prev.map(r => r.id === id ? { ...r, capacity: cap } : r));
  };

  // Finances (simple mais robuste)
  const recalc = useMemo(() => {
    if (!selectedEvent) return null;
    const adultPrice = parseFloat(selectedEvent.adultPrice || 0);
    const childPrice = parseFloat(selectedEvent.childPrice || 0);
    const confirmed = participants.filter(p => p.status === "confirmed");
    const adultCount = confirmed.filter(p => p.type === "adult").length;
    const childCount = confirmed.filter(p => p.type === "child").length;
    const revenue = Math.round(adultCount * adultPrice + childCount * childPrice);
    const capacity = routes.reduce((s, r) => s + (r.capacity || 0), 0);
    const occupancy = confirmed.length;
    const rate = capacity > 0 ? Math.round((occupancy / capacity) * 100) : 0;

    // Dépenses: base 25% revenus + 2€ / place + 3€ / participant
    const expenses = Math.round(revenue * 0.25 + capacity * 2 + occupancy * 3);
    const profit = revenue - expenses;

    return {
      revenue, expenses, profit, capacity, occupancy, rate,
      breakdown: {
        adult: { price: adultPrice, count: adultCount, total: adultPrice * adultCount },
        child: { price: childPrice, count: childCount, total: childPrice * childCount },
        expenseLines: [
          { label: "Base (25%)", amount: Math.round(revenue * 0.25) },
          { label: `Capacité (${capacity})`, amount: Math.round(capacity * 2) },
          { label: `Participants (${occupancy})`, amount: Math.round(occupancy * 3) },
        ],
      },
    };
  }, [selectedEvent, participants, routes]);

  useEffect(() => {
    if (recalc) setFin(recalc);
  }, [recalc]);

  // Save (mock)
  const saveChanges = async () => {
    setSaving(true);
    try {
      // await eventsAPI.update(selectedEvent.id, {...});
      toast({ status: "success", title: "Modifications sauvegardées" });
    } catch {
      toast({ status: "error", title: "Erreur de sauvegarde" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Container maxW="7xl" py={6}>
      {/* Header + stats */}
      <VStack align="start" spacing={6} mb={8}>
        <HStack w="100%" justify="space-between">
          <VStack align="start" spacing={1}>
            <Heading size="lg">📊 Gestion des Événements</Heading>
            <Text color="gray.600">Administration des événements, participants et finances</Text>
          </VStack>
          <HStack>
            <Button as={RouterLink} to="/dashboard/evenements" leftIcon={<FiPlus />} colorScheme="blue" variant="outline">
              Créer un événement
            </Button>
            <Button leftIcon={<FiRefreshCw />} onClick={() => window.location.reload()} variant="outline">
              Actualiser
            </Button>
          </HStack>
        </HStack>

        <SimpleGrid columns={{ base: 2, md: 5 }} spacing={4} w="100%">
          <Card><CardBody><Stat><StatLabel>Total</StatLabel><StatNumber color="blue.500">{stats.total}</StatNumber></Stat></CardBody></Card>
          <Card><CardBody><Stat><StatLabel>Publiés</StatLabel><StatNumber color="green.500">{stats.published}</StatNumber></Stat></CardBody></Card>
          <Card><CardBody><Stat><StatLabel>À venir</StatLabel><StatNumber color="orange.500">{stats.upcoming}</StatNumber></Stat></CardBody></Card>
          <Card><CardBody><Stat><StatLabel>Participants</StatLabel><StatNumber color="purple.500">{stats.totalParticipants}</StatNumber></Stat></CardBody></Card>
          <Card><CardBody><Stat><StatLabel>Revenus</StatLabel><StatNumber color="green.600">{stats.totalRevenue}€</StatNumber></Stat></CardBody></Card>
        </SimpleGrid>
      </VStack>

      {/* Filtres */}
      <Card mb={6}>
        <CardBody>
          <HStack spacing={4}>
            <InputGroup maxW="320px">
              <InputLeftElement pointerEvents="none"><FiSearch /></InputLeftElement>
              <Input placeholder="Rechercher un événement..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </InputGroup>
            <Select maxW="220px" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="ALL">Tous les statuts</option>
              <option value="PUBLISHED">Publiés</option>
              <option value="DRAFT">Brouillons</option>
              <option value="ARCHIVED">Archivés</option>
            </Select>
          </HStack>
        </CardBody>
      </Card>

      {/* Table */}
      {loading ? (
        <Center py={20}><Spinner size="xl" /></Center>
      ) : filtered.length === 0 ? (
        <Card><CardBody><Center py={16}>
          <VStack spacing={4}>
            <Text color="gray.500">Aucun événement trouvé</Text>
            <Button as={RouterLink} to="/dashboard/evenements" leftIcon={<FiPlus />} colorScheme="blue">Créer le premier</Button>
          </VStack>
        </Center></CardBody></Card>
      ) : (
        <Card>
          <CardBody p={0}>
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Événement</Th>
                  <Th>Date</Th>
                  <Th>Statut</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filtered.map((e) => (
                  <Tr key={e.id}>
                    <Td>
                      <VStack align="start" spacing={1}>
                        <Text fontWeight="semibold">{e.title}</Text>
                        {e.location && (
                          <HStack fontSize="sm" color="gray.600"><FiMapPin /><Text>{e.location}</Text></HStack>
                        )}
                        {e.vehicleId && (
                          <HStack fontSize="sm" color="blue.600"><FiTruck /><Text>{e.vehicleId}</Text></HStack>
                        )}
                      </VStack>
                    </Td>
                    <Td>{formatDate(e.date)}{e.time ? <Text fontSize="sm" color="gray.600">{e.time}</Text> : null}</Td>
                    <Td>{getStatusBadge(e.status)}</Td>
                    <Td>
                      <HStack spacing={1}>
                        <Tooltip label="Gestion complète">
                          <IconButton aria-label="Gérer" icon={<FiEye />} size="sm" variant="ghost" onClick={() => openEvent(e)} />
                        </Tooltip>
                        <Tooltip label="Modifier l'événement">
                          <IconButton as={RouterLink} to="/dashboard/evenements" aria-label="Modifier" icon={<FiEdit />} size="sm" variant="ghost" />
                        </Tooltip>
                        <Tooltip label="Exporter (à venir)">
                          <IconButton aria-label="Exporter" icon={<FiDownload />} size="sm" variant="ghost"
                            onClick={() => toast({ status: "info", title: "Bientôt disponible" })} />
                        </Tooltip>
                      </HStack>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </CardBody>
        </Card>
      )}

      {/* Modal détail */}
      <Modal isOpen={isDetailOpen} onClose={onDetailClose} size="6xl">
        <ModalOverlay />
        <ModalContent maxH="90vh">
          <ModalHeader>
            <HStack><FiEye /><Text ml={2}>Gestion : {selectedEvent?.title}</Text></HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody overflow="auto">
            <Tabs>
              <TabList>
                <Tab>👥 Participants</Tab>
                <Tab>🗺️ Trajets</Tab>
                <Tab>💰 Finances</Tab>
                <Tab>🎟️ HelloAsso</Tab>
              </TabList>

              <TabPanels>
                {/* Participants */}
                <TabPanel>
                  <VStack align="stretch" spacing={4}>
                    <HStack justify="space-between">
                      <Heading size="md">Participants ({participants.length})</Heading>
                      <Button leftIcon={<FiPlus />} colorScheme="blue" size="sm"
                        onClick={() =>
                          addParticipant({ name: "Nouveau participant", email: `user${Date.now()}@mail.com`, type: "adult", status: "pending" })
                        }>
                        Ajouter vite (démo)
                      </Button>
                    </HStack>

                    {participants.length === 0 ? (
                      <Center py={8}><Text color="gray.500">Aucun participant</Text></Center>
                    ) : (
                      <Table size="sm" variant="simple">
                        <Thead>
                          <Tr>
                            <Th>Nom</Th>
                            <Th>Email</Th>
                            <Th>Type</Th>
                            <Th>Statut</Th>
                            <Th></Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {participants.map((p) => (
                            <Tr key={p.id}>
                              <Td fontWeight="bold">{p.name}</Td>
                              <Td>{p.email}</Td>
                              <Td>
                                <Select size="sm" value={p.type} onChange={(e) => updateParticipant(p.id, { type: e.target.value })}>
                                  <option value="adult">Adulte</option>
                                  <option value="child">Enfant</option>
                                </Select>
                              </Td>
                              <Td>
                                <Select size="sm" value={p.status} onChange={(e) => updateParticipant(p.id, { status: e.target.value })}>
                                  <option value="pending">En attente</option>
                                  <option value="confirmed">Confirmé</option>
                                  <option value="cancelled">Annulé</option>
                                </Select>
                              </Td>
                              <Td isNumeric>
                                <IconButton aria-label="Supprimer" icon={<FiTrash2 />} size="sm" variant="ghost" colorScheme="red"
                                  onClick={() => deleteParticipant(p.id)} />
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    )}
                  </VStack>
                </TabPanel>

                {/* Trajets */}
                <TabPanel>
                  <VStack align="stretch" spacing={4}>
                    <HStack justify="space-between">
                      <Heading size="md">Trajets</Heading>
                      <Button leftIcon={<FiPlus />} size="sm" colorScheme="blue" onClick={addRoute}>Ajouter un trajet</Button>
                    </HStack>

                    <Card bg="blue.50" borderLeft="4px solid" borderLeftColor="blue.400">
                      <CardBody>
                        <HStack spacing={8}>
                          <Stat><StatLabel>Capacité totale</StatLabel><StatNumber color="blue.600">{fin.capacity} places</StatNumber></Stat>
                          <Stat><StatLabel>Confirmés</StatLabel><StatNumber color="green.600">{fin.occupancy}</StatNumber></Stat>
                          <Stat><StatLabel>Taux d'occupation</StatLabel><StatNumber color="purple.600">{fin.rate}%</StatNumber></Stat>
                        </HStack>
                      </CardBody>
                    </Card>

                    <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4}>
                      {routes.map((r) => (
                        <Card key={r.id}>
                          <CardHeader>
                            <HStack justify="space-between">
                              <Heading size="sm">{r.name}</Heading>
                              {r.vehicle && <Badge colorScheme="blue">{r.vehicle}</Badge>}
                            </HStack>
                          </CardHeader>
                          <CardBody>
                            <VStack align="stretch" spacing={3}>
                              <HStack>
                                <FiUsers />
                                <Text fontSize="sm">Capacité:</Text>
                                <NumberInput size="sm" min={0} max={200} value={r.capacity || 0}
                                  onChange={(val) => updateRouteCapacity(r.id, val)} w="90px">
                                  <NumberInputField />
                                  <NumberInputStepper>
                                    <NumberIncrementStepper />
                                    <NumberDecrementStepper />
                                  </NumberInputStepper>
                                </NumberInput>
                                <Text fontSize="sm" color="gray.600">places</Text>
                              </HStack>

                              <HStack spacing={3}>
                                <Text fontSize="sm" fontWeight="bold">
                                  {fin.occupancy} / {r.capacity || 0}
                                </Text>
                                <Progress
                                  value={(r.capacity || 0) > 0 ? Math.min(100, Math.round((fin.occupancy / r.capacity) * 100)) : 0}
                                  size="sm"
                                  colorScheme={(r.capacity || 0) > 0 && (fin.occupancy / (r.capacity || 1)) > 0.9 ? "red" :
                                    (r.capacity || 0) > 0 && (fin.occupancy / (r.capacity || 1)) > 0.75 ? "orange" : "green"}
                                  flex={1}
                                />
                              </HStack>

                              <Box fontSize="sm" color="gray.600">
                                {r.stops?.length ? (
                                  <ul style={{ marginLeft: "1rem" }}>
                                    {r.stops.map((s, i) => <li key={i}>{s.time ? `${s.time} — ` : ""}{s.name}</li>)}
                                  </ul>
                                ) : <Text>Aucun arrêt</Text>}
                              </Box>
                            </VStack>
                          </CardBody>
                        </Card>
                      ))}
                    </SimpleGrid>
                  </VStack>
                </TabPanel>

                {/* Finances */}
                <TabPanel>
                  <VStack align="stretch" spacing={6}>
                    <Heading size="md">Finances</Heading>
                    <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4}>
                      <Card><CardBody><Stat><StatLabel>Revenus</StatLabel><StatNumber color="green.500">{fin.revenue}€</StatNumber></Stat></CardBody></Card>
                      <Card><CardBody><Stat><StatLabel>Dépenses</StatLabel><StatNumber color="red.500">{fin.expenses}€</StatNumber></Stat></CardBody></Card>
                      <Card><CardBody><Stat><StatLabel>Bénéfice</StatLabel><StatNumber color={fin.profit >= 0 ? "green.500" : "red.500"}>{fin.profit}€</StatNumber></Stat></CardBody></Card>
                      <Card><CardBody><Stat><StatLabel>Taux d'occupation</StatLabel><StatNumber color="blue.500">{fin.rate}%</StatNumber><Text fontSize="xs" color="gray.600">{fin.occupancy} / {fin.capacity} places</Text></Stat></CardBody></Card>
                    </SimpleGrid>

                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <Card>
                        <CardHeader><Heading size="sm">Revenus</Heading></CardHeader>
                        <CardBody>
                          <VStack align="stretch" spacing={3}>
                            <HStack justify="space-between"><Text>Adulte ({fin.breakdown?.adult.count})</Text><Text fontWeight="bold">{Math.round(fin.breakdown?.adult.total || 0)}€</Text></HStack>
                            <HStack justify="space-between"><Text>Enfant ({fin.breakdown?.child.count})</Text><Text fontWeight="bold">{Math.round(fin.breakdown?.child.total || 0)}€</Text></HStack>
                            <Divider />
                            <HStack justify="space-between"><Text fontWeight="bold">Total</Text><Text fontWeight="bold" color="green.500">{fin.revenue}€</Text></HStack>
                          </VStack>
                        </CardBody>
                      </Card>
                      <Card>
                        <CardHeader><Heading size="sm">Dépenses</Heading></CardHeader>
                        <CardBody>
                          <VStack align="stretch" spacing={3}>
                            {fin.breakdown?.expenseLines?.map((l, i) => (
                              <HStack key={i} justify="space-between"><Text fontSize="sm">{l.label}</Text><Text fontWeight="bold">{l.amount}€</Text></HStack>
                            ))}
                            <Divider />
                            <HStack justify="space-between"><Text fontWeight="bold">Total</Text><Text fontWeight="bold" color="red.500">{fin.expenses}€</Text></HStack>
                          </VStack>
                        </CardBody>
                      </Card>
                    </SimpleGrid>
                  </VStack>
                </TabPanel>

                {/* HelloAsso (ultra simple) */}
                <TabPanel>
                  <VStack align="stretch" spacing={4}>
                    <Heading size="md">Configuration HelloAsso</Heading>
                    <FormControl>
                      <FormLabel>URL de l'événement</FormLabel>
                      <Input placeholder="https://www.helloasso.com/associations/.../evenements/..." value={ha.url}
                        onChange={(e) => setHa(s => ({ ...s, url: e.target.value }))} />
                      <Text fontSize="xs" color="gray.500" mt={1}>Optionnel : on peut parser plus tard</Text>
                    </FormControl>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <FormControl>
                        <FormLabel>Organisation</FormLabel>
                        <Input value={ha.org} onChange={(e) => setHa(s => ({ ...s, org: e.target.value }))} placeholder="nom-organisation" />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Événement</FormLabel>
                        <Input value={ha.event} onChange={(e) => setHa(s => ({ ...s, event: e.target.value }))} placeholder="nom-evenement" />
                      </FormControl>
                    </SimpleGrid>
                    <Button leftIcon={<FiSave />} onClick={() => toast({ status: "success", title: "Paramètres enregistrés" })} colorScheme="blue">Sauvegarder</Button>
                    <Card>
                      <CardHeader>
                        <HStack justify="space-between">
                          <Heading size="sm">Participants HelloAsso</Heading>
                          <Badge colorScheme="gray">Non synchronisé</Badge>
                        </HStack>
                      </CardHeader>
                      <CardBody>
                        <Text fontSize="sm" color="gray.600">La synchronisation sera ajoutée ultérieurement.</Text>
                        <Box mt={3}><Code fontSize="xs">org: {ha.org || "-"}</Code> — <Code fontSize="xs">event: {ha.event || "-"}</Code></Box>
                      </CardBody>
                    </Card>
                  </VStack>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onDetailClose}>Fermer</Button>
            <Button colorScheme="blue" leftIcon={<FiSave />} onClick={saveChanges} isLoading={saving}>Sauvegarder</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
}
