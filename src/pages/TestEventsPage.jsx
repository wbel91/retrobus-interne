import React from 'react';
import { Box, Heading, Text, Button } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';

export default function TestEventsPage() {
  return (
    <Box p={6} bg="green.100" minH="100vh">
      <Heading color="green.800" mb={4}>
        🎯 TEST - Gestion des Événements
      </Heading>
      <Text color="green.700" mb={4}>
        Si vous voyez cette page, la redirection depuis MyRBE fonctionne !
      </Text>
      <Button as={RouterLink} to="/dashboard/myrbe" colorScheme="green">
        Retour à MyRBE
      </Button>
    </Box>
  );
}