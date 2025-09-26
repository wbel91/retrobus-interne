import { Box, Text } from "@chakra-ui/react";
import { useUser } from "../context/UserContext";
import { canCreate } from "../lib/roles";

export default function RequireCreator({ children }) {
  const { matricule } = useUser();
  if (!canCreate(matricule)) {
    return (
      <Box p={6}>
        <Text fontWeight="bold">Accès refusé</Text>
        <Text opacity={0.8}>Vous n’êtes pas autorisé à ajouter des véhicules.</Text>
      </Box>
    );
  }
  return children;
}
