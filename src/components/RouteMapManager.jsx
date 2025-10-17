import React, { useState, useEffect, useRef } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
  ModalCloseButton, Button, VStack, HStack, FormControl, FormLabel,
  Input, Select, Alert, AlertIcon, Text, Badge, Spinner, Center,
  Box, Divider, Card, CardBody, useToast
} from '@chakra-ui/react';
import { FiMapPin, FiNavigation, FiClock, FiTruck, FiSave } from 'react-icons/fi';

const RouteMapManager = ({ isOpen, onClose, onSave, initialRoute = null }) => {
  const [loading, setLoading] = useState(false);
  const [route, setRoute] = useState({
    name: '',
    startPoint: { address: '', lat: null, lng: null },
    endPoint: { address: '', lat: null, lng: null },
    waypoints: [],
    vehicle: '',
    driver: '',
    capacity: 45,
    estimatedDuration: null,
    estimatedDistance: null,
    busOptimized: true
  });
  
  const [routeOptions, setRouteOptions] = useState({
    avoidHighways: true,
    avoidTolls: true,
    transitMode: 'DRIVING',
    region: 'fr',
    language: 'fr'
  });
  
  const [routeResult, setRouteResult] = useState(null);
  const [suggestions, setSuggestions] = useState({ start: [], end: [] });
  const mapRef = useRef(null);
  const directionsServiceRef = useRef(null);
  const directionsRendererRef = useRef(null);
  const geocoderRef = useRef(null);
  const toast = useToast();

  // Configuration API Google Maps (ou alternative)
  const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const API_BASE = import.meta.env.VITE_API_URL || '';

  useEffect(() => {
    if (initialRoute) {
      setRoute({
        name: initialRoute.name || '',
        startPoint: initialRoute.startPoint || { address: '', lat: null, lng: null },
        endPoint: initialRoute.endPoint || { address: '', lat: null, lng: null },
        waypoints: initialRoute.waypoints || [],
        vehicle: initialRoute.vehicle || '',
        driver: initialRoute.driver || '',
        capacity: initialRoute.capacity || 45,
        estimatedDuration: initialRoute.estimatedDuration || null,
        estimatedDistance: initialRoute.estimatedDistance || null,
        busOptimized: true
      });
    }
  }, [initialRoute]);

  // Initialisation de Google Maps
  useEffect(() => {
    if (!isOpen || !MAPS_API_KEY) return;

    const initMap = () => {
      if (!window.google) {
        console.error('Google Maps API non chargée');
        return;
      }

      const mapElement = document.getElementById('route-map');
      if (!mapElement) return;

      const map = new window.google.maps.Map(mapElement, {
        center: { lat: 48.7006, lng: 2.1306 }, // Villebon-sur-Yvette
        zoom: 10,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true
      });

      mapRef.current = map;
      directionsServiceRef.current = new window.google.maps.DirectionsService();
      directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
        draggable: true,
        panel: document.getElementById('directions-panel')
      });
      geocoderRef.current = new window.google.maps.Geocoder();

      directionsRendererRef.current.setMap(map);

      // Écouter les modifications de l'itinéraire
      directionsRendererRef.current.addListener('directions_changed', () => {
        const directions = directionsRendererRef.current.getDirections();
        const route = directions.routes[0];
        if (route) {
          setRouteResult({
            distance: route.legs.reduce((sum, leg) => sum + leg.distance.value, 0),
            duration: route.legs.reduce((sum, leg) => sum + leg.duration.value, 0),
            steps: route.legs.flatMap(leg => leg.steps)
          });
        }
      });
    };

    // Charger Google Maps API si pas déjà chargée
    if (!window.google) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}&libraries=places&language=fr&region=FR`;
      script.onload = initMap;
      document.head.appendChild(script);
    } else {
      initMap();
    }
  }, [isOpen, MAPS_API_KEY]);

  // Calcul d'itinéraire optimisé pour bus
  const calculateBusRoute = async () => {
    if (!route.startPoint.address || !route.endPoint.address) {
      toast({
        status: 'warning',
        title: 'Adresses requises',
        description: 'Veuillez saisir les points de départ et d\'arrivée'
      });
      return;
    }

    setLoading(true);
    try {
      // Géocoder les adresses si nécessaire
      await geocodeAddresses();

      // Calculer l'itinéraire avec les contraintes bus
      const request = {
        origin: route.startPoint.address,
        destination: route.endPoint.address,
        waypoints: route.waypoints.map(wp => ({ location: wp.address, stopover: true })),
        travelMode: window.google.maps.TravelMode.DRIVING,
        avoidHighways: routeOptions.avoidHighways,
        avoidTolls: routeOptions.avoidTolls,
        region: routeOptions.region,
        language: routeOptions.language,
        // Optimisations spécifiques aux bus
        transitOptions: {
          modes: [window.google.maps.TransitMode.BUS],
          routingPreference: window.google.maps.TransitRoutePreference.FEWER_TRANSFERS
        }
      };

      directionsServiceRef.current.route(request, (result, status) => {
        if (status === 'OK') {
          directionsRendererRef.current.setDirections(result);
          
          const route = result.routes[0];
          const totalDistance = route.legs.reduce((sum, leg) => sum + leg.distance.value, 0);
          const totalDuration = route.legs.reduce((sum, leg) => sum + leg.duration.value, 0);

          setRoute(prev => ({
            ...prev,
            estimatedDistance: Math.round(totalDistance / 1000), // km
            estimatedDuration: Math.round(totalDuration / 60) // minutes
          }));

          // Générer les arrêts automatiquement
          const stops = route.legs.flatMap((leg, legIndex) => {
            const stops = [];
            if (legIndex === 0) {
              stops.push({
                name: 'Départ',
                address: leg.start_address,
                time: '09:00',
                estimated: true
              });
            }
            stops.push({
              name: legIndex === route.legs.length - 1 ? 'Arrivée' : `Étape ${legIndex + 1}`,
              address: leg.end_address,
              time: calculateEstimatedTime('09:00', totalDuration * (legIndex + 1) / route.legs.length),
              estimated: true
            });
            return stops;
          });

          setRoute(prev => ({ ...prev, waypoints: stops }));

          toast({
            status: 'success',
            title: 'Itinéraire calculé',
            description: `${Math.round(totalDistance / 1000)} km en ${Math.round(totalDuration / 60)} min`
          });
        } else {
          throw new Error(`Erreur de calcul d'itinéraire: ${status}`);
        }
      });
    } catch (error) {
      console.error('Erreur calcul itinéraire:', error);
      toast({
        status: 'error',
        title: 'Erreur de calcul',
        description: 'Impossible de calculer l\'itinéraire optimisé'
      });
    } finally {
      setLoading(false);
    }
  };

  const geocodeAddresses = async () => {
    const promises = [];
    
    if (route.startPoint.address && !route.startPoint.lat) {
      promises.push(
        new Promise((resolve) => {
          geocoderRef.current.geocode(
            { address: route.startPoint.address, region: 'FR' },
            (results, status) => {
              if (status === 'OK' && results[0]) {
                const location = results[0].geometry.location;
                setRoute(prev => ({
                  ...prev,
                  startPoint: {
                    ...prev.startPoint,
                    lat: location.lat(),
                    lng: location.lng()
                  }
                }));
              }
              resolve();
            }
          );
        })
      );
    }

    if (route.endPoint.address && !route.endPoint.lat) {
      promises.push(
        new Promise((resolve) => {
          geocoderRef.current.geocode(
            { address: route.endPoint.address, region: 'FR' },
            (results, status) => {
              if (status === 'OK' && results[0]) {
                const location = results[0].geometry.location;
                setRoute(prev => ({
                  ...prev,
                  endPoint: {
                    ...prev.endPoint,
                    lat: location.lat(),
                    lng: location.lng()
                  }
                }));
              }
              resolve();
            }
          );
        })
      );
    }

    await Promise.all(promises);
  };

  const calculateEstimatedTime = (startTime, additionalMinutes) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + additionalMinutes;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMinutes = totalMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
  };

  const searchAddresses = async (query, type) => {
    if (!query || query.length < 3) return;

    try {
      const service = new window.google.maps.places.AutocompleteService();
      service.getPlacePredictions(
        {
          input: query,
          componentRestrictions: { country: 'fr' },
          types: ['establishment', 'geocode'],
          fields: ['formatted_address', 'geometry', 'name']
        },
        (predictions, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK) {
            const results = predictions.map(p => ({
              address: p.description,
              placeId: p.place_id
            }));
            setSuggestions(prev => ({ ...prev, [type]: results }));
          }
        }
      );
    } catch (error) {
      console.error('Erreur recherche adresses:', error);
    }
  };

  const handleSave = () => {
    if (!route.name || !route.startPoint.address || !route.endPoint.address) {
      toast({
        status: 'warning',
        title: 'Informations incomplètes',
        description: 'Veuillez remplir le nom du trajet et les adresses'
      });
      return;
    }

    const routeData = {
      ...route,
      id: Date.now(),
      createdAt: new Date().toISOString(),
      busOptimized: true,
      restrictions: {
        avoidHighways: routeOptions.avoidHighways,
        avoidTolls: routeOptions.avoidTolls,
        accessibleToBuses: true,
        economical: true
      }
    };

    onSave(routeData);
    onClose();
    
    toast({
      status: 'success',
      title: 'Trajet sauvegardé',
      description: 'L\'itinéraire optimisé a été ajouté à l\'événement'
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="6xl">
      <ModalOverlay />
      <ModalContent maxH="90vh">
        <ModalHeader>
          <HStack>
            <FiMapPin />
            <Text>Générateur d'itinéraire compatible autobus</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        
        <ModalBody overflow="auto">
          <VStack spacing={6} align="stretch">
            {/* Configuration du trajet */}
            <Card>
              <CardBody>
                <VStack spacing={4} align="stretch">
                  <FormControl isRequired>
                    <FormLabel>Nom du trajet</FormLabel>
                    <Input
                      value={route.name}
                      onChange={(e) => setRoute(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: Circuit Château de Versailles"
                    />
                  </FormControl>

                  <HStack spacing={4}>
                    <FormControl flex={1}>
                      <FormLabel>Véhicule</FormLabel>
                      <Input
                        value={route.vehicle}
                        onChange={(e) => setRoute(prev => ({ ...prev, vehicle: e.target.value }))}
                        placeholder="Ex: RBE 920"
                      />
                    </FormControl>
                    <FormControl flex={1}>
                      <FormLabel>Chauffeur</FormLabel>
                      <Input
                        value={route.driver}
                        onChange={(e) => setRoute(prev => ({ ...prev, driver: e.target.value }))}
                        placeholder="Nom du chauffeur"
                      />
                    </FormControl>
                    <FormControl w="120px">
                      <FormLabel>Capacité</FormLabel>
                      <Input
                        type="number"
                        value={route.capacity}
                        onChange={(e) => setRoute(prev => ({ ...prev, capacity: parseInt(e.target.value) || 45 }))}
                      />
                    </FormControl>
                  </HStack>
                </VStack>
              </CardBody>
            </Card>

            {/* Points de départ et d'arrivée */}
            <Card>
              <CardBody>
                <VStack spacing={4} align="stretch">
                  <Text fontWeight="bold">Points de trajet</Text>
                  
                  <FormControl isRequired>
                    <FormLabel>Point de départ</FormLabel>
                    <Input
                      value={route.startPoint.address}
                      onChange={(e) => {
                        setRoute(prev => ({
                          ...prev,
                          startPoint: { ...prev.startPoint, address: e.target.value }
                        }));
                        searchAddresses(e.target.value, 'start');
                      }}
                      placeholder="Adresse de départ (ex: Villebon-sur-Yvette)"
                    />
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel>Destination</FormLabel>
                    <Input
                      value={route.endPoint.address}
                      onChange={(e) => {
                        setRoute(prev => ({
                          ...prev,
                          endPoint: { ...prev.endPoint, address: e.target.value }
                        }));
                        searchAddresses(e.target.value, 'end');
                      }}
                      placeholder="Adresse de destination"
                    />
                  </FormControl>

                  {/* Options d'itinéraire */}
                  <Alert status="info">
                    <AlertIcon />
                    <VStack align="start" spacing={2}>
                      <Text fontWeight="bold">Critères d'optimisation pour autobus :</Text>
                      <HStack spacing={4} wrap="wrap">
                        <Badge colorScheme="green">Sans autoroutes</Badge>
                        <Badge colorScheme="blue">Accessible aux bus</Badge>
                        <Badge colorScheme="purple">Économique</Badge>
                        <Badge colorScheme="orange">Sans péages</Badge>
                      </HStack>
                    </VStack>
                  </Alert>
                </VStack>
              </CardBody>
            </Card>

            {/* Carte et résultats */}
            <Card>
              <CardBody>
                <VStack spacing={4} align="stretch">
                  <HStack justify="space-between">
                    <Text fontWeight="bold">Carte interactive</Text>
                    <Button
                      leftIcon={<FiNavigation />}
                      colorScheme="blue"
                      onClick={calculateBusRoute}
                      isLoading={loading}
                      loadingText="Calcul..."
                    >
                      Calculer l'itinéraire
                    </Button>
                  </HStack>

                  {MAPS_API_KEY ? (
                    <Box>
                      <Box id="route-map" height="400px" borderRadius="md" border="1px solid" borderColor="gray.200" />
                      <Box id="directions-panel" mt={4} maxH="200px" overflow="auto" />
                    </Box>
                  ) : (
                    <Alert status="warning">
                      <AlertIcon />
                      <Text>
                        La clé API Google Maps n'est pas configurée. 
                        Ajoutez VITE_GOOGLE_MAPS_API_KEY à votre fichier .env
                      </Text>
                    </Alert>
                  )}

                  {/* Résultats du calcul */}
                  {routeResult && (
                    <HStack spacing={6} p={4} bg="gray.50" borderRadius="md">
                      <HStack>
                        <FiClock />
                        <Text fontWeight="bold">
                          Durée: {Math.round(routeResult.duration / 60)} min
                        </Text>
                      </HStack>
                      <HStack>
                        <FiTruck />
                        <Text fontWeight="bold">
                          Distance: {Math.round(routeResult.distance / 1000)} km
                        </Text>
                      </HStack>
                    </HStack>
                  )}
                </VStack>
              </CardBody>
            </Card>

            {/* Arrêts générés */}
            {route.waypoints.length > 0 && (
              <Card>
                <CardBody>
                  <VStack spacing={4} align="stretch">
                    <Text fontWeight="bold">Arrêts du trajet</Text>
                    {route.waypoints.map((stop, index) => (
                      <HStack key={index} p={3} bg="gray.50" borderRadius="md">
                        <Text fontWeight="bold" w="60px">{stop.time}</Text>
                        <Text flex={1}>{stop.name}</Text>
                        <Text fontSize="sm" color="gray.600">{stop.address}</Text>
                        {stop.estimated && <Badge size="sm">Auto</Badge>}
                      </HStack>
                    ))}
                  </VStack>
                </CardBody>
              </Card>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Annuler
          </Button>
          <Button
            leftIcon={<FiSave />}
            colorScheme="blue"
            onClick={handleSave}
            isDisabled={!route.name || !route.startPoint.address || !route.endPoint.address}
          >
            Sauvegarder le trajet
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default RouteMapManager;