import React, { useEffect, useState } from "react";
import {
  Container, Heading, Text, Button, Stack, Select, Box, HStack,
  useToast, Spinner, Center, Modal, ModalOverlay, ModalContent,
  ModalHeader, ModalCloseButton, ModalBody, ModalFooter, FormControl,
  FormLabel, Input, Textarea, Tag, TagLabel, TagCloseButton, Wrap,
  Image, SimpleGrid, IconButton
} from "@chakra-ui/react";
import { useParams } from "react-router-dom";
import { useUser } from "../context/UserContext";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

const DEFAULT_MEMBERS = [
  { matricule: "w.belaidi", label: "Waiyl Belaidi" },
  { matricule: "m.ravichandran", label: "Méthusan Ravichandran" },
];

function lsKey(parc, matricule) {
  return `pointage:${parc}:${matricule}`;
}

function saveLocalReport(report) {
  try {
    const key = "rbe:reports:local";
    const raw = localStorage.getItem(key);
    const arr = raw ? JSON.parse(raw) : [];
    arr.unshift(report);
    localStorage.setItem(key, JSON.stringify(arr));
    return true;
  } catch (e) {
    console.error("saveLocalReport failed", e);
    return false;
  }
}

export default function MyRBEActions() {
  const { parc } = useParams();
  const toast = useToast();
  const { matricule, prenom } = useUser();

  const [veh, setVeh] = useState(null);
  const [loadingVeh, setLoadingVeh] = useState(true);

  const [members, setMembers] = useState(DEFAULT_MEMBERS);
  const [selectedMember, setSelectedMember] = useState(""); // set via effect from matricule
  const [participants, setParticipants] = useState([]); // autres participants ajoutés

  const [activePointage, setActivePointage] = useState(null); // { id, startedAt, conducteur, participants }
  const [busy, setBusy] = useState(false);

  // modals and inputs
  const [openPointerModal, setOpenPointerModal] = useState(false);
  const [openDepointerModal, setOpenDepointerModal] = useState(false);
  const [newMemberInput, setNewMemberInput] = useState("");
  const [depointerNote, setDepointerNote] = useState("");

  // report modal (fiche)
  const [openReportModal, setOpenReportModal] = useState(false);
  const [reportDescription, setReportDescription] = useState("");
  const [reportFiles, setReportFiles] = useState([]); // File[]
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportMeta, setReportMeta] = useState(null); // { usageId, startedAt, endedAt, conducteur, participants }

  // Load vehicle
  useEffect(() => {
    let stop = false;
    (async () => {
      try {
        setLoadingVeh(true);
        const r = await fetch(`${API}/vehicles/${encodeURIComponent(parc)}`);
        if (!r.ok) throw new Error("Véhicule introuvable");
        const j = await r.json();
        if (!stop) setVeh(j);
      } catch (e) {
        console.error(e);
        toast({ status: "error", title: "Impossible de charger le véhicule", description: String(e.message) });
      } finally {
        if (!stop) setLoadingVeh(false);
      }
    })();
    return () => { stop = true; };
  }, [parc, toast]);

  // Ensure selectedMember defaults to connected user matricule when available
  useEffect(() => {
    if (matricule && matricule.trim()) {
      setSelectedMember(matricule);
      // optionally add to members list if not present
      if (!members.some(m => m.matricule === matricule)) {
        setMembers(prev => [{ matricule, label: prenom ? `${prenom} (${matricule})` : matricule }, ...prev]);
      }
    } else {
      // fallback to first default member
      if (!selectedMember) setSelectedMember(DEFAULT_MEMBERS[0].matricule);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matricule, prenom]);

  // load active pointage from localStorage for the selected member
  useEffect(() => {
    if (!selectedMember) return;
    const key = lsKey(parc, selectedMember);
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        // older formats might be minimal, but prefer full shape
        const parsed = JSON.parse(raw);
        setActivePointage(parsed);
      } else {
        setActivePointage(null);
      }
    } catch (e) {
      console.warn("failed reading pointage from storage", e);
    }
  }, [parc, selectedMember]);

  const persistActiveLocal = (pt) => {
    const key = lsKey(parc, selectedMember);
    if (pt) {
      try {
        localStorage.setItem(key, JSON.stringify(pt));
      } catch (e) {
        console.warn("persistActiveLocal failed", e);
      }
    } else {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.warn("persistActiveLocal remove failed", e);
      }
    }
  };

  const formatTime = (iso) => {
    try { return new Date(iso).toLocaleString(); } catch { return iso; }
  };

  const handleAddMember = () => {
    const val = newMemberInput.trim();
    if (!val) return toast({ status: "warning", title: "Matricule requis" });
    // if user wants to add as participants (not change selectedMember), add to participants
    if (val === selectedMember) {
      setNewMemberInput("");
      return toast({ status: "info", title: "C'est déjà le membre principal" });
    }
    if (participants.includes(val)) {
      setNewMemberInput("");
      return toast({ status: "info", title: "Participant déjà ajouté" });
    }
    setParticipants(prev => [...prev, val]);
    // also add to members list (for future reuse)
    if (!members.some(m => m.matricule === val)) {
      setMembers(prev => [{ matricule: val, label: val }, ...prev]);
    }
    setNewMemberInput("");
    toast({ status: "success", title: "Participant ajouté" });
  };

  const removeParticipant = (mat) => {
    setParticipants(prev => prev.filter(p => p !== mat));
  };

  const startPointage = async () => {
    setBusy(true);
    try {
      // check server health first
      try {
        const h = await fetch(`${API}/health`);
        if (!h.ok) {
          toast({ status: "error", title: "API indisponible", description: "Le serveur est indisponible — le pointage informatique est désactivé." });
          setBusy(false);
          return;
        }
      } catch (e) {
        toast({ status: "error", title: "API indisponible", description: "Impossible de joindre le serveur — le pointage informatique est désactivé." });
        setBusy(false);
        return;
      }

      // snapshot participants at start
      const participantsSnapshot = [...participants];
      const payload = {
        conducteur: selectedMember || null,
        participants: participantsSnapshot,
        note: "pointage:start",
        startedAt: new Date().toISOString(),
      };

      const r = await fetch(`${API}/vehicles/${encodeURIComponent(parc)}/usages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-matricule": selectedMember || "" },
        body: JSON.stringify(payload),
      });

      if (!r.ok) {
        let errBody = null;
        try { errBody = await r.json(); } catch (_) { errBody = await r.text().catch(()=>null); }
        console.warn("startPointage server error", r.status, errBody);
        toast({ status: "error", title: "Échec du pointage", description: errBody?.error || `Erreur serveur (${r.status})` });
        setBusy(false);
        return;
      }

      const j = await r.json();
      const current = {
        id: j.id || `local-${Date.now()}`,
        startedAt: j.startedAt || payload.startedAt,
        conducteur: payload.conducteur,
        participants: payload.participants || []
      };
      setActivePointage(current);
      persistActiveLocal(current);
      toast({ status: "success", title: "Pointage démarré", description: `à ${formatTime(current.startedAt)}` });
      setOpenPointerModal(false);
    } catch (e) {
      console.error(e);
      toast({ status: "error", title: "Échec du pointage", description: String(e.message) });
    } finally {
      setBusy(false);
    }
  };

  const depointerWithNote = async () => {
    if (!activePointage) return;
    setBusy(true);
    const now = new Date().toISOString();

    // helper pour enregistrer une fin locale en dernier recours
    const saveLocalEnded = (usageId, startedAt) => {
      try {
        const key = "rbe:usages:local";
        const raw = localStorage.getItem(key);
        const arr = raw ? JSON.parse(raw) : [];
        const localEntry = {
          id: `local-end-${Date.now()}`,
          relatedTo: usageId,
          parc,
          startedAt: startedAt || activePointage.startedAt,
          endedAt: now,
          conducteur: activePointage.conducteur || selectedMember,
          participants: activePointage.participants || participants,
          note: depointerNote || "depointe",
          createdAt: new Date().toISOString(),
          synced: false
        };
        arr.unshift(localEntry);
        localStorage.setItem(key, JSON.stringify(arr));
        return localEntry;
      } catch (e) {
        console.error("saveLocalEnded failed", e);
        return null;
      }
    };

    try {
      // début de depointerWithNote: vérifier /health
      try {
        const h = await fetch(`${API}/health`);
        if (!h.ok) {
          toast({ status: "error", title: "API indisponible", description: "Impossible de terminer le pointage — serveur indisponible." });
          setBusy(false);
          return;
        }
      } catch (e) {
        toast({ status: "error", title: "API indisponible", description: "Impossible de joindre le serveur — le pointage ne peut pas être terminé." });
        setBusy(false);
        return;
      }

      // include participants and note
      const body = {
        endedAt: now,
        note: depointerNote || "depointe",
        participants: activePointage.participants || participants
      };

      // 1) Try PATCH
      let usageResult = null;
      try {
        const patch = await fetch(`${API}/vehicles/${encodeURIComponent(parc)}/usages/${encodeURIComponent(activePointage.id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (patch.ok) {
          try { usageResult = await patch.json(); } catch (_) { usageResult = null; }
          // success path
          persistActiveLocal(null);
          setActivePointage(null);
          setOpenDepointerModal(false);
          setDepointerNote("");
          toast({ status: "success", title: "Dépointe", description: `arrêté à ${new Date(now).toLocaleString()}` });
        } else {
          // if not ok, read body for diagnostics
          let errBody = null;
          try { errBody = await patch.json(); } catch (_) { errBody = await patch.text().catch(()=>null); }
          console.warn("depointerWithNote: PATCH failed", patch.status, errBody);
          // fallthrough to POST fallback attempt
        }
      } catch (err) {
        console.warn("depointerWithNote: PATCH network error", err);
        // fallthrough to POST fallback attempt
      }

      // 2) If PATCH did not return success, try POST fallback
      if (!usageResult) {
        try {
          const r2 = await fetch(`${API}/vehicles/${encodeURIComponent(parc)}/usages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              conducteur: selectedMember || null,
              note: depointerNote || "pointage:end",
              relatedTo: activePointage.id,
              participants: activePointage.participants || participants,
              endedAt: now
            }),
          });

          if (r2.ok) {
            try { usageResult = await r2.json(); } catch (_) { usageResult = null; }
            persistActiveLocal(null);
            setActivePointage(null);
            setOpenDepointerModal(false);
            setDepointerNote("");
            toast({ status: "success", title: "Dépointe (fallback)", description: `arrêté à ${new Date(now).toLocaleString()}` });
          } else {
            let errBody = null;
            try { errBody = await r2.json(); } catch (_) { errBody = await r2.text().catch(()=>null); }
            console.warn("depointerWithNote: POST fallback failed", r2.status, errBody);
          }
        } catch (err) {
          console.warn("depointerWithNote: POST fallback network error", err);
        }
      }

      // 3) If both server attempts failed, still allow the user to finish locally:
      if (!usageResult) {
        // persist an "ended" record locally so we don't lose data
        const localEntry = saveLocalEnded(activePointage.id, activePointage.startedAt);
        // clear active pointage so UI reflects stopped state
        persistActiveLocal(null);
        setActivePointage(null);
        setOpenDepointerModal(false);
        setDepointerNote("");
        toast({
          status: "warning",
          title: "Dépointe local",
          description: localEntry
            ? "Le pointage a été enregistré localement (pas d'API). La fiche peut être envoyée plus tard."
            : "Le serveur est indisponible et la sauvegarde locale a échoué."
        });

        // prepare reportMeta so user can add description/media and save the fiche locally
        setReportMeta({
          usageId: localEntry ? localEntry.id : `local-${Date.now()}`,
          startedAt: localEntry?.startedAt || activePointage.startedAt,
          endedAt: localEntry?.endedAt || now,
          conducteur: activePointage.conducteur || selectedMember,
          participants: activePointage.participants || participants
        });

        setReportDescription(depointerNote || "");
        setReportFiles([]);
        setOpenReportModal(true);
        return;
      }

      // 4) If we have usageResult from server, open report modal with that usage info
      const usageId = usageResult?.id || activePointage.id;
      const startedAt = usageResult?.startedAt || activePointage.startedAt;
      const endedAt = usageResult?.endedAt || now;
      setReportMeta({
        usageId,
        startedAt,
        endedAt,
        conducteur: selectedMember,
        participants: activePointage.participants || participants
      });
      setReportDescription(depointerNote || "");
      setReportFiles([]);
      setOpenReportModal(true);

    } catch (e) {
      console.error("depointerWithNote: unexpected error", e);
      toast({ status: "error", title: "Échec du dépointeur", description: String(e.message) });
    } finally {
      setBusy(false);
    }
  };

  // Files handling for report
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    setReportFiles(prev => [...prev, ...files]);
    // clear input
    e.target.value = "";
  };

  const removeReportFile = (index) => {
    setReportFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleReportSubmit = async () => {
    if (!reportMeta) return;
    setIsSubmittingReport(true);
    try {
      const { usageId, startedAt, endedAt, conducteur, participants: rptParticipants } = reportMeta;
      // Build FormData
      const fd = new FormData();
      fd.append("description", reportDescription || "");
      fd.append("startedAt", startedAt || "");
      fd.append("endedAt", endedAt || "");
      fd.append("conducteur", conducteur || "");
      fd.append("participants", JSON.stringify(rptParticipants || []));
      // files
      reportFiles.forEach((f, i) => fd.append("files", f, f.name));

      // try primary endpoint: POST /vehicles/:parc/usages/:id/report
      let sent = false;
      try {
        const r = await fetch(`${API}/vehicles/${encodeURIComponent(parc)}/usages/${encodeURIComponent(usageId)}/report`, {
          method: "POST",
          body: fd
        });
        if (r.ok) {
          sent = true;
          toast({ status: "success", title: "Fiche enregistrée", description: "La fiche a été enregistrée sur le serveur." });
        } else {
          console.warn("primary report endpoint failed", r.status);
        }
      } catch (e) {
        console.warn("primary report endpoint error", e);
      }

      if (!sent) {
        // fallback: POST /vehicles/:parc/reports
        try {
          const r2 = await fetch(`${API}/vehicles/${encodeURIComponent(parc)}/reports`, {
            method: "POST",
            body: fd
          });
          if (r2.ok) {
            sent = true;
            toast({ status: "success", title: "Fiche enregistrée (fallback)", description: "La fiche a été envoyée au fallback serveur." });
          } else {
            console.warn("fallback report endpoint failed", r2.status);
          }
        } catch (e) {
          console.warn("fallback report endpoint error", e);
        }
      }

      if (!sent) {
        // as last resort, persist locally
        const localReport = {
          id: `local-${Date.now()}`,
          parc,
          usageId,
          startedAt,
          endedAt,
          conducteur,
          participants: rptParticipants || [],
          description: reportDescription || "",
          files: reportFiles.map(f => ({ name: f.name, size: f.size, type: f.type })),
          createdAt: new Date().toISOString()
        };
        const ok = saveLocalReport(localReport);
        if (ok) {
          toast({ status: "warning", title: "Fiche sauvegardée localement", description: "Pas d'API disponible — la fiche est dans votre navigateur." });
        } else {
          toast({ status: "error", title: "Échec sauvegarde locale", description: "Impossible de sauvegarder la fiche." });
        }
      }

      // close report modal
      setOpenReportModal(false);
      setReportDescription("");
      setReportFiles([]);
      setReportMeta(null);

    } catch (e) {
      console.error(e);
      toast({ status: "error", title: "Erreur lors de l'envoi de la fiche", description: String(e.message) });
    } finally {
      setIsSubmittingReport(false);
    }
  };

  if (loadingVeh) return <Center p={8}><Spinner size="lg" /></Center>;

  return (
    <Container maxW="4xl" py={10}>
      <Heading as="h1" size="xl" mb={4}>MyRBE — Actions rapides</Heading>

      <Box mb={4}>
        <Text fontSize="md"><b>Véhicule :</b> {veh?.immat || `Parc ${parc}`}</Text>
        <Text fontSize="sm" color="gray.600">Parc {parc}</Text>
      </Box>

      <Box mb={4}>
        <Text mb={2}><b>Initiateur (scan)</b></Text>
        <HStack spacing={3} align="start">
          <Select value={selectedMember} onChange={(e) => setSelectedMember(e.target.value)} maxW="360px">
            {members.map(m => <option key={m.matricule} value={m.matricule}>{m.label} ({m.matricule})</option>)}
            {matricule && !members.some(m => m.matricule === matricule) && (
              <option value={matricule}>{prenom ? `${prenom} (${matricule})` : matricule}</option>
            )}
          </Select>

          <Box>
            <Input placeholder="Ajouter participant (matricule)" value={newMemberInput} onChange={(e) => setNewMemberInput(e.target.value)} maxW="220px" />
          </Box>
          <Button size="sm" onClick={handleAddMember}>Ajouter</Button>
        </HStack>

        <Box mt={3}>
          <Text mb={2} fontSize="sm">Participants présents :</Text>
          <Wrap spacing={2}>
            {participants.length === 0 && <Text fontSize="sm" color="gray.600">Aucun participant ajouté</Text>}
            {participants.map(p => (
              <Tag key={p} size="sm" borderRadius="full" variant="solid" colorScheme="blue">
                <TagLabel>{p}</TagLabel>
                <TagCloseButton onClick={() => removeParticipant(p)} />
              </Tag>
            ))}
          </Wrap>
        </Box>
      </Box>

      <Stack direction={{ base: "column", md: "row" }} spacing={4} mb={4}>
        <Button colorScheme="blue" size="lg" onClick={() => toast({ status:"info", title:"Planifier", description:"Fonctionnalité planification à ajouter" })}>
          Planifier une intervention
        </Button>

        <Button colorScheme="red" size="lg" onClick={() => toast({ status:"info", title:"Signaler", description:"Fonctionnalité signalement à ajouter" })}>
          Signaler une anomalie
        </Button>

        <Button
          colorScheme={activePointage ? "orange" : "green"}
          size="lg"
          onClick={() => {
            if (activePointage) setOpenDepointerModal(true);
            else setOpenPointerModal(true);
          }}
          isLoading={busy}
        >
          {activePointage ? "Dépointer" : "Pointer"}
        </Button>
      </Stack>

      <Box>
        <Text fontSize="sm" color="gray.700">
          <b>Initiateur :</b> {selectedMember} {matricule === selectedMember && prenom ? ` — ${prenom}` : ""}
        </Text>
        {activePointage ? (
          <Text fontSize="sm" color="gray.700">Pointé depuis : {formatTime(activePointage.startedAt)}</Text>
        ) : (
          <Text fontSize="sm" color="gray.600">Aucun pointage actif pour ce membre sur ce véhicule.</Text>
        )}
      </Box>

      {/* Pointer modal */}
      <Modal isOpen={openPointerModal} onClose={() => setOpenPointerModal(false)} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Pointer — démarrer</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text mb={3}>Véhicule : <b>{veh?.immat || `Parc ${parc}`}</b></Text>
            <Text mb={3}>Initiateur : <b>{selectedMember}</b></Text>
            <Text mb={3}>Participants : {participants.length ? participants.join(", ") : "—"}</Text>
            <Text fontSize="sm" color="gray.600">Confirmer pour créer le pointage (heure actuelle enregistrée).</Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={() => setOpenPointerModal(false)}>Annuler</Button>
            <Button colorScheme="green" onClick={startPointage} isLoading={busy}>Confirmer</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Depointer modal (description obligatoire) */}
      <Modal isOpen={openDepointerModal} onClose={() => setOpenDepointerModal(false)} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Dépointer — terminer</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text mb={3}>Véhicule : <b>{veh?.immat || `Parc ${parc}`}</b></Text>
            <Text mb={3}>Initiateur : <b>{selectedMember}</b></Text>
            <FormControl isRequired>
              <FormLabel>Description des activités réalisées</FormLabel>
              <Textarea value={depointerNote} onChange={(e) => setDepointerNote(e.target.value)} placeholder="Ex: contrôle frein, remplacement ampoule..." />
            </FormControl>
            <Text mt={3} fontSize="sm" color="gray.500">(Après validation, vous pourrez ajouter photos/vidéos à la fiche.)</Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={() => setOpenDepointerModal(false)}>Annuler</Button>
            <Button colorScheme="orange" onClick={depointerWithNote} isLoading={busy} isDisabled={!depointerNote.trim()}>
              Confirmer dépointer
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Report modal (fiche de pointage) */}
      <Modal isOpen={openReportModal} onClose={() => setOpenReportModal(false)} size="xl" isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Fiche de pointage — détails</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Box mb={3}>
              <Text><b>Véhicule :</b> {veh?.immat || `Parc ${parc}`}</Text>
              <Text><b>Initiateur :</b> {reportMeta?.conducteur}</Text>
              <Text><b>Participants :</b> {(reportMeta?.participants || []).join(", ") || "—"}</Text>
              <Text><b>Début :</b> {reportMeta ? formatTime(reportMeta.startedAt) : "—"}</Text>
              <Text><b>Fin :</b> {reportMeta ? formatTime(reportMeta.endedAt) : "—"}</Text>
            </Box>

            <FormControl mb={3}>
              <FormLabel>Description</FormLabel>
              <Textarea value={reportDescription} onChange={(e) => setReportDescription(e.target.value)} placeholder="Décrivez les actions effectuées..." />
            </FormControl>

            <FormControl mb={3}>
              <FormLabel>Photos / Vidéos</FormLabel>
              <Input type="file" accept="image/*,video/*" multiple onChange={handleFileChange} />
              {reportFiles.length > 0 && (
                <SimpleGrid columns={{ base: 2, md: 3 }} spacing={2} mt={3}>
                  {reportFiles.map((f, i) => (
                    <Box key={i} borderRadius="md" overflow="hidden" pos="relative" bg="gray.50" p={2}>
                      {f.type.startsWith("image/") ? (
                        <Image src={URL.createObjectURL(f)} alt={f.name} objectFit="cover" maxH="140px" w="100%" />
                      ) : (
                        <Box p={2}>
                          <Text fontSize="sm" noOfLines={2}>{f.name}</Text>
                          <Text fontSize="xs" color="gray.600">{(f.size/1024|0)} KB</Text>
                        </Box>
                      )}
                      <IconButton
                        aria-label="Supprimer"
                        size="sm"
                        pos="absolute" top="6px" right="6px"
                        onClick={() => removeReportFile(i)}
                        icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M8 6v14a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>}
                      />
                    </Box>
                  ))}
                </SimpleGrid>
              )}
            </FormControl>

            <Text fontSize="sm" color="gray.500">Les fichiers seront envoyés au serveur si disponible ; sinon la fiche sera sauvegardée localement.</Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={() => setOpenReportModal(false)}>Annuler</Button>
            <Button colorScheme="blue" onClick={handleReportSubmit} isLoading={isSubmittingReport}>
              Enregistrer la fiche
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
}