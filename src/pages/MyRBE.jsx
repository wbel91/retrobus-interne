import React from "react";
import {
  Container,
  Heading,
  Text,
  SimpleGrid,
  Box,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
} from "@chakra-ui/react";

export default function MyRBE() {
  // Ces valeurs peuvent être récupérées dynamiquement plus tard
  const stats = [
    {
      label: "Interventions planifiées",
      value: 3,
      help: "à venir cette semaine",
    },
    {
      label: "Anomalies signalées",
      value: 7,
      help: "en attente de traitement",
    },
    { label: "Pointages récents", value: 12, help: "ce mois-ci" },
  ];

  return (
    <Container maxW="4xl" py={10}>
      <Heading as="h1" size="2xl" mb={6}>
        Synthèse MyRBE
      </Heading>
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={8}>
        {stats.map((s, i) => (
          <Stat
            key={i}
            p={4}
            border="1px solid #eee"
            borderRadius="md"
            bg="gray.50"
          >
            <StatLabel>{s.label}</StatLabel>
            <StatNumber>{s.value}</StatNumber>
            <StatHelpText>{s.help}</StatHelpText>
          </Stat>
        ))}
      </SimpleGrid>
      <Text fontSize="md" opacity={0.7}>
        Retrouvez ici un aperçu de vos actions récentes et des statistiques
        globales.
      </Text>
    </Container>
  );
}