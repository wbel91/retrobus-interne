/* Simplified VehiculeAdd using shared components */
import React, { useEffect, useState } from 'react';
import {
  Box, Heading, VStack, Input, Textarea, Button, SimpleGrid, Text, useToast
} from '@chakra-ui/react';
import { useParams } from 'react-router-dom';
import GalleryManager from '../components/vehicle/GalleryManager.jsx';
import CaracteristiquesEditor from '../components/vehicle/CaracteristiquesEditor.jsx';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function VehiculeAdd() {
  const { parc } = useParams();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/vehicles/${parc}`, {
      headers: { Authorization: 'Bearer creator123' }
    })
      .then(r => r.ok ? r.json() : null)
      .then(setData)
      .catch(()=> toast({ status:'error', title:'Véhicule introuvable'}));
  }, [parc]);

  const updateField = (f, v) => setData(d => ({ ...d, [f]: v }));

  const save = () => {
    setSaving(true);
    fetch(`${API_BASE}/vehicles/${parc}`, {
      method:'PUT',
      headers:{
        'Content-Type':'application/json',
        Authorization: 'Bearer creator123'
      },
      body: JSON.stringify({
        modele: data.modele,
        marque: data.marque,
        subtitle: data.subtitle,
        etat: data.etat,
        immat: data.immat,
        energie: data.energie,
        miseEnCirculation: data.miseEnCirculation,
        description: data.description,
        history: data.history,
        caracteristiques: data.caracteristiques,
        gallery: data.gallery
      })
    })
      .then(r=> r.ok ? r.json() : Promise.reject())
      .then(()=> toast({ status:'success', title:'Enregistré'}))
      .catch(()=> toast({ status:'error', title:'Erreur sauvegarde'}))
      .finally(()=> setSaving(false));
  };

  if (!data) return <Box p={8}><Heading>Chargement...</Heading></Box>;

  return (
    <Box p={8}>
      <Heading mb={6}>Édition véhicule {parc}</Heading>
      <VStack align="stretch" spacing={6}>
        <SimpleGrid columns={{ base:1, md:2 }} spacing={4}>
          <Box>
            <Text fontWeight="bold">Marque</Text>
            <Input value={data.marque || ''} onChange={e=>updateField('marque', e.target.value)} />
          </Box>
            <Box>
            <Text fontWeight="bold">Modèle</Text>
            <Input value={data.modele || ''} onChange={e=>updateField('modele', e.target.value)} />
          </Box>
          <Box>
            <Text fontWeight="bold">Sous-titre</Text>
            <Input value={data.subtitle || ''} onChange={e=>updateField('subtitle', e.target.value)} />
          </Box>
          <Box>
            <Text fontWeight="bold">État</Text>
            <Input value={data.etat || ''} onChange={e=>updateField('etat', e.target.value)} />
          </Box>
          <Box>
            <Text fontWeight="bold">Immat</Text>
            <Input value={data.immat || ''} onChange={e=>updateField('immat', e.target.value)} />
          </Box>
          <Box>
            <Text fontWeight="bold">Énergie</Text>
            <Input value={data.energie || ''} onChange={e=>updateField('energie', e.target.value)} />
          </Box>
          <Box>
            <Text fontWeight="bold">Mise en circulation (YYYY-MM-DD)</Text>
            <Input value={data.miseEnCirculation || ''} onChange={e=>updateField('miseEnCirculation', e.target.value)} />
          </Box>
        </SimpleGrid>

        <Box>
          <Text fontWeight="bold" mb={2}>Description</Text>
          <Textarea rows={4} value={data.description || ''} onChange={e=>updateField('description', e.target.value)} />
        </Box>
        <Box>
          <Text fontWeight="bold" mb={2}>Histoire</Text>
          <Textarea rows={5} value={data.history || ''} onChange={e=>updateField('history', e.target.value)} />
        </Box>

        <CaracteristiquesEditor
          value={data.caracteristiques || []}
          onChange={list => updateField('caracteristiques', list)}
        />

        <GalleryManager
          value={data.gallery || []}
          onChange={gal => updateField('gallery', gal)}
          uploadEndpoint={`${API_BASE}/vehicles/${parc}/gallery`}
          deleteEndpoint={`${API_BASE}/vehicles/${parc}/gallery`}
          authHeader={'Bearer creator123'}
        />

        <Button colorScheme="blue" onClick={save} isLoading={saving}>Enregistrer</Button>
      </VStack>
    </Box>
  );
}
