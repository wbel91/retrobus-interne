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
import { apiClient } from '../api/config.js';
import { useUser } from '../context/UserContext';

const PUBLIC_BASE = import.meta.env.VITE_PUBLIC_BASE || window.location.origin;

const Vehicules = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const toast = useToast();
  const qrCanvasRef = useRef(null);
  const { isAuthenticated } = useUser();

  const fetchList = useCallback(async (signal) => {
    try {
      setLoading(true);
      let vehicles;
      if (q.trim()) {
        vehicles = await apiClient.get(`/vehicles?q=${encodeURIComponent(q.trim())}`);
      } else {
        vehicles = await apiClient.get('/vehicles');
      }
      setData(Array.isArray(vehicles) ? vehicles : []);
    } catch (e) {
      if (e.name !== "AbortError") {
        console.error(e);
        setData([]);
        toast({ 
          status: "error", 
          title: "Impossible de charger la liste",
          description: e.message
        });
      }
    } finally {
      setLoading(false);
    }
  }, [q, toast]);

  useEffect(() => {
    if (!isAuthenticated) return;
    
    const controller = new AbortController();
    fetchList(controller.signal);
    return () => controller.abort();
  }, [fetchList, isAuthenticated]);

  const filtered = data.filter(v => {
    if (!q.trim()) return true;
    const needle = q.toLowerCase();
    return [v.parc, v.modele, v.marque, v.immat]
      .filter(Boolean)
      .some(field => field.toLowerCase().includes(needle));
  });

  const handleQRShow = (vehicle) => {
    setSelectedVehicle(vehicle);
    setQrModalOpen(true);
  };

  const downloadQR = () => {
    const canvas = qrCanvasRef.current?.querySelector('canvas');
    if (canvas) {
      const url = canvas.toDataURL();
      const a = document.createElement('a');
      a.href = url;
      a.download = `qr-${selectedVehicle?.parc || 'vehicle'}.png`;
      a.click();
    }
  };

  return (
    <Box p={6}>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading>Véhicules</Heading>
        <Button
          as={RouterLink}
          to="/dashboard/vehicules/nouveau"
          leftIcon={<FiPlus />}
          colorScheme="blue"
        >
          Ajouter un véhicule
        </Button>
      </Flex>

      <Box mb={6}>
        <Input
          placeholder="Rechercher par parc, modèle, marque ou immatriculation..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          maxW="400px"
        />
      </Box>

      {loading ? (
        <Center py={20}>
          <Spinner size="xl" />
        </Center>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
          {filtered.map((vehicle) => (
            <Card key={vehicle.parc} shadow="md">
              <CardHeader pb={2}>
                <HStack justify="space-between">
                  <Heading size="md">{vehicle.parc}</Heading>
                  <Badge colorScheme={vehicle.etat === 'disponible' ? 'green' : 'orange'}>
                    {vehicle.etat}
                  </Badge>
                </HStack>
              </CardHeader>
              <CardBody pt={0}>
                <VStack align="start" spacing={2}>
                  <Text><strong>Modèle:</strong> {vehicle.modele || 'Non spécifié'}</Text>
                  <Text><strong>Marque:</strong> {vehicle.marque || 'Non spécifiée'}</Text>
                  {vehicle.immat && <Text><strong>Immat:</strong> {vehicle.immat}</Text>}
                  
                  <HStack spacing={2} pt={4} w="100%">
                    <Button
                      as={RouterLink}
                      to={`/dashboard/vehicules/${vehicle.parc}`}
                      leftIcon={<FiEdit />}
                      size="sm"
                      flex={1}
                    >
                      Gérer
                    </Button>
                    <Button
                      leftIcon={<FiGrid />}
                      size="sm"
                      onClick={() => handleQRShow(vehicle)}
                    >
                      QR
                    </Button>
                  </HStack>
                </VStack>
              </CardBody>
            </Card>
          ))}
        </SimpleGrid>
      )}

      {filtered.length === 0 && !loading && (
        <Center py={20}>
          <Text color="gray.500">Aucun véhicule trouvé</Text>
        </Center>
      )}

      {/* Modal QR Code */}
      <Modal isOpen={qrModalOpen} onClose={() => setQrModalOpen(false)} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>QR Code - {selectedVehicle?.parc}</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4}>
              <Box ref={qrCanvasRef}>
                <QRCodeCanvas
                  value={`${PUBLIC_BASE}/mobile/v/${selectedVehicle?.parc}`}
                  size={200}
                  level="M"
                />
              </Box>
              <Text fontSize="sm" color="gray.600" textAlign="center">
                {`${PUBLIC_BASE}/mobile/v/${selectedVehicle?.parc}`}
              </Text>
              <Button onClick={downloadQR} colorScheme="blue">
                Télécharger
              </Button>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default Vehicules;
