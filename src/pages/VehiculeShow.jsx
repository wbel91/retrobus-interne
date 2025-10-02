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
import CaracteristiquesEditor from '../components/vehicle/CaracteristiquesEditor.jsx';

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
  const [isExpanded, setIsExpanded] = useState(false); // Repliée par défaut
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
      onChange({ backgroundImage: result.backgroundImage });
      toast({ status: 'success', title: 'Image de fond mise à jour' });
    } catch (error) {
      toast({ status: 'error', title: 'Erreur upload image de fond' });
    } finally {
      setUploading(false);
    }
  };

  const deleteBackground = async () => {
    try {
      await apiClient.put(`/vehicles/${parc}`, {
        backgroundImage: null,
        backgroundPosition: null
      });
      
      onChange({ backgroundImage: null, backgroundPosition: null });
      toast({ status: 'success', title: 'Image de fond supprimée' });
    } catch (error) {
      toast({ status: 'error', title: 'Erreur suppression image de fond' });
    }
  };

  const handleImageClick = async (event) => {
    const rect = event.target.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width * 100);
    const y = ((event.clientY - rect.top) / rect.height * 100);
    const position = `${x.toFixed(1)}% ${y.toFixed(1)}%`;
    
    setClickPosition({ x, y });

    try {
      await apiClient.put(`/vehicles/${parc}`, {
        backgroundPosition: position
      });
      
      onChange({ backgroundPosition: position });
      toast({ 
        status: 'success', 
        title: 'Position focale sauvegardée',
        description: position 
      });
    } catch (error) {
      toast({ status: 'error', title: 'Erreur sauvegarde position' });
    }
  };

  const backgroundImage = vehicle.backgroundImage || (vehicle.gallery?.[0]);
  const backgroundPosition = vehicle.backgroundPosition || 'center';

  return (
    <VStack spacing={4} align="stretch">
      {/* En-tête avec bouton de repli */}
      <HStack justify="space-between" cursor="pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <Heading size="md">🖼️ Image de fond Hero</Heading>
        <HStack spacing={2}>
          {backgroundImage && isExpanded && (
            <Button
              leftIcon={<FiTrash2 />}
              size="sm"
              colorScheme="red"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                deleteBackground();
              }}
            >
              Supprimer
            </Button>
          )}
          <IconButton
            icon={isExpanded ? <FiChevronUp /> : <FiChevronDown />}
            size="sm"
            variant="ghost"
            aria-label={isExpanded ? "Replier" : "Déplier"}
          />
        </HStack>
      </HStack>

      {/* Contenu repliable */}
      <Collapse in={isExpanded} animateOpacity>
        <VStack spacing={4} align="stretch">
          <HStack justify="space-between">
            <Text fontSize="sm" color="gray.600">
              Gestion de l'image de fond plein écran pour la page publique
            </Text>
            <HStack>
              <Button
                leftIcon={<FiUpload />}
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                isLoading={uploading}
                colorScheme="blue"
              >
                Changer le fond
              </Button>
              {backgroundImage && (
                <Button
                  leftIcon={<FiTarget />}
                  size="sm"
                  colorScheme="orange"
                  onClick={onOpen}
                >
                  Position focale
                </Button>
              )}
            </HStack>
          </HStack>

          <Input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => uploadBackground(e.target.files[0])}
            display="none"
          />

          {backgroundImage && (
            <Box borderRadius="md" overflow="hidden" bg="gray.100" border="1px solid" borderColor="gray.200">
              <Image
                src={backgroundImage}
                alt="Aperçu image de fond"
                w="100%"
                h="200px"
                objectFit="cover"
                objectPosition={backgroundPosition}
              />
              <Text fontSize="sm" color="gray.600" p={2} bg="gray.50">
                📍 Position focale : {backgroundPosition}
              </Text>
            </Box>
          )}

          {!backgroundImage && (
            <Box 
              borderRadius="md" 
              border="2px dashed" 
              borderColor="gray.300" 
              p={8} 
              textAlign="center"
              bg="gray.50"
            >
              <Text color="gray.500" mb={2}>Aucune image de fond définie</Text>
              <Text fontSize="sm" color="gray.400">
                La première image de la galerie sera utilisée par défaut
              </Text>
            </Box>
          )}
        </VStack>
      </Collapse>

      {/* Modal pour ajuster la position */}
      <Modal isOpen={isOpen} onClose={onClose} size="4xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>🎯 Ajuster la position focale</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <Text color="gray.600">
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

  // DONNÉES COMPLÈTES PRÉ-REMPLIES basées sur les informations fournies
  const defaultVehicleData = {
    // Informations de base
    marque: "Mercedes-Benz",
    modele: "Citaro ♿",
    subtitle: "Citaro 1 | € II | ❄️ | ♿",
    etat: "Préservé",
    type: "Bus",
    immat: "FG-920-RE",
    energie: "Diesel",
    miseEnCirculation: "2001-07-01",
    
    // Informations techniques détaillées
    numerosFlotte: "592 / 720 / X / 920",
    constructeur: "Mercedes-Benz",
    longueur: "11,95 m",
    placesAssises: "32",
    placesDebout: "64",
    ufr: "1",
    statut: "Préservé",
    preservePar: "Association RétroBus Essonne",
    normeEuro: "Euro II",
    moteur: "Mercedes-Benz OM906hLA - 279 ch",
    boiteVitesses: "Automatique ZF5HP-502C",
    nombrePortes: "2",
    livree: "Grise",
    girouette: "Duhamel LED Oranges + Pastilles Vertes",
    climatisation: "Complète",
    
    description: `Ce véhicule est un exemple emblématique de la gamme Citaro de première génération. Mis en service commercial en juillet 2001, il représente l'évolution technologique des transports urbains du début des années 2000. Équipé d'une climatisation complète et accessible aux personnes à mobilité réduite.`,
    history: `Le Mercedes-Benz Citaro est un autobus urbain produit par Daimler AG depuis 1997. Ce modèle a révolutionné les transports publics européens avec son design moderne et ses innovations techniques. Notre exemplaire FG-920-RE a été commandé par Cars Bridet à Wissous pour le réseau du Palladin et mis en service en juillet 2001. Au cours de sa carrière, il a porté successivement les numéros 592, 720, X, puis 920. Il a assuré la desserte Le Palladin jusqu'en août 2014. Après plusieurs années de service fidèle, il est passé brièvement par Brétigny en 2018, puis a rejoint Transdev STRAV à Limeil-Brévannes, avant d'être exploité par Cars Sœur. En mai 2025, ce véhicule historique a trouvé sa place au sein de la collection de l'association RétroBus Essonne, où il témoigne de l'évolution du transport public francilien au début du XXIe siècle.`,
    
    caracteristiques: [
      { label: "Numéros de flotte", value: "592 / 720 / X / 920" },
      { label: "Constructeur", value: "Mercedes-Benz" },
      { label: "Modèle", value: "Citaro ♿" },
      { label: "Immatriculation", value: "FG-920-RE" },
      { label: "Mise en circulation", value: "juillet 2001" },
      { label: "Longueur", value: "11,95 m" },
      { label: "Places assises", value: "32" },
      { label: "Places debout", value: "64" },
      { label: "UFR", value: "1" },
      { label: "Statut", value: "Préservé" },
      { label: "Préservé par", value: "Association RétroBus Essonne" },
      { label: "Énergie", value: "Diesel" },
      { label: "Norme Euro", value: "Euro II" },
      { label: "Moteur", value: "Mercedes-Benz OM906hLA - 279 ch" },
      { label: "Boîte de vitesses", value: "Automatique ZF5HP-502C" },
      { label: "Nombre de portes", value: "2" },
      { label: "Livrée", value: "Grise" },
      { label: "Girouette", value: "Duhamel LED Oranges + Pastilles Vertes" },
      { label: "Climatisation", value: "Complète" }
    ]
  };

  const loadAll = useCallback(async () => {
    if (!parc) return;
    setLoading(true);
    try {
      const response = await apiClient.get(`/vehicles/${parc}`);
      setVehicle(response);
      
      // Fusionner avec les données par défaut si manquantes
      const mergedData = {
        ...defaultVehicleData,
        ...response,
        // Si pas de caractéristiques ou vides, utiliser les valeurs par défaut
        caracteristiques: (response.caracteristiques && response.caracteristiques.length > 0) 
          ? response.caracteristiques 
          : defaultVehicleData.caracteristiques,
        // Si pas de description, utiliser la par défaut
        description: response.description || defaultVehicleData.description,
        // Si pas d'histoire, utiliser la par défaut
        history: response.history || defaultVehicleData.history,
      };
      
      setBasicInfo(mergedData);
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

  // Fonction pour mettre à jour automatiquement les caractéristiques
  const updateCaracteristiques = useCallback(() => {
    const updatedCaracteristiques = [
      { label: "Numéros de flotte", value: basicInfo.numerosFlotte || '' },
      { label: "Constructeur", value: basicInfo.constructeur || '' },
      { label: "Modèle", value: basicInfo.modele || '' },
      { label: "Immatriculation", value: basicInfo.immat || '' },
      { label: "Mise en circulation", value: basicInfo.miseEnCirculation ? 'juillet 2001' : '' },
      { label: "Longueur", value: basicInfo.longueur || '' },
      { label: "Places assises", value: basicInfo.placesAssises || '' },
      { label: "Places debout", value: basicInfo.placesDebout || '' },
      { label: "UFR", value: basicInfo.ufr || '' },
      { label: "Statut", value: basicInfo.statut || '' },
      { label: "Préservé par", value: basicInfo.preservePar || '' },
      { label: "Énergie", value: basicInfo.energie || '' },
      { label: "Norme Euro", value: basicInfo.normeEuro || '' },
      { label: "Moteur", value: basicInfo.moteur || '' },
      { label: "Boîte de vitesses", value: basicInfo.boiteVitesses || '' },
      { label: "Nombre de portes", value: basicInfo.nombrePortes || '' },
      { label: "Livrée", value: basicInfo.livree || '' },
      { label: "Girouette", value: basicInfo.girouette || '' },
      { label: "Climatisation", value: basicInfo.climatisation || '' }
    ].filter(item => item.value); // Filtrer les valeurs vides

    setBasicInfo(prev => ({ ...prev, caracteristiques: updatedCaracteristiques }));
  }, [basicInfo.numerosFlotte, basicInfo.constructeur, basicInfo.modele, basicInfo.immat, basicInfo.miseEnCirculation, basicInfo.longueur, basicInfo.placesAssises, basicInfo.placesDebout, basicInfo.ufr, basicInfo.statut, basicInfo.preservePar, basicInfo.energie, basicInfo.normeEuro, basicInfo.moteur, basicInfo.boiteVitesses, basicInfo.nombrePortes, basicInfo.livree, basicInfo.girouette, basicInfo.climatisation]);

  // Mettre à jour les caractéristiques quand les champs changent
  useEffect(() => {
    updateCaracteristiques();
  }, [updateCaracteristiques]);

  const save = async () => {
    try {
      setSaving(true);
      const etatFinal = basicInfo.statut || basicInfo.etat;
      await apiClient.put(`/vehicles/${parc}`, {
        etat: etatFinal,
        marque: basicInfo.marque,
        modele: basicInfo.modele,
        type: basicInfo.type,
        immat: basicInfo.immat,
        energie: basicInfo.energie,
        miseEnCirculation: basicInfo.miseEnCirculation,
        subtitle: basicInfo.subtitle,
        description: basicInfo.description,
        history: basicInfo.history,
        caracteristiques: basicInfo.caracteristiques,
        gallery: basicInfo.gallery,
        backgroundImage: basicInfo.backgroundImage,
        backgroundPosition: basicInfo.backgroundPosition,
        // Ajouter tous les nouveaux champs
        numerosFlotte: basicInfo.numerosFlotte,
        constructeur: basicInfo.constructeur,
        longueur: basicInfo.longueur,
        placesAssises: basicInfo.placesAssises,
        placesDebout: basicInfo.placesDebout,
        ufr: basicInfo.ufr,
        statut: basicInfo.statut,
        preservePar: basicInfo.preservePar,
        normeEuro: basicInfo.normeEuro,
        moteur: basicInfo.moteur,
        boiteVitesses: basicInfo.boiteVitesses,
        nombrePortes: basicInfo.nombrePortes,
        livree: basicInfo.livree,
        girouette: basicInfo.girouette,
        climatisation: basicInfo.climatisation
      });
      toast({ status: 'success', title: '✅ Sauvegardé avec succès', description: 'Visible sur la page publique' });
      loadAll(); // Recharger pour synchroniser
    } catch {
      toast({ status: 'error', title: '❌ Erreur sauvegarde' });
    } finally {
      setSaving(false);
    }
  };

  const updateVehicleInfo = (updates) => {
    setVehicle(prev => ({ ...prev, ...updates }));
    setBasicInfo(prev => ({ ...prev, ...updates }));
  };

  const resetToDefaults = () => {
    setBasicInfo(prev => ({
      ...prev,
      ...defaultVehicleData,
      // Garder les IDs et données système
      parc: prev.parc,
      id: prev.id,
      createdAt: prev.createdAt,
      updatedAt: prev.updatedAt,
      gallery: prev.gallery,
      backgroundImage: prev.backgroundImage,
      backgroundPosition: prev.backgroundPosition
    }));
    toast({ status: 'info', title: '🔄 Données par défaut restaurées', description: 'N\'oubliez pas de sauvegarder' });
  };

  if (loading) return <Center h="60vh"><Spinner size="xl" /></Center>;
  if (!vehicle) return null;

  const fullTitle = vehicle.marque ? `${vehicle.marque} ${vehicle.modele}` : vehicle.modele;

  return (
    <Box p={8}>
      <Flex align="center" justify="space-between" mb={6}>
        <HStack>
          <Button
            leftIcon={<FiArrowLeft />}
            variant="ghost"
            onClick={() => navigate('/dashboard/vehicules')}
          >
            Retour
          </Button>
          <Heading size="lg">✏️ Édition véhicule {vehicle.parc}</Heading>
          <EtatBadge etat={vehicle.etat} />
        </HStack>
        <HStack>
          <Button
            size="sm"
            variant="outline"
            onClick={resetToDefaults}
          >
            🔄 Données par défaut
          </Button>
          <Button
            leftIcon={<FiExternalLink />}
            colorScheme="blue"
            variant="outline"
            onClick={() => window.open(`${PUBLIC_BASE}/vehicles/${parc}`, '_blank')}
          >
            👁️ Voir la page publique
          </Button>
        </HStack>
      </Flex>

      <VStack spacing={8} align="stretch">
        {/* Section Image de fond - Repliable */}
        <Box bg="blue.50" p={6} borderRadius="lg" border="1px solid" borderColor="blue.200">
          <BackgroundImageManager
            vehicle={vehicle}
            parc={parc}
            onChange={updateVehicleInfo}
            authHeader={apiClient.authHeader}
          />
        </Box>

        {/* Section Informations principales - TOUS LES CHAMPS SPÉCIFIQUES */}
        <Box bg="gray.50" p={6} borderRadius="lg" border="1px solid" borderColor="gray.200">
          <Heading size="md" mb={4}>📝 Informations principales</Heading>
          
          {/* Première ligne - Infos de base */}
          <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4} mb={4}>
            <FormControl>
              <FormLabel>Parc</FormLabel>
              <Input value={vehicle.parc} isReadOnly bg="gray.100" />
            </FormControl>
            
            <FormControl>
              <FormLabel>Numéros de flotte</FormLabel>
              <Input
                value={basicInfo.numerosFlotte || ''}
                onChange={e => setBasicInfo(b => ({ ...b, numerosFlotte: e.target.value }))}
                placeholder="592 / 720 / X / 920"
              />
            </FormControl>
            
            <FormControl>
              <FormLabel>Constructeur</FormLabel>
              <Input
                value={basicInfo.constructeur || ''}
                onChange={e => setBasicInfo(b => ({ ...b, constructeur: e.target.value }))}
                placeholder="Mercedes-Benz"
              />
            </FormControl>
            
            <FormControl>
              <FormLabel>Modèle</FormLabel>
              <Input
                value={basicInfo.modele || ''}
                onChange={e => setBasicInfo(b => ({ ...b, modele: e.target.value }))}
                placeholder="Citaro ♿"
              />
            </FormControl>
          </SimpleGrid>

          {/* Deuxième ligne - Immatriculation et circulation */}
          <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4} mb={4}>
            <FormControl>
              <FormLabel>Immatriculation</FormLabel>
              <Input
                value={basicInfo.immat || ''}
                onChange={e => setBasicInfo(b => ({ ...b, immat: e.target.value }))}
                placeholder="FG-920-RE"
              />
            </FormControl>
            
            <FormControl>
              <FormLabel>Mise en circulation</FormLabel>
              <Input
                type="date"
                value={basicInfo.miseEnCirculation ? new Date(basicInfo.miseEnCirculation).toISOString().split('T')[0] : ''}
                onChange={e => setBasicInfo(b => ({ ...b, miseEnCirculation: e.target.value }))}
              />
            </FormControl>
            
            <FormControl>
              <FormLabel>Longueur</FormLabel>
              <Input
                value={basicInfo.longueur || ''}
                onChange={e => setBasicInfo(b => ({ ...b, longueur: e.target.value }))}
                placeholder="11,95 m"
              />
            </FormControl>
            
            <FormControl>
              <FormLabel>Places assises</FormLabel>
              <Input
                value={basicInfo.placesAssises || ''}
                onChange={e => setBasicInfo(b => ({ ...b, placesAssises: e.target.value }))}
                placeholder="32"
              />
            </FormControl>
          </SimpleGrid>

          {/* Troisième ligne - Capacités */}
          <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4} mb={4}>
            <FormControl>
              <FormLabel>Places debout</FormLabel>
              <Input
                value={basicInfo.placesDebout || ''}
                onChange={e => setBasicInfo(b => ({ ...b, placesDebout: e.target.value }))}
                placeholder="64"
              />
            </FormControl>
            
            <FormControl>
              <FormLabel>UFR</FormLabel>
              <Input
                value={basicInfo.ufr || ''}
                onChange={e => setBasicInfo(b => ({ ...b, ufr: e.target.value }))}
                placeholder="1"
              />
            </FormControl>
            
            <FormControl>
              <FormLabel>Statut</FormLabel>
              <Select
                value={basicInfo.statut || ''}
                onChange={e => setBasicInfo(b => ({ ...b, statut: e.target.value }))}
              >
                <option value="Préservé">Préservé</option>
                <option value="Service">Service</option>
                <option value="disponible">Disponible</option>
                <option value="en_panne">En panne</option>
                <option value="maintenance">Maintenance</option>
                <option value="A VENIR">A venir</option>
                <option value="Restauration">Restauration</option>
              </Select>
            </FormControl>
            
            <FormControl>
              <FormLabel>Énergie</FormLabel>
              <Select
                value={basicInfo.energie || ''}
                onChange={e => setBasicInfo(b => ({ ...b, energie: e.target.value }))}
              >
                <option value="Diesel">Diesel</option>
                <option value="Électrique">Électrique</option>
                <option value="Hybride">Hybride</option>
                <option value="GNV">GNV</option>
              </Select>
            </FormControl>
          </SimpleGrid>

          {/* Quatrième ligne - Préservation */}
          <SimpleGrid columns={{ base: 1, md: 1 }} spacing={4} mb={4}>
            <FormControl>
              <FormLabel>Préservé par</FormLabel>
              <Input
                value={basicInfo.preservePar || ''}
                onChange={e => setBasicInfo(b => ({ ...b, preservePar: e.target.value }))}
                placeholder="Association RétroBus Essonne"
              />
            </FormControl>
          </SimpleGrid>

          {/* Cinquième ligne - Moteur et technique */}
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4} mb={4}>
            <FormControl>
              <FormLabel>Norme Euro</FormLabel>
              <Input
                value={basicInfo.normeEuro || ''}
                onChange={e => setBasicInfo(b => ({ ...b, normeEuro: e.target.value }))}
                placeholder="Euro II"
              />
            </FormControl>
            
            <FormControl>
              <FormLabel>Moteur</FormLabel>
              <Input
                value={basicInfo.moteur || ''}
                onChange={e => setBasicInfo(b => ({ ...b, moteur: e.target.value }))}
                placeholder="Mercedes-Benz OM906hLA - 279 ch"
              />
            </FormControl>
            
            <FormControl>
              <FormLabel>Boîte de vitesses</FormLabel>
              <Input
                value={basicInfo.boiteVitesses || ''}
                onChange={e => setBasicInfo(b => ({ ...b, boiteVitesses: e.target.value }))}
                placeholder="Automatique ZF5HP-502C"
              />
            </FormControl>
          </SimpleGrid>

          {/* Sixième ligne - Caractéristiques finales */}
          <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4} mb={4}>
            <FormControl>
              <FormLabel>Nombre de portes</FormLabel>
              <Input
                value={basicInfo.nombrePortes || ''}
                onChange={e => setBasicInfo(b => ({ ...b, nombrePortes: e.target.value }))}
                placeholder="2"
              />
            </FormControl>
            
            <FormControl>
              <FormLabel>Livrée</FormLabel>
              <Input
                value={basicInfo.livree || ''}
                onChange={e => setBasicInfo(b => ({ ...b, livree: e.target.value }))}
                placeholder="Grise"
              />
            </FormControl>
            
            <FormControl>
              <FormLabel>Girouette</FormLabel>
              <Input
                value={basicInfo.girouette || ''}
                onChange={e => setBasicInfo(b => ({ ...b, girouette: e.target.value }))}
                placeholder="Duhamel LED Oranges + Pastilles Vertes"
              />
            </FormControl>
            
            <FormControl>
              <FormLabel>Climatisation</FormLabel>
              <Input
                value={basicInfo.climatisation || ''}
                onChange={e => setBasicInfo(b => ({ ...b, climatisation: e.target.value }))}
                placeholder="Complète"
              />
            </FormControl>
          </SimpleGrid>

          {/* Sous-titre */}
          <FormControl mt={4}>
            <FormLabel>Sous-titre (badges affichés)</FormLabel>
            <Input
              value={basicInfo.subtitle || ''}
              onChange={e => setBasicInfo(b => ({ ...b, subtitle: e.target.value }))}
              placeholder="Citaro 1 | € II | ❄️ | ♿"
            />
            <Text fontSize="sm" color="gray.600" mt={1}>
              Exemple avec émojis : "Citaro 1 | € II | ❄️ | ♿"
            </Text>
          </FormControl>

          <Text fontSize="xs" color="blue.600" mt={4} fontStyle="italic">
            💡 Les caractéristiques techniques sont automatiquement mises à jour en fonction des champs ci-dessus
          </Text>
        </Box>

        {/* Section Textes descriptifs */}
        <Box bg="green.50" p={6} borderRadius="lg" border="1px solid" borderColor="green.200">
          <Heading size="md" mb={4}>📄 Textes descriptifs</Heading>
          <VStack spacing={4}>
            <FormControl>
              <FormLabel>Description</FormLabel>
              <Textarea
                value={basicInfo.description || ''}
                onChange={e => setBasicInfo(b => ({ ...b, description: e.target.value }))}
                rows={4}
                placeholder="Ce véhicule est un exemple emblématique..."
              />
              <Text fontSize="xs" color="gray.600" mt={1}>
                Apparaît dans la section "Description" sur la page publique
              </Text>
            </FormControl>

            <FormControl>
              <FormLabel>Histoire</FormLabel>
              <Textarea
                value={basicInfo.history || ''}
                onChange={e => setBasicInfo(b => ({ ...b, history: e.target.value }))}
                rows={6}
                placeholder="Le Mercedes-Benz Citaro est un autobus urbain..."
              />
              <Text fontSize="xs" color="gray.600" mt={1}>
                Apparaît dans la section "Histoire" sur la page publique
              </Text>
            </FormControl>
          </VStack>
        </Box>

        {/* Section Galerie */}
        <Box bg="purple.50" p={6} borderRadius="lg" border="1px solid" borderColor="purple.200">
          <Heading size="md" mb={4}>📸 Galerie photos</Heading>
          <GalleryManager
            value={basicInfo.gallery || []}
            onChange={gallery => setBasicInfo(b => ({ ...b, gallery }))}
            uploadEndpoint={`${apiClient.baseURL}/vehicles/${parc}/gallery`}
            deleteEndpoint={`${apiClient.baseURL}/vehicles/${parc}/gallery`}
            authHeader={apiClient.authHeader}
          />
          <Text fontSize="sm" color="gray.600" mt={2}>
            La première image peut servir de fond si aucune image de fond spécifique n'est définie. Les autres images apparaissent dans le carrousel.
          </Text>
        </Box>

        {/* Bouton de sauvegarde principal */}
        <Box textAlign="center" py={4}>
          <Button
            leftIcon={<FiSave />}
            colorScheme="blue"
            size="lg"
            onClick={save}
            isLoading={saving}
            loadingText="Sauvegarde en cours..."
          >
            💾 Sauvegarder toutes les modifications
          </Button>
          <Text fontSize="sm" color="gray.600" mt={2}>
            Les modifications seront visibles immédiatement sur la page publique
          </Text>
        </Box>
      </VStack>
    </Box>
  );
}