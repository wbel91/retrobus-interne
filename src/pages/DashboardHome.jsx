import React, { useEffect, useMemo, useState } from "react";
import {
  Box, SimpleGrid, GridItem, Heading, Text, Button, Link as ChakraLink,
  Stack, Stat, StatLabel, StatNumber, HStack, VStack, Badge, useColorModeValue
} from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";

/*
  Cleaned DashboardHome
  - Removed top-right user block (already present in Header)
  - Removed left logo in hero (avoids duplication / jump)
  - Removed "QR Manager" from hero and shortcuts (moved to vehicles later)
  - Kept minimal helpers: loadFlashes, ArrowIcon
*/

const ANN_KEY = "rbe:announcements";

function loadFlashes() {
  try {
    const raw = localStorage.getItem(ANN_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    const now = Date.now();
    return arr.filter(f => f && f.active && (!f.expiresAt || new Date(f.expiresAt).getTime() > now));
  } catch (e) {
    console.warn("loadFlashes:", e);
    return [];
  }
}

// small inline arrow (no external dependency)
function ArrowIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5 12h14" />
      <path d="M12 5l7 7-7 7" />
    </svg>
  );
}

export default function DashboardHome() {
  const [flashes, setFlashes] = useState([]);
  const [recent, setRecent] = useState([]);
  const cardBg = useColorModeValue("white", "gray.700");
  const containerMaxW = "1100px";

  useEffect(() => {
    setFlashes(loadFlashes());
  }, []);

  useEffect(() => {
    let mounted = true;

    const API = import.meta.env.VITE_API_URL || ''; // e.g., https://<your-railway>.up.railway.app
    const token = localStorage.getItem('token');

    function labelOf(v) {
      const parts = [];
      if (v.marque) parts.push(v.marque);
      if (v.modele) parts.push(v.modele);
      const base = parts.join(' ') || v.parc || v.id || '—';
      return v.subtitle ? `${base} — ${v.subtitle}` : base;
    }

    async function fetchRecent() {
      try {
        if (!API) throw new Error('VITE_API_URL not set');
        const res = await fetch(`${API}/vehicles`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : ''
          }
        });
        if (!mounted) return;

        if (!res.ok) {
          // fallback demo row if unauthorized or other error
          setRecent([{ id: "RBE-001", name: "RBE 920", parc: "Parc A" }]);
          return;
        }

        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        // Normalize to { id, name, parc } and slice 5
        const normalized = list.slice(0, 5).map(v => ({
          id: v.parc || v.id,
          name: labelOf(v),
          parc: v.parc
        }));
        setRecent(normalized);
      } catch (e) {
        if (!mounted) return;
        setRecent([{ id: "RBE-001", name: "RBE 920", parc: "Parc A" }]);
      }
    }

    fetchRecent();
    return () => { mounted = false; };
  }, []);

  const urgent = useMemo(() => flashes.filter(f => f.category === "INFO"), [flashes]);
  const others = useMemo(() => flashes.filter(f => f.category !== "INFO"), [flashes]);

  return (
    <Box px={{ base: 4, md: 6 }} py={{ base: 6, md: 10 }} maxW="1200px" mx="auto">
      {/* Hero: simplified (no left logo, no right user block) */}
      <Box maxW={containerMaxW} mx="auto" mb={6}>
        <Stack direction="column" spacing={4} align="flex-start">
          <Box>
            <Heading size={{ base: "md", md: "lg" }}>Bienvenue sur l'intranet</Heading>
            <Text color="gray.600" mt={1}>Accès rapide aux outils et actualités.</Text>
          </Box>

          <HStack spacing={3} mt={2}>
            <Button as={RouterLink} to="/dashboard/vehicules" colorScheme="blue" size="sm" rightIcon={<ArrowIcon />}>Véhicules</Button>
            <Button as={RouterLink} to="/dashboard/myrbe" variant="outline" size="sm">MyRBE</Button>
            {/* QR Manager removed from hero - will be handled under Vehicles later */}
          </HStack>
        </Stack>
      </Box>

      {/* Top stats */}
      <Box maxW={containerMaxW} mx="auto" mb={6}>
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
          <Box bg={cardBg} p={4} borderRadius="md" boxShadow="sm">
            <Stat>
              <StatLabel>Véhicules</StatLabel>
              <StatNumber>—</StatNumber>
              <Text mt={2} fontSize="sm" color="gray.600">Consulter la liste</Text>
              <Button as={RouterLink} to="/dashboard/vehicules" size="sm" mt={3} colorScheme="blue">Voir</Button>
            </Stat>
          </Box>

          <Box bg={cardBg} p={4} borderRadius="md" boxShadow="sm">
            <Stat>
              <StatLabel>Pointage</StatLabel>
              <StatNumber>—</StatNumber>
              <Text mt={2} fontSize="sm" color="gray.600">MyRBE</Text>
              <Button as={RouterLink} to="/dashboard/myrbe" size="sm" mt={3}>Ouvrir</Button>
            </Stat>
          </Box>

          <Box bg={cardBg} p={4} borderRadius="md" boxShadow="sm">
            <Stat>
              <StatLabel>Notifications</StatLabel>
              <StatNumber>{flashes.length}</StatNumber>
              <Text mt={2} fontSize="sm" color="gray.600">Flashes actifs</Text>
              <Button onClick={() => window.location.hash = "#/"} size="sm" mt={3}>Voir les flashs</Button>
            </Stat>
          </Box>
        </SimpleGrid>
      </Box>

      {/* Main */}
      <Box maxW={containerMaxW} mx="auto">
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
          <GridItem colSpan={{ base: 1, md: 2 }}>
            <Box mb={4}>
              <Heading size="sm" mb={3}>Flashs prioritaires</Heading>
              {urgent.length === 0 ? <Text color="gray.600">Aucun flash urgent</Text> : urgent.map(f => (
                <Box key={f.id} p={3} borderRadius="md" mb={3} bg="white" border="1px solid" borderColor="gray.100">
                  <HStack justify="space-between">
                    <Box>
                      <Badge colorScheme="red" variant="subtle" mb={2}>{f.category}</Badge>
                      <Text fontWeight="600">{f.message}</Text>
                      <Text fontSize="xs" color="gray.500">{f.createdAt ? new Date(f.createdAt).toLocaleString() : ""}</Text>
                    </Box>
                    <Button size="sm" variant="outline">Détails</Button>
                  </HStack>
                </Box>
              ))}

              <Heading size="sm" mb={3} mt={4}>Autres notifications</Heading>
              {others.length === 0 ? <Text color="gray.600">Aucune notification</Text> : others.map(f => (
                <Box key={f.id} p={2} borderRadius="md" mb={2} bg="white" border="1px solid" borderColor="gray.50">
                  <HStack justify="space-between">
                    <Text fontSize="sm">{f.message}</Text>
                    <Text fontSize="xs" color="gray.400">{f.category}</Text>
                  </HStack>
                </Box>
              ))}
            </Box>

            <Box bg={cardBg} p={4} borderRadius="md" boxShadow="sm">
              <Heading size="sm" mb={3}>Activité récente</Heading>
              {recent.length === 0 ? <Text color="gray.600">Aucune activité</Text> : recent.map(r => (
                <HStack key={r.id} justify="space-between" py={2} borderBottom="1px solid" borderColor="gray.50">
                  <Box>
                    <Text fontWeight="600">{r.name}</Text>
                    <Text fontSize="xs" color="gray.500">{r.parc || r.id}</Text>
                  </Box>
                  <Button as={RouterLink} to={`/dashboard/vehicules/${r.id}`} size="sm" variant="ghost">Ouvrir</Button>
                </HStack>
              ))}
            </Box>
          </GridItem>

          <GridItem>
            <Box bg={cardBg} p={4} borderRadius="md" boxShadow="sm">
              <Heading size="sm" mb={3}>Raccourcis</Heading>
              <VStack spacing={3} align="stretch">
                <ChakraLink as={RouterLink} to="/dashboard/vehicules"><Button width="100%" leftIcon={<ArrowIcon />} variant="ghost">Gérer les véhicules</Button></ChakraLink>
                <ChakraLink as={RouterLink} to="/dashboard/myrbe"><Button width="100%" leftIcon={<ArrowIcon />} variant="ghost">Pointage mobile</Button></ChakraLink>
                {/* QR Manager removed from shortcuts - will be placed under Vehicles later */}
                <ChakraLink as={RouterLink} to="/dashboard/mon-profil"><Button width="100%" leftIcon={<ArrowIcon />} variant="ghost">Mon Profil</Button></ChakraLink>
              </VStack>
            </Box>

            <Box bg={cardBg} p={4} borderRadius="md" boxShadow="sm" mt={4}>
              <Heading size="sm" mb={3}>Aide rapide</Heading>
              <Text fontSize="sm" color="gray.600">Documentation interne et contact admin.</Text>
              <Button mt={3} size="sm" onClick={() => window.alert("Documentation (à implémenter)")}>Documentation</Button>
            </Box>
          </GridItem>
        </SimpleGrid>
      </Box>
    </Box>
  );
}