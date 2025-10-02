import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Box, Button, FormControl, FormLabel, Heading, Input, Select, Textarea,
  VStack, HStack, SimpleGrid, useToast, Text, Divider,
  Spinner, Center, Flex, Image, IconButton, useDisclosure,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton,
  Badge, Collapse
} from "@chakra-ui/react";
import { useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiExternalLink, FiSave, FiUpload, FiTarget, FiChevronDown, FiChevronUp, FiTrash2 } from 'react-icons/fi';
import { apiClient } from '../api/config';
import GalleryManager from '../components/vehicle/GalleryManager.jsx';

const PUBLIC_BASE = import.meta.env.VITE_PUBLIC_BASE || window.location.origin;

function EtatBadge({ etat }) {
  const colorMap = {
    "disponible": "green",
    "en_panne": "red", 
    "maintenance": "orange",
    "Service": "green",
    "Préservé": "blue",
    "A VENIR": "gray",
    "Restauration": "orange"
  };
  return <Badge colorScheme={colorMap[etat] || "purple"}>{etat}</Badge>;
}

// Composant pour gérer l'image de fond et sa position
function BackgroundImageManager({ vehicle, parc, onChange, authHeader }) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const fileInputRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [clickPosition, setClickPosition] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const toast = useToast();

  const uploadBackground = async (file) => {
    if (!file) return;
    setUploading(true);
    
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch(`${apiClient.baseURL}/vehicles/${parc}/background`, {
        method: 'POST',
        headers: { 'Authorization': authHeader },
        body: formData
      });

      if (!response.ok) throw new Error('Upload failed');
      const result = await response.json();
      
      toast({ status: 'success', title: 'Image de fond mise à jour' });
      onChange && onChange();
    } catch (error) {
      console.error('Upload error:', error);
      toast({ status: 'error', title: 'Erreur upload', description: error.message });
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadBackground(file);
    }
  };

  const handleImageClick = (event) => {
    const rect = event.target.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    
    setClickPosition({ x, y });
    
    // Sauvegarder automatiquement la position
    setTimeout(() => {
      onChange && onChange();
      toast({ status: 'info', title: 'Position focale mise à jour' });
    }, 100);
  };

  const backgroundImage = vehicle?.backgroundImage ? 
    `${apiClient.baseURL}${vehicle.backgroundImage}` : null;
  const backgroundPosition = vehicle?.backgroundPosition || 'center center';

  return (
    <VStack align="stretch" spacing={3}>
      <HStack justify="space-between">
        <Text fontWeight="bold">Image de fond</Text>
        <Button size="sm" leftIcon={<FiChevronDown />} onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? 'Réduire' : 'Configurer'}
        </Button>
      </HStack>

      <Collapse in={isExpanded}>
        <VStack spacing={4} p={4} bg="gray.50" borderRadius="md">
          <HStack spacing={3}>
            <Button
              leftIcon={<FiUpload />}
              onClick={() => fileInputRef.current?.click()}
              isLoading={uploading}
              size="sm"
            >
              Changer l'image
            </Button>
            
            {backgroundImage && (
              <Button
                leftIcon={<FiTarget />}
                onClick={onOpen}
                size="sm"
                variant="outline"
              >
                Régler position
              </Button>
            )}
          </HStack>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />

          {backgroundImage && (
            <Image
              src={backgroundImage}
              alt="Aperçu fond"
              maxH="200px"
              borderRadius="md"
              objectFit="cover"
            />
          )}
        </VStack>
      </Collapse>

      {/* Modal pour régler la position */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Régler le point focal</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4}>
              <Text fontSize="sm" color="gray.600">
                Cliquez sur l'image pour définir le point focal qui sera visible sur la page publique
              </Text>
              
              {backgroundImage && (
                <Box position="relative" borderRadius="md" overflow="hidden">
                  <Image
                    src={backgroundImage}
                    alt="Réglage position focale"
                    w="100%"
                    h="400px"
                    objectFit="cover"
                    cursor="crosshair"
                    onClick={handleImageClick}
                  />
                  
                  {clickPosition && (
                    <Box
                      position="absolute"
                      left={`${clickPosition.x}%`}
                      top={`${clickPosition.y}%`}
                      transform="translate(-50%, -50%)"
                      w="20px"
                      h="20px"
                      borderRadius="50%"
                      bg="red.500"
                      border="2px solid white"
                      boxShadow="0 0 0 2px red.500"
                      zIndex={1}
                    />
                  )}
                </Box>
              )}
              
              <Text fontSize="sm" color="gray.500" mb={4}>
                📍 Position actuelle : {backgroundPosition}
              </Text>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </VStack>
  );
}

export default function VehiculeShow() {
  const { parc } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vehicle, setVehicle] = useState(null);
  const [basicInfo, setBasicInfo] = useState({});
  const [usages, setUsages] = useState([]);
  const [reports, setReports] = useState([]);
  const [newUsage, setNewUsage] = useState({});
  const [newReport, setNewReport] = useState({});

  const loadAll = useCallback(async () => {
    if (!parc) return;
    setLoading(true);
    try {
      const vReq = apiClient.get(`/vehicles/${parc}`);
      const uReq = apiClient.get(`/vehicles/${parc}/usages`);
      const rReq = apiClient.get(`/vehicles/${parc}/reports`);
      const [v, u, r] = await Promise.allSettled([vReq, uReq, rReq]);
      if (v.status === 'fulfilled') {
        setVehicle(v.value);
        setBasicInfo(v.value);
      } else throw new Error('Véhicule introuvable');
      if (u.status === 'fulfilled') setUsages(u.value);
      if (r.status === 'fulfilled') setReports(r.value);
    } catch (e) {
      toast({ status: 'error', title: e.message || 'Erreur chargement' });
      navigate('/dashboard/vehicules');
    } finally {
      setLoading(false);
    }
  }, [parc, toast, navigate]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const save = async () => {
    try {
      setSaving(true);
      await apiClient.put(`/vehicles/${parc}`, basicInfo);
      setVehicle({ ...vehicle, ...basicInfo });
      toast({ status: 'success', title: 'Véhicule mis à jour' });
    } catch (error) {
      toast({ status: 'error', title: 'Erreur sauvegarde' });
    } finally {
      setSaving(false);
    }
  };

  const addUsage = async () => {
    if (!newUsage.date || !newUsage.kilometres) return;
    try {
      await apiClient.post(`/vehicles/${parc}/usages`, newUsage);
      toast({ status: 'success', title: 'Usage ajouté' });
      setNewUsage({});
      loadAll();
    } catch (error) {
      toast({ status: 'error', title: 'Erreur ajout usage' });
    }
  };

  const addReport = async () => {
    if (!newReport.title || !newReport.description) return;
    try {
      await apiClient.post(`/vehicles/${parc}/reports`, newReport);
      toast({ status: 'success', title: 'Rapport ajouté' });
      setNewReport({});
      loadAll();
    } catch (error) {
      toast({ status: 'error', title: 'Erreur ajout rapport' });
    }
  };

  if (loading) {
    return (
      <Center h="400px">
        <Spinner size="xl" />
      </Center>
    );
  }

  if (!vehicle) {
    return (
      <Center h="400px">
        <Text>Véhicule non trouvé</Text>
      </Center>
    );
  }

  return (
    <Box p={6} maxW="1200px" mx="auto">
      {/* Header */}
      <Flex align="center" justify="space-between" mb={6}>
        <HStack>
          <IconButton
            icon={<FiArrowLeft />}
            onClick={() => navigate('/dashboard/vehicules')}
            variant="ghost"
          />
          <VStack align="start" spacing={0}>
            <Heading size="lg">Parc {vehicle.parc}</Heading>
            <Text color="gray.600">{vehicle.type} • {vehicle.modele}</Text>
          </VStack>
        </HStack>
        
        <HStack>
          <EtatBadge etat={vehicle.etat} />
          <Button
            leftIcon={<FiExternalLink />}
            size="sm"
            variant="outline"
            onClick={() => window.open(`${PUBLIC_BASE}/vehicles/${parc}`, '_blank')}
          >
            Voir public
          </Button>
          <Button
            leftIcon={<FiSave />}
            colorScheme="blue"
            onClick={save}
            isLoading={saving}
          >
            Sauvegarder
          </Button>
        </HStack>
      </Flex>

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={8}>
        {/* SECTION CONSOLIDÉE - Toutes les informations */}
        <VStack align="stretch" spacing={6}>
          <Box bg="white" p={6} borderRadius="lg" shadow="sm" border="1px" borderColor="gray.200">
            <Heading size="md" mb={4}>📋 Informations complètes</Heading>
            
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              {/* Informations de base */}
              <FormControl>
                <FormLabel>Marque</FormLabel>
                <Input
                  value={basicInfo.marque || ''}
                  onChange={(e) => setBasicInfo({...basicInfo, marque: e.target.value})}
                />
              </FormControl>
              
              <FormControl>
                <FormLabel>Modèle</FormLabel>
                <Input
                  value={basicInfo.modele || ''}
                  onChange={(e) => setBasicInfo({...basicInfo, modele: e.target.value})}
                />
              </FormControl>
              
              <FormControl>
                <FormLabel>Sous-titre</FormLabel>
                <Input
                  value={basicInfo.subtitle || ''}
                  onChange={(e) => setBasicInfo({...basicInfo, subtitle: e.target.value})}
                  placeholder="Ex: Citaro 1 | € II | ❄️ | ♿"
                />
              </FormControl>
              
              <FormControl>
                <FormLabel>Type</FormLabel>
                <Select
                  value={basicInfo.type || ''}
                  onChange={(e) => setBasicInfo({...basicInfo, type: e.target.value})}
                >
                  <option value="">Sélectionner</option>
                  <option value="Bus">Bus</option>
                  <option value="Car">Car</option>
                  <option value="Tramway">Tramway</option>
                  <option value="Métro">Métro</option>
                </Select>
              </FormControl>
              
              <FormControl>
                <FormLabel>Immatriculation</FormLabel>
                <Input
                  value={basicInfo.immat || ''}
                  onChange={(e) => setBasicInfo({...basicInfo, immat: e.target.value})}
                />
              </FormControl>
              
              <FormControl>
                <FormLabel>État</FormLabel>
                <Select
                  value={basicInfo.etat || ''}
                  onChange={(e) => setBasicInfo({...basicInfo, etat: e.target.value})}
                >
                  <option value="">Sélectionner</option>
                  <option value="Service">En service</option>
                  <option value="Préservé">Préservé</option>
                  <option value="Restauration">En restauration</option>
                  <option value="A VENIR">À venir</option>
                  <option value="disponible">Disponible</option>
                  <option value="en_panne">En panne</option>
                  <option value="maintenance">Maintenance</option>
                </Select>
              </FormControl>
              
              <FormControl>
                <FormLabel>Énergie</FormLabel>
                <Select
                  value={basicInfo.energie || ''}
                  onChange={(e) => setBasicInfo({...basicInfo, energie: e.target.value})}
                >
                  <option value="">Sélectionner</option>
                  <option value="Diesel">Diesel</option>
                  <option value="Essence">Essence</option>
                  <option value="Électrique">Électrique</option>
                  <option value="Hybride">Hybride</option>
                  <option value="GNV">GNV</option>
                </Select>
              </FormControl>
              
              <FormControl>
                <FormLabel>Mise en circulation</FormLabel>
                <Input
                  type="date"
                  value={basicInfo.miseEnCirculation ? basicInfo.miseEnCirculation.split('T')[0] : ''}
                  onChange={(e) => setBasicInfo({...basicInfo, miseEnCirculation: e.target.value})}
                />
              </FormControl>

              {/* NOUVEAUX CHAMPS - Caractéristiques spécifiques */}
              <FormControl>
                <FormLabel>Année de construction</FormLabel>
                <Input
                  value={basicInfo.anneeConstruction || ''}
                  onChange={(e) => setBasicInfo({...basicInfo, anneeConstruction: e.target.value})}
                  placeholder="Ex: 2001"
                />
              </FormControl>
              
              <FormControl>
                <FormLabel>Constructeur carrosserie</FormLabel>
                <Input
                  value={basicInfo.constructeurCarrosserie || ''}
                  onChange={(e) => setBasicInfo({...basicInfo, constructeurCarrosserie: e.target.value})}
                  placeholder="Ex: EvoBus"
                />
              </FormControl>
              
              <FormControl>
                <FormLabel>Numéro de flotte</FormLabel>
                <Input
                  value={basicInfo.numeroFlotte || ''}
                  onChange={(e) => setBasicInfo({...basicInfo, numeroFlotte: e.target.value})}
                  placeholder="Ex: 920"
                />
              </FormControl>
              
              <FormControl>
                <FormLabel>Ancien numéro</FormLabel>
                <Input
                  value={basicInfo.ancienNumero || ''}
                  onChange={(e) => setBasicInfo({...basicInfo, ancienNumero: e.target.value})}
                  placeholder="Ex: 3920"
                />
              </FormControl>
              
              <FormControl>
                <FormLabel>Longueur</FormLabel>
                <Input
                  value={basicInfo.longueur || ''}
                  onChange={(e) => setBasicInfo({...basicInfo, longueur: e.target.value})}
                  placeholder="Ex: 12m"
                />
              </FormControl>
              
              <FormControl>
                <FormLabel>Largeur</FormLabel>
                <Input
                  value={basicInfo.largeur || ''}
                  onChange={(e) => setBasicInfo({...basicInfo, largeur: e.target.value})}
                  placeholder="Ex: 2,55m"
                />
              </FormControl>
              
              <FormControl>
                <FormLabel>Hauteur</FormLabel>
                <Input
                  value={basicInfo.hauteur || ''}
                  onChange={(e) => setBasicInfo({...basicInfo, hauteur: e.target.value})}
                  placeholder="Ex: 3,07m"
                />
              </FormControl>
              
              <FormControl>
                <FormLabel>Nombre de places</FormLabel>
                <Input
                  value={basicInfo.nombrePlaces || ''}
                  onChange={(e) => setBasicInfo({...basicInfo, nombrePlaces: e.target.value})}
                  placeholder="Ex: 109"
                />
              </FormControl>
              
              <FormControl>
                <FormLabel>Places assises</FormLabel>
                <Input
                  value={basicInfo.placesAssises || ''}
                  onChange={(e) => setBasicInfo({...basicInfo, placesAssises: e.target.value})}
                  placeholder="Ex: 43"
                />
              </FormControl>
              
              <FormControl>
                <FormLabel>Motorisation</FormLabel>
                <Input
                  value={basicInfo.motorisation || ''}
                  onChange={(e) => setBasicInfo({...basicInfo, motorisation: e.target.value})}
                  placeholder="Ex: Mercedes OM906hLA"
                />
              </FormControl>
              
              <FormControl>
                <FormLabel>Puissance</FormLabel>
                <Input
                  value={basicInfo.puissance || ''}
                  onChange={(e) => setBasicInfo({...basicInfo, puissance: e.target.value})}
                  placeholder="Ex: 260 Ch"
                />
              </FormControl>
              
              <FormControl>
                <FormLabel>Norme Euro</FormLabel>
                <Input
                  value={basicInfo.normeEuro || ''}
                  onChange={(e) => setBasicInfo({...basicInfo, normeEuro: e.target.value})}
                  placeholder="Ex: Euro II"
                />
              </FormControl>
              
              <FormControl>
                <FormLabel>Boîte de vitesses</FormLabel>
                <Input
                  value={basicInfo.boiteVitesses || ''}
                  onChange={(e) => setBasicInfo({...basicInfo, boiteVitesses: e.target.value})}
                  placeholder="Ex: ZF EcoLife"
                />
              </FormControl>
              
              <FormControl>
                <FormLabel>Équipements spéciaux</FormLabel>
                <Input
                  value={basicInfo.equipementsSpeciaux || ''}
                  onChange={(e) => setBasicInfo({...basicInfo, equipementsSpeciaux: e.target.value})}
                  placeholder="Ex: Climatisation, Accessibilité PMR"
                />
              </FormControl>
            </SimpleGrid>

            <Divider my={6} />
            
            {/* Description et Histoire */}
            <SimpleGrid columns={1} spacing={4}>
              <FormControl>
                <FormLabel>Description</FormLabel>
                <Textarea
                  value={basicInfo.description || ''}
                  onChange={(e) => setBasicInfo({...basicInfo, description: e.target.value})}
                  placeholder="Description du véhicule..."
                  rows={4}
                />
              </FormControl>
              
              <FormControl>
                <FormLabel>Histoire</FormLabel>
                <Textarea
                  value={basicInfo.histoire || ''}
                  onChange={(e) => setBasicInfo({...basicInfo, histoire: e.target.value})}
                  placeholder="Histoire et informations historiques du véhicule..."
                  rows={6}
                />
              </FormControl>
            </SimpleGrid>
          </Box>

          {/* Configuration image de fond */}
          <Box bg="white" p={6} borderRadius="lg" shadow="sm" border="1px" borderColor="gray.200">
            <BackgroundImageManager 
              vehicle={vehicle}
              parc={parc}
              onChange={loadAll}
              authHeader={`Bearer ${localStorage.getItem('token')}`}
            />
          </Box>
        </VStack>

        {/* COLONNE DROITE - Galerie et Actions */}
        <VStack align="stretch" spacing={6}>
          {/* Galerie */}
          <Box bg="white" p={6} borderRadius="lg" shadow="sm" border="1px" borderColor="gray.200">
            <Heading size="md" mb={4}>🖼️ Galerie</Heading>
            <GalleryManager vehicle={vehicle} onUpdate={loadAll} />
          </Box>

          {/* Usages récents */}
          <Box bg="white" p={6} borderRadius="lg" shadow="sm" border="1px" borderColor="gray.200">
            <Heading size="md" mb={4}>📊 Usages récents</Heading>
            
            <VStack spacing={3} align="stretch">
              {usages.slice(0, 5).map((usage, i) => (
                <Box key={i} p={3} bg="gray.50" borderRadius="md">
                  <HStack justify="space-between">
                    <Text fontWeight="bold">{new Date(usage.date).toLocaleDateString()}</Text>
                    <Badge>{usage.kilometres} km</Badge>
                  </HStack>
                  {usage.trajet && <Text fontSize="sm" color="gray.600">{usage.trajet}</Text>}
                </Box>
              ))}
            </VStack>

            <Divider my={4} />
            
            <VStack spacing={3}>
              <HStack w="100%">
                <Input
                  type="date"
                  value={newUsage.date || ''}
                  onChange={(e) => setNewUsage({...newUsage, date: e.target.value})}
                />
                <Input
                  type="number"
                  placeholder="Kilomètres"
                  value={newUsage.kilometres || ''}
                  onChange={(e) => setNewUsage({...newUsage, kilometres: e.target.value})}
                />
              </HStack>
              <Input
                placeholder="Trajet (optionnel)"
                value={newUsage.trajet || ''}
                onChange={(e) => setNewUsage({...newUsage, trajet: e.target.value})}
              />
              <Button onClick={addUsage} colorScheme="blue" size="sm" w="100%">
                Ajouter usage
              </Button>
            </VStack>
          </Box>

          {/* Rapports de maintenance */}
          <Box bg="white" p={6} borderRadius="lg" shadow="sm" border="1px" borderColor="gray.200">
            <Heading size="md" mb={4}>🔧 Maintenance</Heading>
            
            <VStack spacing={3} align="stretch">
              {reports.slice(0, 3).map((report, i) => (
                <Box key={i} p={3} bg="gray.50" borderRadius="md">
                  <Text fontWeight="bold">{report.title}</Text>
                  <Text fontSize="sm" color="gray.600">{report.description}</Text>
                  <Text fontSize="xs" color="gray.500">
                    {new Date(report.createdAt).toLocaleDateString()}
                  </Text>
                </Box>
              ))}
            </VStack>

            <Divider my={4} />
            
            <VStack spacing={3}>
              <Input
                placeholder="Titre du rapport"
                value={newReport.title || ''}
                onChange={(e) => setNewReport({...newReport, title: e.target.value})}
              />
              <Textarea
                placeholder="Description"
                value={newReport.description || ''}
                onChange={(e) => setNewReport({...newReport, description: e.target.value})}
                rows={3}
              />
              <Button onClick={addReport} colorScheme="green" size="sm" w="100%">
                Ajouter rapport
              </Button>
            </VStack>
          </Box>
        </VStack>
      </SimpleGrid>
    </Box>
  );
}