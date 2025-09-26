import {
  Box, Heading, Text, Badge, HStack, Stack, Button, Divider, Wrap, WrapItem,
  Select, Input, useToast, Spinner, Center
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { useUser } from "../context/UserContext";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";
// On pointe vers la landing MyRBE pour que le QR ouvre l'espace dédié (landing gère redirection)
const UNIVERSAL_LINK_BASE = import.meta.env.VITE_UNIVERSAL_LINK_BASE || `${window.location.origin}/#/myrbe/landing/`;

function EtatBadge({ etat }) {
  const map = { Service: "green", "Préservé": "blue", "A VENIR": "gray" };
  return <Badge colorScheme={map[etat] || "purple"}>{etat}</Badge>;
}

export default function VehiculeShow() {
  const { parc } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const { matricule } = useUser();

  const [v, setV] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // champs éditables
  const [etat, setEtat] = useState("");
  const [immat, setImmat] = useState("");
  const [energie, setEnergie] = useState("");
  const [mec, setMec] = useState("");

  const allowEdit = !!matricule && ["w.belaidi", "admin"].includes(String(matricule).toLowerCase());
  const mobileUrl = `${UNIVERSAL_LINK_BASE}${encodeURIComponent(parc)}`;

  useEffect(() => {
    let stop = false;
    (async () => {
      try {
        setLoading(true);
        const r = await fetch(`${API}/vehicles/${encodeURIComponent(parc)}`);
        if (!r.ok) throw new Error("not found");
        const j = await r.json();
        if (stop) return;
        setV(j);
        setEtat(j.etat || "");
        setImmat(j.immat || "");
        setEnergie(j.energie || "");
        setMec(j.miseEnCirculation ? new Date(j.miseEnCirculation).toISOString().slice(0,10) : "");
      } catch {
        if (!stop) setV(null);
      } finally {
        if (!stop) setLoading(false);
      }
    })();
    return () => { stop = true; };
  }, [parc]);

  const title = useMemo(() => {
    if (!v) return `Parc ${parc}`;
    return v.immat ? `${v.immat} · Parc ${v.parc}` : `Parc ${v.parc}`;
  }, [v, parc]);

  const save = async () => {
    try {
      setSaving(true);
      const r = await fetch(`${API}/vehicles/${encodeURIComponent(parc)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          etat,
          immat,
          energie,
          miseEnCirculation: mec || null,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Erreur");
      setV(j);
      toast({ status: "success", title: "Enregistré" });
    } catch (e) {
      toast({ status: "error", title: "Échec de l’enregistrement", description: String(e.message) });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Center p={10}><Spinner size="lg" /></Center>;
  if (!v) return (
    <Box p={6}>
      <Heading size="lg">Véhicule introuvable</Heading>
      <Button mt={4} onClick={() => nav("/dashboard/vehicules")}>Retour à la liste</Button>
    </Box>
  );

  return (
    <Box p={6}>
      <HStack justify="space-between" align="start">
        <Box>
          <Heading size="lg">{title}</Heading>
          <Wrap mt={2}>
            <WrapItem><EtatBadge etat={v.etat} /></WrapItem>
            {v.modele && <WrapItem><Badge colorScheme="purple">{v.modele}</Badge></WrapItem>}
            {v.type && <WrapItem><Badge>{v.type}</Badge></WrapItem>}
            {v.energie && <WrapItem><Badge colorScheme="orange">{v.energie}</Badge></WrapItem>}
            {v.miseEnCirculation && <WrapItem><Badge>MEC {new Date(v.miseEnCirculation).toISOString().slice(0,10)}</Badge></WrapItem>}
          </Wrap>
        </Box>

        <Box textAlign="center">
          <QRCodeCanvas value={mobileUrl} size={140} includeMargin />
          <Text mt={2} fontSize="sm" opacity={0.8}>MyRBE</Text>
          {/* Sur PC : ouvrir l'espace MyRBE actions */}
          <Button size="sm" mt={2} onClick={() => nav(`/dashboard/myrbe/${parc}`)}>Ouvrir</Button>
        </Box>
      </HStack>

      <Divider my={6} />

      {/* Edition rapide (réservée) */}
      {allowEdit ? (
        <Box>
          <Heading size="md" mb={3}>Édition rapide</Heading>
          <Stack direction={{ base: "column", md: "row" }} spacing={4}>
            <Box>
              <Text mb={1} fontWeight="semibold">État</Text>
              <Select value={etat} onChange={(e)=>setEtat(e.target.value)}>
                <option value="Préservé">Préservé</option>
                <option value="A VENIR">À venir</option>
                <option value="Service">Service</option>
              </Select>
            </Box>
            <Box>
              <Text mb={1} fontWeight="semibold">Immat</Text>
              <Input value={immat} onChange={(e)=>setImmat(e.target.value)} placeholder="ex: FG-920-RE" />
            </Box>
            <Box>
              <Text mb={1} fontWeight="semibold">Énergie</Text>
              <Select value={energie} onChange={(e)=>setEnergie(e.target.value)}>
                <option value="">—</option>
                <option value="GASOIL">Gasoil</option>
                <option value="GNV">GNV</option>
                <option value="HYBRIDE">Hybride</option>
                <option value="ELECTRIQUE">Électrique</option>
              </Select>
            </Box>
            <Box>
              <Text mb={1} fontWeight="semibold">Première MEC</Text>
              <Input type="date" value={mec} onChange={(e)=>setMec(e.target.value)} />
            </Box>
          </Stack>
          <HStack mt={4} justify="flex-end">
            <Button onClick={() => nav("/dashboard/vehicules")} variant="outline">Retour</Button>
            <Button onClick={save} colorScheme="blue" isLoading={saving}>Enregistrer</Button>
          </HStack>
        </Box>
      ) : (
        <Text opacity={0.7}>Vous n’avez pas les droits d’édition pour ce véhicule.</Text>
      )}
    </Box>
  );
}
