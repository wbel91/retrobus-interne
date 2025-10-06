import React, { useEffect, useState, useCallback } from "react";
import {
  Box, Heading, HStack, VStack, Button, Table, Thead, Tbody, Tr, Th, Td,
  Input, useToast, IconButton, Text, Flex, Tag, TagLabel, TagCloseButton, Alert, AlertIcon, Spinner, Center
} from "@chakra-ui/react";
import { FiRefreshCw, FiTrash2, FiMail, FiPlus } from "react-icons/fi";
import { useUser } from '../context/UserContext';

export default function Newsletter() {
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [fallback, setFallback] = useState(false);
  const toast = useToast();
  const { token, isAuthenticated } = useUser();

  const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

  const fetchSubscribers = useCallback(async (opts = { manual: false }) => {
    if (!token) {
      return; // on attend le token
    }
    setLoading(true);
    setFallback(false);
    try {
      const res = await fetch(`${API}/newsletter`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      // Debug log
      // eslint-disable-next-line no-console
      console.log('[Newsletter] GET /newsletter status =', res.status);

      if (res.status === 401) {
        toast({ status: "error", title: "Non autorisé", description: "Token invalide ou expiré" });
        setSubscribers([]);
        return;
      }
      if (!res.ok) {
        throw new Error(`Status ${res.status}`);
      }
      const data = await res.json();
      setSubscribers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('[Newsletter] fetch error:', e);
      // Mode dégradé uniquement si vraiment échec réseau ou serveur (et pas auth)
      setFallback(true);
      if (!opts.manual) {
        toast({
          status: "warning",
            title: "Mode dégradé",
            description: "Affichage de données de démonstration (échec API)"
        });
      }
      setSubscribers([
        { id: "demo1", email: "demo@example.com", status: "CONFIRMED", createdAt: new Date().toISOString() },
        { id: "demo2", email: "test@rbe.fr", status: "PENDING", createdAt: new Date().toISOString() }
      ]);
    } finally {
      setLoading(false);
    }
  }, [API, token, toast]);

  // Requête quand le token devient disponible
  useEffect(() => {
    if (token) {
      fetchSubscribers();
    }
  }, [token, fetchSubscribers]);

  const handleAdd = async () => {
    if (!newEmail.includes('@')) {
      toast({ status: "error", title: "Email invalide" });
      return;
    }
    if (!token) {
      toast({ status: "error", title: "Authentification requise" });
      return;
    }
    setAdding(true);
    try {
      const res = await fetch(`${API}/newsletter`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email: newEmail })
      });
      if (res.status === 401) {
        toast({ status: "error", title: "Session expirée" });
        return;
      }
      if (res.status === 409) {
        toast({ status: "info", title: "Existe déjà" });
        return;
      }
      if (!res.ok) throw new Error();
      toast({ status: "success", title: "Abonné ajouté" });
      setNewEmail("");
      fetchSubscribers({ manual: true });
    } catch {
      toast({ status: "error", title: "Échec d'ajout" });
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Supprimer cet abonné ?")) return;
    if (!token) {
      toast({ status: "error", title: "Authentification requise" });
      return;
    }
    try {
      const res = await fetch(`${API}/newsletter/${id}`, {
        method: "DELETE",
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.status === 401) {
        toast({ status: "error", title: "Session expirée" });
        return;
      }
      if (!res.ok) throw new Error();
      toast({ status: "success", title: "Supprimé" });
      setSubscribers(prev => prev.filter(s => s.id !== id));
    } catch {
      toast({ status: "error", title: "Échec suppression" });
    }
  };

  if (!isAuthenticated) {
    return (
      <Center minH="300px">
        <Text>Veuillez vous connecter.</Text>
      </Center>
    );
  }

  return (
    <Box p={6}>
      <HStack justify="space-between" mb={6}>
        <Heading size="lg">Gestion Newsletter</Heading>
        <HStack>
          <Button
            leftIcon={<FiRefreshCw />}
            size="sm"
            variant="outline"
            onClick={() => fetchSubscribers({ manual: true })}
            isLoading={loading}
          >
            Rafraîchir
          </Button>
          <Button
            leftIcon={<FiMail />}
            size="sm"
            colorScheme="blue"
            disabled
            title="Fonction à venir"
          >
            Campagne (bientôt)
          </Button>
        </HStack>
      </HStack>

      {fallback && (
        <Alert status="warning" mb={4}>
          <AlertIcon />
          Données en mode dégradé (API indisponible ou erreur)
        </Alert>
      )}

      <Flex gap={3} mb={6} flexWrap="wrap" align="center">
        <Input
          placeholder="nouvel.abonne@email..."
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          maxW="280px"
        />
        <Button
          leftIcon={<FiPlus />}
          colorScheme="green"
          onClick={handleAdd}
          isLoading={adding}
        >
          Ajouter
        </Button>
        <Tag size="lg" variant="subtle" colorScheme="purple">
          <TagLabel>{subscribers.length} inscrits</TagLabel>
          {subscribers.length > 0 && (
            <TagCloseButton
              onClick={() => {
                if (confirm("Vider la liste locale affichée ? (ne supprime pas en base)")) setSubscribers([]);
              }}
            />
          )}
        </Tag>
      </Flex>

      <Box borderWidth="1px" borderRadius="lg" overflowX="auto">
        {loading ? (
          <Center py={10}>
            <Spinner />
          </Center>
        ) : (
          <Table size="sm">
            <Thead bg="gray.50">
              <Tr>
                <Th>Email</Th>
                <Th>Statut</Th>
                <Th>Inscription</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {subscribers.map(sub => (
                <Tr key={sub.id}>
                  <Td fontWeight="semibold">{sub.email}</Td>
                  <Td>
                    <Text
                      fontSize="xs"
                      px={2}
                      py={1}
                      borderRadius="md"
                      bg={sub.status === 'CONFIRMED' ? 'green.100' : 'yellow.100'}
                      display="inline-block"
                    >
                      {sub.status}
                    </Text>
                  </Td>
                  <Td fontSize="xs">
                    {sub.createdAt ? new Date(sub.createdAt).toLocaleDateString() : '-'}
                  </Td>
                  <Td>
                    <IconButton
                      aria-label="Supprimer"
                      icon={<FiTrash2 />}
                      size="xs"
                      colorScheme="red"
                      variant="ghost"
                      onClick={() => handleDelete(sub.id)}
                    />
                  </Td>
                </Tr>
              ))}
              {subscribers.length === 0 && !loading && (
                <Tr>
                  <Td colSpan={4}>
                    <Text fontSize="sm" color="gray.500" textAlign="center" py={8}>
                      Aucun abonné pour le moment.
                    </Text>
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        )}
      </Box>

      <Box mt={8} fontSize="xs" color="gray.500">
        <Text mb={1}>Roadmap :</Text>
        <ul style={{ marginLeft: "16px", lineHeight: 1.5 }}>
          <li>✔ Ajout / suppression manuelle</li>
          <li>⏳ Import CSV</li>
          <li>⏳ Double opt-in</li>
          <li>⏳ Campagnes email</li>
        </ul>
      </Box>
    </Box>
  );
}