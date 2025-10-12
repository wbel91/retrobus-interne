import React from "react";
import {
  Box,
  Heading,
  HStack,
  Image,
  SimpleGrid,
  Card,
  CardBody,
  CardHeader,
  Text,
} from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import myRbeLogo from "../assets/rbe_logo.svg";

const cards = [
  {
    title: "Gestion administrative et financières",
    to: "/admin",
    color: "red.100",
  },
  {
    title: "Gestion des Événements",
    to: "/dashboard/events-management", // Route correcte vers EventsManagement
    color: "green.100",
  },
  {
    title: "Gérer les adhésions",
    to: "/members",
    color: "blue.100",
  },
  {
    title: "Gestion Newsletter",
    to: "/dashboard/newsletter",
    color: "purple.100",
  },
  { title: "Gestion du Site", to: "/dashboard/site-management", color: "purple.100" }
];

export default function MyRBE() {
  return (
    <Box p={8}>
      <HStack spacing={4} mb={8}>
        <Heading as="h1" size="lg">
          Bienvenue sur l'espace
        </Heading>
        <Image src={myRbeLogo} alt="Logo My RBE" height="48px" />
      </HStack>
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
        {cards.map((card) => (
          <Card
            as={RouterLink}
            to={card.to}
            key={card.title}
            bg={card.color}
            _hover={{ boxShadow: "lg", transform: "scale(1.03)" }}
            transition="all 0.2s"
            cursor="pointer"
          >
            <CardHeader>
              <Heading size="md">{card.title}</Heading>
            </CardHeader>
            <CardBody>
              <Text>Accéder à la gestion</Text>
            </CardBody>
          </Card>
        ))}
        <Card
          as={RouterLink}
          to="/dashboard/site-management"
          bg="purple.100"
          _hover={{ bg:'purple.200' }}
        >
          <CardHeader fontWeight="bold">Gestion du Site</CardHeader>
          <CardBody>Maintenance, changelog…</CardBody>
        </Card>
      </SimpleGrid>
    </Box>
  );
}