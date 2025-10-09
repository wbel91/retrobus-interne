import React, { useEffect, useState } from "react";
import { Box, Heading, Text, SimpleGrid, Stat, StatLabel, StatNumber, StatHelpText, Card, CardBody, Alert, AlertIcon } from "@chakra-ui/react";
import { membersAPI } from "../api/members.js";

export default function Adhesion() {
  const [me, setMe] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await membersAPI.getMe();
        setMe(data);
      } catch (e) {
        setError("Impossible de charger vos informations d'adhésion.");
      }
    })();
  }, []);

  return (
    <Box p={8}>
      <Heading mb={6}>Mon Adhésion</Heading>
      {error && (
        <Alert status="error" mb={4}><AlertIcon />{error}</Alert>
      )}
      {me && (
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
          <Card><CardBody>
            <Stat>
              <StatLabel>Statut</StatLabel>
              <StatNumber>{me.membershipStatus}</StatNumber>
              <StatHelpText>{me.membershipType}</StatHelpText>
            </Stat>
          </CardBody></Card>
          <Card><CardBody>
            <Stat>
              <StatLabel>Renouvellement</StatLabel>
              <StatNumber>{me.renewalDate ? new Date(me.renewalDate).toLocaleDateString('fr-FR') : '-'}</StatNumber>
              <StatHelpText>Dernier paiement: {me.lastPaymentDate ? new Date(me.lastPaymentDate).toLocaleDateString('fr-FR') : '-'}</StatHelpText>
            </Stat>
          </CardBody></Card>
          <Card><CardBody>
            <Stat>
              <StatLabel>Montant</StatLabel>
              <StatNumber>{me.paymentAmount ? `${me.paymentAmount} €` : '-'}</StatNumber>
              <StatHelpText>Méthode: {me.paymentMethod || '-'}</StatHelpText>
            </Stat>
          </CardBody></Card>
        </SimpleGrid>
      )}
      {!me && !error && (
        <Text>Chargement de vos informations...</Text>
      )}
    </Box>
  );
}
