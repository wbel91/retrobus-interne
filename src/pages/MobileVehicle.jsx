import {
  Box, Heading, Text, Button, Stack, Input, Textarea, VStack, HStack,
  Spinner, Center, useToast, Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalCloseButton, ModalBody, ModalFooter, FormControl, FormLabel
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

/**
 * Page mobile d'accès via QR
 * - URL expected: /mobile/v/:parc?t=<token>
 * - If token valid, we fetch vehicle and allow anonymous writes via token header.
 * - If token invalid or absent, user must authenticate (matricule) via UserContext.
 */
export default function MobileVehicle() {
  const { parc } = useParams();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const nav = useNavigate();

  const tokenFromUrl = searchParams.get("t") || "";
  const { matricule, setMatricule } = useUser();

  const [token, setToken] = useState(tokenFromUrl || "");
  const [veh, setVeh] = useState(null);
  const [events, setEvents] = useState([]);
  const [usages, setUsages] = useState([]);
  const [loading, setLoading] = useState(true);

  // modals
  const [showAnomaly, setShowAnomaly] = useState(false);
  const [showPassage, setShowPassage] = useState(false);
  const [showEvent, setShowEvent] = useState(false);

  // auth form (matricule) for fallback
  const [inputMatricule, setInputMatricule] = useState(matricule || "");
  const [authLoading, setAuthLoading] = useState(false);

  // headers to use for API calls (token preferred)
  const headersFor = (t = token, useMatricule = matricule) => {
    const h = { "Content-Type": "application/json" };
    if (t) h["x-qr-token"] = t;
    else if (useMatricule) h["x-user-matricule"] = useMatricule;
    return h;
  };

  // fetch vehicle + related data
  useEffect(() => {
    let stop = false;
    (async () => {
      try {
        setLoading(true);
        const h = token ? { "x-qr-token": token } : {};
        const [rv, re, ru] = await Promise.all([
          fetch(`${API}/vehicles/${encodeURIComponent(parc)}`, { headers: h }).then(r => r.ok ? r.json() : Promise.reject(r.status)),
          fetch(`${API}/vehicles/${encodeURIComponent(parc)}/events`, { headers: h }).then(r => r.ok ? r.json() : []),
          fetch(`${API}/vehicles/${encodeURIComponent(parc)}/usages`, { headers: h }).then(r => r.ok ? r.json() : []),
        ]);
        if (stop) return;
        setVeh(rv);
        setEvents(Array.isArray(re) ? re : []);
        setUsages(Array.isArray(ru) ? ru : []);
      } catch (err) {
        // token invalid or other error — clear vehicle so user must auth
        console.warn("fetch vehicle failed:", err);
        setVeh(null);
        setEvents([]);
        setUsages([]);
      } finally {
        if (!stop) setLoading(false);
      }
    })();
    return () => { stop = true; };
  }, [parc, token]);

  const onAuthenticate = async (e) => {
    e?.preventDefault?.();
    if (!inputMatricule?.trim()) return toast({ status: "warning", title: "Matricule requis" });
    try {
      setAuthLoading(true);
      // simulate auth — here simply store matricule in context
      // if you have server auth, replace this by an API call
      setMatricule(inputMatricule.trim());
      toast({ status: "success", title: "Connecté", description: inputMatricule.trim() });
      // re-fetch using matricule header
      setToken(""); // ensure using matricule
      setTimeout(() => {
        // small delay to let header propagate
        (async () => {
          try {
            setLoading(true);
            const h = { "x-user-matricule": inputMatricule.trim() };
            const [rv, re, ru] = await Promise.all([
              fetch(`${API}/vehicles/${encodeURIComponent(parc)}`, { headers: h }).then(r => r.ok ? r.json() : Promise.reject()),
              fetch(`${API}/vehicles/${encodeURIComponent(parc)}/events`, { headers: h }).then(r => r.ok ? r.json() : []),
              fetch(`${API}/vehicles/${encodeURIComponent(parc)}/usages`, { headers: h }).then(r => r.ok ? r.json() : []),
            ]);
            setVeh(rv);
            setEvents(Array.isArray(re) ? re : []);
            setUsages(Array.isArray(ru) ? ru : []);
          } catch (err) {
            toast({ status: "error", title: "Accès refusé" });
          } finally {
            setLoading(false);
          }
        })();
      }, 250);
    } finally {
      setAuthLoading(false);
    }
  };

  // submit helpers
  const postEvent = async (payload) => {
    try {
      const r = await fetch(`${API}/vehicles/${encodeURIComponent(parc)}/events`, {
        method: "POST",
        headers: headersFor(),
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const err = await r.json().catch(()=>({error:'err'}));
        throw new Error(err?.error || r.statusText || "Erreur");
      }
      const j = await r.json();
      setEvents(prev => [j, ...prev]);
      toast({ status: "success", title: "Événement ajouté" });
      return j;
    } catch (e) {
      console.error(e);
      toast({ status: "error", title: "Impossible d'ajouter l'événement", description: String(e.message) });
      throw e;
    }
  };

  const postUsage = async (payload) => {
    try {
      const r = await fetch(`${API}/vehicles/${encodeURIComponent(parc)}/usages`, {
        method: "POST",
        headers: headersFor(),
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const err = await r.json().catch(()=>({error:'err'}));
        throw new Error(err?.error || r.statusText || "Erreur");
      }
      const j = await r.json();
      setUsages(prev => [j, ...prev]);
      toast({ status: "success", title: "Usage ajouté" });
      return j;
    } catch (e) {
      console.error(e);
      toast({ status: "error", title: "Impossible d'ajouter l'usage", description: String(e.message) });
      throw e;
    }
  };

  // If loading show spinner, if no vehicle and no token -> show authentication form (matricule)
  if (loading) return <Center p={8}><Spinner size="lg" /></Center>;

  return (
    <Box p={4} maxW="720px" mx="auto">
      {(!veh) ? (
        <Box textAlign="center" py={8}>
          <Heading size="md">Accès restreint</Heading>
          <Text mt={2} opacity={0.8}>
            Ce carnet est accessible uniquement via le QR code du véhicule ou après authentification.
          </Text>

          <Box mt={6} as="form" onSubmit={onAuthenticate} maxW="360px" mx="auto">
            <VStack spacing={3}>
              <FormControl>
                <FormLabel>Matricule</FormLabel>
                <Input value={inputMatricule} onChange={e => setInputMatricule(e.target.value)} placeholder="ex: w.belaidi" />
              </FormControl>
              <HStack>
                <Button colorScheme="blue" onClick={onAuthenticate} isLoading={authLoading}>Se connecter</Button>
                <Button variant="ghost" onClick={() => nav(-1)}>Retour</Button>
              </HStack>
            </VStack>
          </Box>

          <Text mt={4} fontSize="sm" opacity={0.8}>
            Astuce : scannez le QR sur le véhicule pour accéder sans vous connecter.
          </Text>
        </Box>
      ) : (
        // Main mobile dashboard
        <Box>
          <Heading size="md">{veh.modele || `Parc ${veh.parc}`}</Heading>
          <Text mt={1} opacity={0.8}>{veh.immat ? `${veh.immat} · Parc ${veh.parc}` : `Parc ${veh.parc}`}</Text>

          <Stack spacing={4} mt={6}>
            <Button colorScheme="red" onClick={() => setShowAnomaly(true)}>Signaler une anomalie</Button>
            <Button colorScheme="orange" onClick={() => setShowPassage(true)}>Signaler un passage</Button>
            <Button colorScheme="blue" onClick={() => setShowEvent(true)}>Ajouter un évènement au véhicule</Button>
          </Stack>

          <Box mt={6}>
            <Heading size="sm" mb={2}>Derniers événements</Heading>
            <VStack spacing={2} align="stretch">
              {events.length === 0 && <Text opacity={0.7}>Aucun événement</Text>}
              {events.map(ev => (
                <Box key={ev.id} p={3} border="1px solid #eee" borderRadius="md">
                  <Text fontSize="sm"><b>{ev.type}</b> · {new Date(ev.date).toLocaleString()}</Text>
                  {ev.note && <Text mt={1} fontSize="sm">{ev.note}</Text>}
                  <Text mt={1} fontSize="xs" opacity={0.7}>Ajouté par {ev.createdBy || '—'}</Text>
                </Box>
              ))}
            </VStack>
          </Box>

          <Box mt={6}>
            <Heading size="sm" mb={2}>Derniers passages</Heading>
            <VStack spacing={2} align="stretch">
              {usages.length === 0 && <Text opacity={0.7}>Aucun passage</Text>}
              {usages.map(u => (
                <Box key={u.id} p={3} border="1px solid #eee" borderRadius="md">
                  <Text fontSize="sm">{u.conducteur || '—'} · {u.km ? `${u.km} km` : '—'} · {u.durationMin ? `${u.durationMin} min` : ''}</Text>
                  {u.note && <Text mt={1} fontSize="sm">{u.note}</Text>}
                  <Text mt={1} fontSize="xs" opacity={0.7}>Ajouté par {u.createdBy || '—'}</Text>
                </Box>
              ))}
            </VStack>
          </Box>
        </Box>
      )}

      {/* Modals */}

      {/* Anomaly modal */}
      <Modal isOpen={showAnomaly} onClose={() => setShowAnomaly(false)} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Signaler une anomalie</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={3} align="stretch">
              <Text fontSize="sm" opacity={0.8}>
                Véhicule : <b>{veh?.parc}</b> {veh?.immat ? `· ${veh.immat}` : ""}
              </Text>
              <FormControl>
                <FormLabel>Type d'anomalie</FormLabel>
                <Input id="anom-type" placeholder="ex: Frein / Porte / Moteur" />
              </FormControl>
              <FormControl>
                <FormLabel>Description</FormLabel>
                <Textarea id="anom-note" placeholder="Décris l'anomalie..." />
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" onClick={() => setShowAnomaly(false)}>Annuler</Button>
            <Button colorScheme="red" onClick={async () => {
              const type = document.getElementById("anom-type")?.value || "Anomalie";
              const note = document.getElementById("anom-note")?.value || "";
              try {
                await postEvent({ type: `Anomalie: ${type}`, note });
                setShowAnomaly(false);
              } catch {}
            }}>Signaler</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Passage modal */}
      <Modal isOpen={showPassage} onClose={() => setShowPassage(false)} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Signaler un passage</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={3} align="stretch">
              <Text fontSize="sm" opacity={0.8}>Véhicule : <b>{veh?.parc}</b> {veh?.immat ? `· ${veh.immat}` : ""}</Text>
              <FormControl>
                <FormLabel>Conducteur</FormLabel>
                <Input id="pass-conducteur" placeholder="Nom ou matricule" />
              </FormControl>
              <FormControl>
                <FormLabel>Km parcourus (optionnel)</FormLabel>
                <Input id="pass-km" placeholder="ex: 12" type="number" />
              </FormControl>
              <FormControl>
                <FormLabel>Durée (min, optionnel)</FormLabel>
                <Input id="pass-duration" placeholder="ex: 45" type="number" />
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" onClick={() => setShowPassage(false)}>Annuler</Button>
            <Button colorScheme="orange" onClick={async () => {
              const conducteur = document.getElementById("pass-conducteur")?.value || "";
              const km = Number(document.getElementById("pass-km")?.value || "") || null;
              const durationMin = Number(document.getElementById("pass-duration")?.value || "") || null;
              try {
                await postUsage({ conducteur: conducteur || null, km, durationMin, note: "" });
                setShowPassage(false);
              } catch {}
            }}>Signaler</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Generic event modal */}
      <Modal isOpen={showEvent} onClose={() => setShowEvent(false)} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Ajouter un événement</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={3} align="stretch">
              <Text fontSize="sm" opacity={0.8}>Véhicule : <b>{veh?.parc}</b></Text>
              <FormControl>
                <FormLabel>Type</FormLabel>
                <Input id="evt-type" placeholder="ex: Révision" />
              </FormControl>
              <FormControl>
                <FormLabel>Note</FormLabel>
                <Textarea id="evt-note" placeholder="Détails..." />
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" onClick={() => setShowEvent(false)}>Annuler</Button>
            <Button colorScheme="blue" onClick={async () => {
              const type = document.getElementById("evt-type")?.value || "Événement";
              const note = document.getElementById("evt-note")?.value || "";
              try {
                await postEvent({ type, note });
                setShowEvent(false);
              } catch {}
            }}>Ajouter</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
