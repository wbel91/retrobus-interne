import { Box, Heading, Text, SimpleGrid, Stat, StatLabel, StatNumber, Card, CardBody } from "@chakra-ui/react";

export default function RetroBus() {
  return (
    <Box p={6}>
      <Heading size="lg">Bienvenue sur l’intranet RétroBus Essonne</Heading>
      <Text mt={2} opacity={0.85}>
        Vue d’ensemble de l’association et raccourcis utiles.
      </Text>

      <SimpleGrid columns={{ base: 1, md: 3 }} gap={4} mt={6}>
        <Card><CardBody>
          <Stat>
            <StatLabel>Véhicules</StatLabel>
            <StatNumber>—</StatNumber>
          </Stat>
        </CardBody></Card>

        <Card><CardBody>
          <Stat>
            <StatLabel>Interventions à venir</StatLabel>
            <StatNumber>—</StatNumber>
          </Stat>
        </CardBody></Card>

        <Card><CardBody>
          <Stat>
            <StatLabel>Événements / sorties</StatLabel>
            <StatNumber>—</StatNumber>
          </Stat>
        </CardBody></Card>
      </SimpleGrid>

      <Box mt={8}>
        <Heading size="md">Actualités internes</Heading>
        <Text mt={2} opacity={0.8}>Rien pour le moment — tu pourras lier ici un flux “actus RBE”.</Text>
      </Box>
    </Box>
  );
}
