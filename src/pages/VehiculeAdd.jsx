// src/pages/VehiculeAdd.jsx
import {
  Box, Button, FormControl, FormLabel, Heading, Input, Select,
  VStack, HStack, useToast, Text
} from "@chakra-ui/react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext"; // <-- OK ici (import), pas d'appel !

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function VehiculeAdd() {
  // ✅ L’APPEL AU HOOK DOIT ÊTRE ICI, dans le corps du composant
  const { matricule } = useUser();

  const nav = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState({
    parc: "",
    type: "Bus",
    modele: "",
    immat: "",
    etat: "Préservé",
    miseEnCirculation: "",
    energie: "",
  });
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(s => ({ ...s, [k]: v }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.parc || !form.modele || !form.etat) {
      toast({ status: "warning", title: "Champs requis", description: "Parc, Modèle, Etat sont obligatoires." });
      return;
    }
    try {
      setLoading(true);
      const r = await fetch(`${API}/vehicles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Matricule": matricule || "", // <-- on envoie le matricule
        },
        body: JSON.stringify(form),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json?.error || "Erreur");
      toast({ status: "success", title: "Véhicule ajouté", description: `Parc ${json.parc}` });
      nav("/dashboard/vehicules");
    } catch (err) {
      toast({ status: "error", title: "Impossible d’ajouter", description: String(err.message) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box p={6}>
      <Heading size="lg">Ajouter un véhicule</Heading>
      <Text mt={2} opacity={0.85}>Cible : véhicules <b>“Préservés”</b> ou <b>“À venir”</b>.</Text>

      <Box as="form" onSubmit={onSubmit} mt={6} maxW="720px">
        <VStack align="stretch" spacing={4}>
          <HStack>
            <FormControl isRequired>
              <FormLabel>Numéro de parc</FormLabel>
              <Input value={form.parc} onChange={e => set("parc", e.target.value)} placeholder="ex: 231620 ou FG-920-RE" />
            </FormControl>
            <FormControl>
              <FormLabel>Immatriculation</FormLabel>
              <Input value={form.immat} onChange={e => set("immat", e.target.value)} placeholder="ex: FG-920-RE" />
            </FormControl>
          </HStack>

          <HStack>
            <FormControl isRequired>
              <FormLabel>Modèle</FormLabel>
              <Input value={form.modele} onChange={e => set("modele", e.target.value)} placeholder="ex: Mercedes Citaro 1" />
            </FormControl>
            <FormControl>
              <FormLabel>Type</FormLabel>
              <Input value={form.type} onChange={e => set("type", e.target.value)} placeholder="ex: Bus / Bus Articulé" />
            </FormControl>
          </HStack>

          <HStack>
            <FormControl isRequired>
              <FormLabel>État</FormLabel>
              <Select value={form.etat} onChange={e => set("etat", e.target.value)}>
                <option value="Préservé">Préservé</option>
                <option value="A VENIR">À venir</option>
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel>Énergie</FormLabel>
              <Select value={form.energie} onChange={e => set("energie", e.target.value || "")}>
                <option value="">—</option>
                <option value="GASOIL">Gasoil</option>
                <option value="GNV">GNV</option>
                <option value="HYBRIDE">Hybride</option>
                <option value="ELECTRIQUE">Électrique</option>
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel>Première MEC</FormLabel>
              <Input type="date" value={form.miseEnCirculation} onChange={e => set("miseEnCirculation", e.target.value)} />
            </FormControl>
          </HStack>

          <HStack justify="flex-end" pt={2}>
            <Button variant="outline" onClick={() => nav(-1)}>Annuler</Button>
            <Button colorScheme="blue" type="submit" isLoading={loading}>Ajouter</Button>
          </HStack>
        </VStack>
      </Box>
    </Box>
  );
}
