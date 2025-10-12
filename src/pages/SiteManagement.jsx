import React, { useEffect, useState } from 'react';
import {
  Box, Heading, VStack, HStack, Button, Input, Textarea, Table, Thead, Tbody, Tr, Th, Td,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
  useDisclosure, useToast, IconButton, Text, Switch, FormControl, FormLabel, Image
} from '@chakra-ui/react';
import { FiPlus, FiTrash2, FiEdit } from 'react-icons/fi';

// Prefer env var, but fall back to the deployed Railway API for dev convenience
const API = import.meta.env.VITE_API_URL || 'https://attractive-kindness-rbe-serveurs.up.railway.app';

export default function SiteManagement() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [form, setForm] = useState({ id: null, title: '', version: '', date: '', changesText: '' });
  const [maint, setMaint] = useState({ maintenanceEnabled: false, maintenanceMessage: '', maintenanceImage: '' });
  const [savingMaint, setSavingMaint] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/changelog`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      if (!r.ok) throw new Error();
      const data = await r.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      toast({ status: 'error', title: 'Erreur de chargement' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const openNew = () => { setForm({ id: null, title: '', version: '', date: '', changesText: '' }); onOpen(); };
  const openEdit = (item) => {
    setForm({
      id: item.id,
      title: item.title,
      version: item.version,
      date: item.date?.slice(0,10) || '',
      changesText: (item.changes || []).join('\n')
    });
    onOpen();
  };

  const save = async () => {
    try {
      const payload = {
        title: form.title.trim(),
        version: form.version.trim(),
        date: form.date || undefined,
        changes: form.changesText.split('\n').map(s => s.trim()).filter(Boolean)
      };
      const opts = {
        method: form.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(payload)
      };
      const url = form.id ? `${API}/changelog/${form.id}` : `${API}/changelog`;
      const r = await fetch(url, opts);
      if (!r.ok) throw new Error();
      await fetchItems();
      onClose();
      toast({ status: 'success', title: 'Changelog enregistré' });
    } catch {
      toast({ status: 'error', title: 'Échec sauvegarde' });
    }
  };

  const del = async (id) => {
    if (!confirm('Supprimer cette entrée ?')) return;
    try {
      const r = await fetch(`${API}/changelog/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      if (!r.ok) throw new Error();
      await fetchItems();
      toast({ status: 'success', title: 'Supprimé' });
    } catch {
      toast({ status: 'error', title: 'Échec suppression' });
    }
  };

  const loadMaint = async () => {
    try {
      const r = await fetch(`${API}/site-settings`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }});
      if (r.ok) setMaint(await r.json());
    } catch {}
  };
  useEffect(() => { loadMaint(); }, []);

  const saveMaint = async () => {
    setSavingMaint(true);
    try {
      const r = await fetch(`${API}/site-settings`, {
        method: 'PUT',
        headers: { 'Content-Type':'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ maintenanceEnabled: maint.maintenanceEnabled, maintenanceMessage: maint.maintenanceMessage })
      });
      if (!r.ok) throw new Error();
      toast({ status:'success', title:'Maintenance mise à jour' });
    } catch {
      toast({ status:'error', title:'Échec sauvegarde maintenance' });
    } finally {
      setSavingMaint(false);
    }
  };

  const uploadMaintImage = async (file) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('image', file);
    try {
      const r = await fetch(`${API}/site-settings/maintenance-image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: fd
      });
      if (!r.ok) throw new Error();
      const j = await r.json();
      setMaint(prev => ({ ...prev, maintenanceImage: j.maintenanceImage }));
      toast({ status:'success', title:'Image de maintenance enregistrée' });
    } catch {
      toast({ status:'error', title:'Échec upload image maintenance' });
    }
  };

  const uploadHeader = async (target, file) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('image', file);
    try {
      const r = await fetch(`${API}/site-settings/header-image?target=${encodeURIComponent(target)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: fd
      });
      if (!r.ok) throw new Error();
      const j = await r.json();
      setMaint(m => ({ ...m, ...j }));
      toast({ status:'success', title:`Image d'en-tête (${target}) enregistrée` });
    } catch {
      toast({ status:'error', title:`Échec upload header ${target}` });
    }
  };

  const uploadLogo = async (variant, file) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('image', file);
    try {
      const r = await fetch(`${API}/site-settings/logo?variant=${encodeURIComponent(variant)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: fd
      });
      if (!r.ok) throw new Error();
      const j = await r.json();
      setMaint(m => ({ ...m, ...j }));
      toast({ status:'success', title:`Logo (${variant}) enregistré` });
    } catch {
      toast({ status:'error', title:`Échec upload logo ${variant}` });
    }
  };

  return (
    <Box p={6}>
      <HStack justify="space-between" mb={4}>
        <Heading size="lg">Gestion du Site</Heading>
      </HStack>

      {/* Bloc Maintenance */}
      <Box borderWidth="1px" borderRadius="md" p={4} mb={6} bg="yellow.50">
        <Heading size="md" mb={3}>Mode maintenance</Heading>
        <VStack align="stretch" spacing={3}>
          <FormControl display="flex" alignItems="center">
            <FormLabel mb="0">Activer</FormLabel>
            <Switch isChecked={maint.maintenanceEnabled} onChange={(e) => setMaint(m => ({ ...m, maintenanceEnabled: e.target.checked }))} />
          </FormControl>

          <Textarea
            placeholder="Message optionnel affiché pendant la maintenance"
            value={maint.maintenanceMessage || ''}
            onChange={(e) => setMaint(m => ({ ...m, maintenanceMessage: e.target.value }))}
          />

          <HStack>
            <Input type="file" accept="image/*" onChange={(e) => uploadMaintImage(e.target.files?.[0])} />
            <Button onClick={saveMaint} isLoading={savingMaint} colorScheme="yellow">Enregistrer</Button>
          </HStack>

          {maint.maintenanceImage && (
            <Box>
              <Text fontSize="sm" color="gray.600" mb={1}>Aperçu</Text>
              <Image src={maint.maintenanceImage} alt="Maintenance" maxH="200px" borderRadius="md" />
            </Box>
          )}
        </VStack>
      </Box>

      {/* New: Header & Logo */}
      <Box borderWidth="1px" borderRadius="md" p={4} mb={6}>
        <Heading size="md" mb={3}>En-tête & Logo</Heading>
        <VStack align="stretch" spacing={4}>
          <HStack align="flex-end">
            <FormControl>
              <FormLabel>Header (desktop)</FormLabel>
              <Input type="file" accept="image/*" onChange={(e) => uploadHeader('desktop', e.target.files?.[0])} />
            </FormControl>
            <FormControl>
              <FormLabel>Header (mobile)</FormLabel>
              <Input type="file" accept="image/*" onChange={(e) => uploadHeader('mobile', e.target.files?.[0])} />
            </FormControl>
          </HStack>

          <HStack>
            <FormControl>
              <FormLabel>Position desktop (CSS background-position)</FormLabel>
              <Input
                placeholder="ex: center 40% ou 50% 30%"
                value={maint.headerPositionDesktop || ''}
                onChange={(e) => setMaint(m => ({ ...m, headerPositionDesktop: e.target.value }))}
              />
            </FormControl>
            <FormControl>
              <FormLabel>Position mobile</FormLabel>
              <Input
                placeholder="ex: center 20%"
                value={maint.headerPositionMobile || ''}
                onChange={(e) => setMaint(m => ({ ...m, headerPositionMobile: e.target.value }))}
              />
            </FormControl>
            <Button onClick={saveMaint} isLoading={savingMaint} colorScheme="blue">Enregistrer positions</Button>
          </HStack>

          <HStack align="flex-start" spacing={6}>
            <Box>
              <Text fontSize="sm" color="gray.600" mb={1}>Aperçu header desktop</Text>
              {maint.headerImageDesktop ? (
                <Image src={maint.headerImageDesktop} maxH="140px" borderRadius="md" />
              ) : <Text fontSize="sm" color="gray.500">Aucune image</Text>}
            </Box>
            <Box>
              <Text fontSize="sm" color="gray.600" mb={1}>Aperçu header mobile</Text>
              {maint.headerImageMobile ? (
                <Image src={maint.headerImageMobile} maxH="140px" borderRadius="md" />
              ) : <Text fontSize="sm" color="gray.500">Aucune image</Text>}
            </Box>
          </HStack>

          <HStack align="flex-end">
            <FormControl>
              <FormLabel>Logo principal</FormLabel>
              <Input type="file" accept="image/*" onChange={(e) => uploadLogo('main', e.target.files?.[0])} />
            </FormControl>
            <FormControl>
              <FormLabel>Logo inversé (optionnel)</FormLabel>
              <Input type="file" accept="image/*" onChange={(e) => uploadLogo('inverted', e.target.files?.[0])} />
            </FormControl>
          </HStack>

          <HStack align="flex-start" spacing={6}>
            <Box>
              <Text fontSize="sm" color="gray.600" mb={1}>Aperçu logo principal</Text>
              {maint.logoMain ? (
                <Image src={maint.logoMain} maxH="80px" borderRadius="md" bg="white" p={2} />
              ) : <Text fontSize="sm" color="gray.500">Aucun logo</Text>}
            </Box>
            <Box>
              <Text fontSize="sm" color="gray.600" mb={1}>Aperçu logo inversé</Text>
              {maint.logoInverted ? (
                <Image src={maint.logoInverted} maxH="80px" borderRadius="md" bg="black" p={2} />
              ) : <Text fontSize="sm" color="gray.500">Aucun logo</Text>}
            </Box>
          </HStack>
        </VStack>
      </Box>

      <HStack justify="space-between" mb={4}>
        <Heading size="lg">Gestion du Site — Changelog</Heading>
        <Button leftIcon={<FiPlus />} colorScheme="blue" onClick={openNew}>Nouvelle entrée</Button>
      </HStack>

      {loading ? <Text>Chargement…</Text> : (
        <Table size="sm">
          <Thead><Tr><Th>Titre</Th><Th>Version</Th><Th>Date</Th><Th>Actions</Th></Tr></Thead>
          <Tbody>
            {items.map(it => (
              <Tr key={it.id}>
                <Td>{it.title}</Td>
                <Td>{it.version}</Td>
                <Td>{(it.date || '').slice(0,10)}</Td>
                <Td>
                  <HStack>
                    <IconButton aria-label="Modifier" icon={<FiEdit />} size="sm" onClick={() => openEdit(it)} />
                    <IconButton aria-label="Supprimer" icon={<FiTrash2 />} colorScheme="red" size="sm" onClick={() => del(it.id)} />
                  </HStack>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{form.id ? 'Modifier' : 'Créer'} une entrée</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={3} align="stretch">
              <Input placeholder="Titre" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              <Input placeholder="Version (ex: 1.2.3)" value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))} />
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              <Textarea placeholder="Une ligne par changement" rows={8} value={form.changesText} onChange={e => setForm(f => ({ ...f, changesText: e.target.value }))} />
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>Annuler</Button>
            <Button colorScheme="blue" onClick={save}>Enregistrer</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}