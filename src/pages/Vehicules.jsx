// src/pages/Vehicules.jsx
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Box, Heading, Input, SimpleGrid, Card, CardHeader, CardBody,
  Text, Badge, HStack, Spinner, Center, Button, Flex, useToast,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody,
  Image, VStack
} from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { FiEdit, FiPlus, FiGrid } from 'react-icons/fi';
import { apiClient } from '../api/config'; // Import du client API avec authentification

const PUBLIC_BASE = import.meta.env.VITE_PUBLIC_BASE || window.location.origin;

const Vehicules = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const toast = useToast();
  const qrCanvasRef = useRef(null);

  const fetchList = useCallback(async (signal) => {
    try {
      setLoading(true);
      let vehicles;
      if (q.trim()) {
        // Pour la recherche, utiliser apiClient.get avec paramètres
        vehicles = await apiClient.get(`/vehicles?q=${encodeURIComponent(q.trim())}`);
      } else {
        // Pour la liste complète
        vehicles = await apiClient.get('/vehicles');
      }
      setData(Array.isArray(vehicles) ? vehicles : []);
    } catch (e) {
      if (e.name !== "AbortError") {
        console.error(e);
        setData([]);
        toast({ status: "error", title: "Impossible de charger la liste" });
      }
    } finally {
      setLoading(false);
    }
  }, [q, toast]);

  useEffect(() => {
    const controller = new AbortController();
    fetchList(controller.signal);
    return () => controller.abort();
  }, [fetchList]);

  const openQrModal = (vehicle) => {
    setSelectedVehicle(vehicle);
    setQrModalOpen(true);
  };

  const closeQrModal = () => {
    setQrModalOpen(false);
    setSelectedVehicle(null);
  };

  const downloadQr = () => {
    if (!qrCanvasRef.current) return;
    const canvas = qrCanvasRef.current.querySelector('canvas');
    if (!canvas) return;
    
    const link = document.createElement('a');
    link.download = `qr-${selectedVehicle?.parc || 'vehicle'}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <Box p={6}>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg">Gestion des Véhicules</Heading>
        <Button 
          as={RouterLink} 
          to="/dashboard/vehicules/nouveau" 
          leftIcon={<FiPlus />} 
          colorScheme="blue"
        >
          Nouveau Véhicule
        </Button>
      </Flex>

      <Box mb={6}>
        <Input
          placeholder="Rechercher par parc, modèle, marque..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          size="lg"
        />
      </Box>

      {loading ? (
        <Center py={10}>
          <Spinner size="xl" />
        </Center>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
          {data.map((vehicle) => (
            <Card key={vehicle.parc} shadow="md" borderRadius="lg">
              <CardHeader pb={2}>
                <HStack justify="space-between">
                  <Text fontWeight="bold" fontSize="lg">{vehicle.parc}</Text>
                  <Badge 
                    colorScheme={
                      vehicle.etat === 'disponible' ? 'green' :
                      vehicle.etat === 'en_panne' ? 'red' :
                      vehicle.etat === 'maintenance' ? 'orange' : 'gray'
                    }
                  >
                    {vehicle.etat}
                  </Badge>
                </HStack>
              </CardHeader>
              
              <CardBody pt={0}>
                <VStack align="start" spacing={2}>
                  <Text><strong>{vehicle.marque} {vehicle.modele}</strong></Text>
                  {vehicle.subtitle && <Text fontSize="sm" color="gray.600">{vehicle.subtitle}</Text>}
                  {vehicle.immat && <Text fontSize="sm">Immat: {vehicle.immat}</Text>}
                  <Text fontSize="sm">Type: {vehicle.type}</Text>
                  
                  <HStack spacing={2} pt={2}>
                    <Button 
                      as={RouterLink} 
                      to={`/dashboard/vehicules/${vehicle.parc}`}
                      size="sm" 
                      leftIcon={<FiEdit />}
                      colorScheme="blue"
                      variant="outline"
                    >
                      Gérer
                    </Button>
                    <Button 
                      size="sm" 
                      leftIcon={<FiGrid />}
                      colorScheme="purple"
                      variant="outline"
                      onClick={() => openQrModal(vehicle)}
                    >
                      QR Code
                    </Button>
                  </HStack>
                </VStack>
              </CardBody>
            </Card>
          ))}
        </SimpleGrid>
      )}

      {data.length === 0 && !loading && (
        <Center py={10}>
          <VStack>
            <Text fontSize="lg" color="gray.500">Aucun véhicule trouvé</Text>
            {q && (
              <Button onClick={() => setQ("")} size="sm">
                Effacer la recherche
              </Button>
            )}
          </VStack>
        </Center>
      )}

      {/* Modal QR Code */}
      <Modal isOpen={qrModalOpen} onClose={closeQrModal} size="sm">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>QR Code - {selectedVehicle?.parc}</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4}>
              <Box ref={qrCanvasRef}>
                {selectedVehicle && (
                  <QRCodeCanvas
                    value={`${PUBLIC_BASE}/vehicule/${selectedVehicle.parc}`}
                    size={200}
                    level="M"
                    includeMargin={true}
                  />
                )}
              </Box>
              <Text fontSize="sm" textAlign="center" color="gray.600">
                {PUBLIC_BASE}/vehicule/{selectedVehicle?.parc}
              </Text>
              <Button onClick={downloadQr} colorScheme="blue" size="sm">
                Télécharger QR Code
              </Button>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default Vehicules;
