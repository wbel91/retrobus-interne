import React, { useState, useEffect } from 'react';
import {
  Box,
  FormLabel,
  Select,
  Text,
  HStack,
  Badge,
  Image,
  Flex,
  Spinner,
  VStack
} from '@chakra-ui/react';

const VehicleSelector = ({ value, onChange, isRequired = false }) => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('https://refreshing-adaptation-rbe-serveurs.up.railway.app/vehicles', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setVehicles(data);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des véhicules:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();
  }, []);

  const selectedVehicle = vehicles.find(v => v.parc === value);

  return (
    <Box>
      <FormLabel>
        Véhicule participant {isRequired && <Text as="span" color="red.500">*</Text>}
      </FormLabel>
      
      {loading ? (
        <Flex align="center" justify="center" py={4}>
          <Spinner size="sm" mr={2} />
          <Text fontSize="sm" color="gray.600">Chargement des véhicules...</Text>
        </Flex>
      ) : (
        <>
          <Select
            placeholder="Sélectionner un véhicule (optionnel)"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            bg="white"
          >
            {vehicles.map((vehicle) => (
              <option key={vehicle.parc} value={vehicle.parc}>
                {vehicle.marque} {vehicle.modele} - {vehicle.parc}
                {vehicle.immat && ` (${vehicle.immat})`}
              </option>
            ))}
          </Select>

          {/* Aperçu du véhicule sélectionné */}
          {selectedVehicle && (
            <Box mt={3} p={3} bg="blue.50" borderRadius="md" border="1px solid" borderColor="blue.200">
              <Flex align="center">
                {selectedVehicle.gallery && selectedVehicle.gallery[0] && (
                  <Image
                    src={`https://refreshing-adaptation-rbe-serveurs.up.railway.app${selectedVehicle.gallery[0]}`}
                    alt={`${selectedVehicle.marque} ${selectedVehicle.modele}`}
                    boxSize="60px"
                    objectFit="cover"
                    borderRadius="md"
                    mr={3}
                  />
                )}
                <Box flex={1}>
                  <Text fontWeight="bold" color="blue.700">
                    {selectedVehicle.marque} {selectedVehicle.modele}
                  </Text>
                  <HStack spacing={2} mt={1}>
                    <Badge colorScheme="blue" fontSize="xs">
                      {selectedVehicle.parc}
                    </Badge>
                    {selectedVehicle.immat && (
                      <Badge colorScheme="green" fontSize="xs">
                        {selectedVehicle.immat}
                      </Badge>
                    )}
                    {selectedVehicle.miseEnCirculation && (
                      <Badge colorScheme="orange" fontSize="xs">
                        {new Date(selectedVehicle.miseEnCirculation).getFullYear()}
                      </Badge>
                    )}
                  </HStack>
                  {selectedVehicle.subtitle && (
                    <Text fontSize="sm" color="gray.600" mt={1}>
                      {selectedVehicle.subtitle}
                    </Text>
                  )}
                </Box>
              </Flex>
              <VStack spacing={2} align="start" mt={3}>
                <Text fontSize="xs" color="blue.600" fontStyle="italic" fontWeight="semibold">
                  ✨ Ce véhicule sera mis en avant sur sa page individuelle avec une banderole spéciale pour cet événement
                </Text>
                <Text fontSize="xs" color="gray.500">
                  Les visiteurs verront une banderole thématique adaptée au type d'événement sur la page de ce véhicule.
                </Text>
              </VStack>
            </Box>
          )}
        </>
      )}
      
      <Text fontSize="xs" color="gray.500" mt={2}>
        Sélectionnez un véhicule pour qu'il soit associé à cet événement. 
        Une banderole apparaîtra sur sa page pour informer les visiteurs de sa participation.
      </Text>
    </Box>
  );
};

export default VehicleSelector;