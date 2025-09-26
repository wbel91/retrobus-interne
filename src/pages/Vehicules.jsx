// src/pages/Vehicules.jsx
import {
  Box, Heading, Input, SimpleGrid, Card, CardHeader, CardBody,
  Text, Badge, HStack, Spinner, Center, Button, Flex, useToast,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody,
} from "@chakra-ui/react";
import { useEffect, useState, useCallback, useRef } from "react";
import { Link as RouterLink } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";
// Remplace par ton domaine de prod si tu veux que les QR pointent vers le site public
const PUBLIC_BASE = import.meta.env.VITE_PUBLIC_BASE || window.location.origin; // ex https://retrobus-essonne.fr

function EtatBadge({ etat }) {
  const map = { Service: "green", "Préservé": "blue", "A VENIR": "gray" };
  const color = map[etat] || "purple";
  return <Badge colorScheme={color}>{etat}</Badge>;
}

export default function Vehicules() {
  const [q, setQ] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  // modal QR
  const [selectedVehicule, setSelectedVehicule] = useState(null);
  const qrCanvasRef = useRef(null);

  // fetchList accepte un signal optionnel
  const fetchList = useCallback(async (signal) => {
    try {
      setLoading(true);
      const url = q.trim()
        ? `${API}/vehicles?q=${encodeURIComponent(q.trim())}`
        : `${API}/vehicles`;
      const r = await fetch(url, signal ? { signal } : undefined);
      const json = await r.json();
      setData(Array.isArray(json) ? json : []);
    } catch (e) {
      if (e.name !== "AbortError") {
        console.error(e);
        setData([]);
        toast({ status: "error", title: "Impossible de charger la liste" });
      }
    } finally {
      setLoading(false);
    }
  }, [q, toast]);

  useEffect(() => {
    const controller = new AbortController();
    fetchList(controller.signal);
    return () => controller.abort();
  }, [fetchList]);

  // URL que contiendra le QR : PUBLIC_BASE + /mobile/v/:parc
  const qrValueFor = (parc) => `${PUBLIC_BASE}/#/mobile/v/${encodeURIComponent(parc)}`;
  // si tu utilises BrowserRouter en prod (sans hash), adapte en `${PUBLIC_BASE}/mobile/v/${parc}`

  const downloadPNG = () => {
    const canvas = qrCanvasRef.current;
    if (!canvas) {
      toast({ status: "error", title: "QR non prêt", description: "Réessayez après quelques instants." });
      return;
    }
    try {
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      const nameBase = selectedVehicule?.immat?.trim() ? selectedVehicule.immat.trim() : selectedVehicule?.parc;
      link.download = `QR_${String(nameBase || "vehicule").replace(/[^A-Za-z0-9_-]+/g, "_")}.png`;
      link.click();
    } catch (e) {
      console.error(e);
      toast({ status: "error", title: "Téléchargement impossible" });
    }
  };

  return (
    <Box p={6}>
      <Flex align="center" justify="space-between" gap={4} wrap="wrap">
        <Heading size="lg">Véhicules</Heading>
        <HStack>
          <Button as={RouterLink} to="/dashboard/vehicules/ajouter" colorScheme="blue">
            Ajouter
          </Button>

          {/* Nouveau : accès clair à la page de gestion des QR */}
          <Button as={RouterLink} to="/dashboard/qr" variant="outline">
            Gérer les QR
          </Button>
        </HStack>
      </Flex>

      <Input
        mt={4}
        placeholder="Rechercher par parc, modèle, immatriculation, état…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {loading ? (
        <Center mt={10}><Spinner size="lg" /></Center>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4} mt={6}>
          {data.map((v) => (
            <Card key={v.parc} _hover={{ transform: "translateY(-2px)", boxShadow: "md" }} transition="all .15s">
              <CardHeader pb={2}>
                <HStack justify="space-between" w="100%">
                  <Heading size="md">Parc {v.parc}</Heading>
                  <EtatBadge etat={v.etat} />
                </HStack>
              </CardHeader>
              <CardBody pt={0}>
                <Text opacity={0.85}><b>Type :</b> {v.type}</Text>
                <Text opacity={0.85}><b>Modèle :</b> {v.modele}</Text>
                <Text opacity={0.85}><b>Immat :</b> {v.immat || "—"}</Text>

                <HStack mt={3} justify="flex-end" spacing={2}>
                  {/* QR Button ouvre la modale avec un aperçu et téléchargement */}
                  <Button size="sm" onClick={() => { setSelectedVehicule(v); }}>
                    QR Code
                  </Button>

                  {/* Ouvrir la fiche */}
                  <Button as={RouterLink} to={`/dashboard/vehicules/${encodeURIComponent(v.parc)}`} size="sm">
                    Ouvrir
                  </Button>
                </HStack>
              </CardBody>
            </Card>
          ))}
        </SimpleGrid>
      )}

      {/* Modal QR */}
      <Modal isOpen={!!selectedVehicule} onClose={() => setSelectedVehicule(null)} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>QR Code - Parc {selectedVehicule?.parc}</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6} display="flex" flexDirection="column" alignItems="center" gap={3}>
            {selectedVehicule ? (
              <>
                <QRCodeCanvas
                  value={qrValueFor(selectedVehicule.parc)}
                  size={220}
                  includeMargin={true}
                  ref={qrCanvasRef}
                />
                <Text fontSize="sm" opacity={0.8} textAlign="center" mt={2}>
                  Scannez depuis votre téléphone pour ouvrir MyRBE pour le véhicule.
                </Text>

                <HStack mt={3}>
                  <Button onClick={downloadPNG} size="sm">Télécharger PNG</Button>
                  <Button as="a" href={qrValueFor(selectedVehicule.parc)} target="_blank" size="sm" rel="noreferrer">Tester</Button>
                  <Button as={RouterLink} to={`/dashboard/qr?parc=${encodeURIComponent(selectedVehicule.parc)}`} size="sm" variant="outline">
                    Gérer (page complète)
                  </Button>
                </HStack>
              </>
            ) : null}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}
