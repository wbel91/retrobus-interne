import React, { useEffect, useMemo, useState } from "react";
import {
  Box, Flex, Heading, Text, Input, Spinner, Center, VStack, HStack, Button,
  SimpleGrid, Card, CardHeader, CardBody, IconButton, Badge, useToast, Image, Divider
} from "@chakra-ui/react";
import { useUser } from "../context/UserContext.jsx";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

/**
 * RétroMail — simple internal mailbox UI reading files from /retromail
 *
 * - Requires server endpoints:
 *   GET /retromail/list -> [ "report-123.json", ... ]
 *   GET /retromail/<filename> -> JSON payload saved by server
 *   Static files served under /retromail and /retromail/uploads
 *
 * LocalStorage keys:
 * - `retromail:read:<matricule>` -> JSON map { "<filename>": timestampMs }
 * - `retromail:released:<uploadFilename>` -> "1" when admin released a video for download
 */

function readMapKey(matricule) { return `retromail:read:${matricule || "anon"}`; }
function releasedKey(filename) { return `retromail:released:${filename}`; }

export default function RetroMail() {
  const { matricule, prenom, isAdmin } = useUser();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState([]); // array of filenames from server
  const [messages, setMessages] = useState([]); // array of { filename, json }
  const [selected, setSelected] = useState(null); // filename
  const [query, setQuery] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const r = await fetch(`${API.replace(/\/$/,'')}/retromail/list`);
        if (!mounted) return;
        if (!r.ok) throw new Error(`status ${r.status}`);
        const list = await r.json();
        setFiles(Array.isArray(list) ? list : []);
      } catch (e) {
        console.warn("retromail list failed", e);
        setFiles(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // fetch all JSON contents for listing/preview
  useEffect(() => {
    let mounted = true;
    if (!files || files.length === 0) {
      setMessages([]);
      return;
    }
    (async () => {
      try {
        const arr = await Promise.all(files.map(async (fn) => {
          try {
            const r = await fetch(`${API.replace(/\/$/,'')}/retromail/${encodeURIComponent(fn)}`);
            if (!r.ok) return null;
            const json = await r.json();
            return { filename: fn, json };
          } catch (e) {
            return null;
          }
        }));
        if (!mounted) return;
        const filtered = arr.filter(Boolean).sort((a,b) => {
          const ta = new Date(a.json.createdAt || 0).getTime();
          const tb = new Date(b.json.createdAt || 0).getTime();
          return tb - ta;
        });
        setMessages(filtered);
        if (!selected && filtered.length > 0) setSelected(filtered[0].filename);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => { mounted = false; };
  }, [files]);

  // read/unread helpers
  const markRead = (filename) => {
    const key = readMapKey(matricule);
    try {
      const raw = localStorage.getItem(key);
      const map = raw ? JSON.parse(raw) : {};
      map[filename] = Date.now();
      localStorage.setItem(key, JSON.stringify(map));
    } catch (e) { /* ignore */ }
  };
  const isRead = (filename) => {
    try {
      const raw = localStorage.getItem(readMapKey(matricule));
      if (!raw) return false;
      const map = JSON.parse(raw);
      return Boolean(map && map[filename]);
    } catch (e) { return false; }
  };

  // release video (admin only) — persisted locally for now
  const releaseVideo = (uploadFilename) => {
    try {
      localStorage.setItem(releasedKey(uploadFilename), "1");
      toast({ status: "success", title: "Vidéo libérée", description: "Le téléchargement est maintenant autorisé localement." });
      // force rerender
      setMessages(m => [...m]);
    } catch (e) {
      toast({ status: "error", title: "Impossible", description: String(e.message) });
    }
  };
  const isReleased = (uploadFilename) => {
    return localStorage.getItem(releasedKey(uploadFilename)) === "1";
  };

  const listFiltered = useMemo(() => {
    if (!messages) return [];
    const q = (query || "").trim().toLowerCase();
    if (!q) return messages;
    return messages.filter(m => {
      const j = m.json || {};
      return (String(j.parc || "").toLowerCase().includes(q)
        || String(j.id || "").toLowerCase().includes(q)
        || String(j.description || "").toLowerCase().includes(q));
    });
  }, [messages, query]);

  const current = messages.find(m => m.filename === selected);

  useEffect(() => {
    if (!selected) return;
    markRead(selected);
    // update messages state to reflect read change (force re-render)
    setMessages(prev => [...prev]);
  }, [selected]);

  return (
    <Box p={6}>
      <Heading size="lg" mb={4}>RétroMail</Heading>

      <Flex gap={6} align="stretch">
        {/* Left: list */}
        <Box w={{ base: "100%", md: "360px" }} borderWidth="1px" borderRadius="md" p={3} bg="white">
          <HStack mb={3}>
            <Input placeholder="Rechercher par parc / id / texte…" value={query} onChange={(e)=>setQuery(e.target.value)} />
            <Button size="sm" onClick={() => { setQuery(""); }}>Effacer</Button>
          </HStack>

          {loading && <Center p={6}><Spinner /></Center>}
          {!loading && files === null && (
            <Box p={4} bg="orange.50" borderRadius="md">
              <Text color="orange.800" fontWeight="600">API Retromail non disponible</Text>
              <Text fontSize="sm" color="gray.600">Aucune liste trouvée. Vérifie que le serveur expose <code>/retromail/list</code>.</Text>
            </Box>
          )}

          {!loading && listFiltered && listFiltered.length === 0 && (
            <Text color="gray.600" mt={3}>Aucun message.</Text>
          )}

          <VStack align="stretch" spacing={2} mt={3}>
            {listFiltered.map(item => {
              const j = item.json || {};
              const title = j.parc ? `Parc ${j.parc}` : `Fiche ${j.id || item.filename}`;
              const snippet = (j.description || "").slice(0, 120);
              const unread = !isRead(item.filename);
              return (
                <Card key={item.filename} size="sm" onClick={() => setSelected(item.filename)} cursor="pointer" bg={selected === item.filename ? "gray.50" : "white"}>
                  <CardHeader>
                    <Flex justify="space-between" align="center">
                      <Box>
                        <Text fontWeight="600">{title} {j.id ? <Badge ml={2}>{`#${j.id}`}</Badge> : null}</Text>
                        <Text fontSize="sm" color="gray.600">{snippet || <i>(Pas de description)</i>}</Text>
                      </Box>
                      <Box textAlign="right">
                        {!unread ? <Text fontSize="xs" color="gray.500">Lu</Text> : <Badge colorScheme="red">Nouveau</Badge>}
                        <Text fontSize="xs" color="gray.400">{j.createdAt ? new Date(j.createdAt).toLocaleString() : ""}</Text>
                      </Box>
                    </Flex>
                  </CardHeader>
                </Card>
              );
            })}
          </VStack>
        </Box>

        {/* Right: viewer */}
        <Box flex="1" borderWidth="1px" borderRadius="md" p={4} bg="white">
          {!current ? (
            <Center p={6}><Text color="gray.600">Sélectionne un message à lire.</Text></Center>
          ) : (
            <>
              <Flex justify="space-between" align="center" mb={3}>
                <Box>
                  <Heading size="md">Fiche pointage — {current.json.parc ? `Parc ${current.json.parc}` : current.json.id}</Heading>
                  <Text fontSize="sm" color="gray.600">ID: {current.json.id || current.filename} • {current.json.createdAt ? new Date(current.json.createdAt).toLocaleString() : ""}</Text>
                </Box>
                <Box>
                  <HStack spacing={2}>
                    <Button size="sm" as="a" href={`${API.replace(/\/$/,'')}/retromail/${encodeURIComponent(current.filename.replace(/\.json$/,'') + '.pdf')}`} target="_blank" rel="noreferrer">Télécharger PDF</Button>
                    <Button size="sm" variant="outline" onClick={() => {
                      // mark unread toggle
                      const key = readMapKey(matricule);
                      const raw = localStorage.getItem(key);
                      const map = raw ? JSON.parse(raw) : {};
                      if (map[current.filename]) { delete map[current.filename]; } else { map[current.filename] = Date.now(); }
                      localStorage.setItem(key, JSON.stringify(map));
                      setMessages(m => [...m]);
                    }}>{isRead(current.filename) ? "Marquer non lu" : "Marquer lu"}</Button>
                  </HStack>
                </Box>
              </Flex>

              <Divider mb={3} />

              <Box mb={4}>
                <Text fontWeight="600">Initiateur :</Text>
                <Text mb={2}>{current.json.conducteur || "—"}</Text>

                <Text fontWeight="600">Participants :</Text>
                <Text mb={2}>{(current.json.participants || []).join(", ") || "—"}</Text>

                <Text fontWeight="600">Description :</Text>
                <Text mb={3} whiteSpace="pre-wrap">{current.json.description || "—"}</Text>

                <Text fontWeight="600" mb={2}>Images :</Text>
                { (current.json.files || []).filter(f => (f.mime||"").startsWith('image/')).length === 0 ? (
                  <Text color="gray.600" mb={2}>Aucune image.</Text>
                ) : (
                  <SimpleGrid columns={{ base: 1, md: 3 }} gap={3} mb={3}>
                    { (current.json.files || []).filter(f => (f.mime||"").startsWith('image/')).map((f,i) => (
                      <Box key={i} borderWidth="1px" p={2} borderRadius="md" bg="gray.50">
                        <Image src={`${API.replace(/\/$/,'')}/retromail/uploads/${encodeURIComponent(f.filename)}`} alt={f.originalname || f.filename} objectFit="cover" maxH="160px" w="100%" />
                        <HStack mt={2} justify="space-between">
                          <Text fontSize="sm" noOfLines={1}>{f.originalname || f.filename}</Text>
                          <Button size="sm" as="a" href={`${API.replace(/\/$/,'')}/retromail/uploads/${encodeURIComponent(f.filename)}`} target="_blank" rel="noreferrer">Ouvrir</Button>
                        </HStack>
                      </Box>
                    )) }
                  </SimpleGrid>
                )}

                <Text fontWeight="600" mb={2}>Vidéos (séparées)</Text>
                { (current.json.files || []).filter(f => ((f.mime||'').startsWith('video/') || /\.(mp4|mov|avi|mkv)$/i.test(f.originalname || f.filename))).length === 0 ? (
                  <Text color="gray.600">Aucune vidéo.</Text>
                ) : (
                  <VStack align="stretch" spacing={2} mb={3}>
                    { (current.json.files || []).filter(f => ((f.mime||'').startsWith('video/') || /\.(mp4|mov|avi|mkv)$/i.test(f.originalname || f.filename))).map((v,i) => {
                      const released = isReleased(v.filename);
                      return (
                        <Box key={i} p={3} borderWidth="1px" borderRadius="md">
                          <Flex justify="space-between" align="center">
                            <Box>
                              <Text fontWeight="600" noOfLines={1}>{v.originalname || v.filename}</Text>
                              <Text fontSize="sm" color="gray.500">{(v.size/1024|0)} KB</Text>
                              {!released && <Text fontSize="xs" color="orange.600">Téléchargement restreint (à analyser)</Text>}
                            </Box>
                            <HStack>
                              {isAdmin && !released && (
                                <Button size="sm" colorScheme="green" onClick={() => releaseVideo(v.filename)}>Libérer le téléchargement</Button>
                              )}
                              <Button
                                size="sm"
                                as="a"
                                href={released ? `${API.replace(/\/$/,'')}/retromail/uploads/${encodeURIComponent(v.filename)}` : "#"}
                                target="_blank"
                                rel="noreferrer"
                                isDisabled={!released}
                              >
                                {released ? "Télécharger" : "Demandé"}
                              </Button>
                            </HStack>
                          </Flex>
                        </Box>
                      );
                    })}
                  </VStack>
                )}
              </Box>
            </>
          )}
        </Box>
      </Flex>
    </Box>
  );
}
