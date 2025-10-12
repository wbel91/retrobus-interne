import React, { useEffect, useState } from 'react';
import {
  Box, Heading, VStack, HStack, Button, Input, Textarea, Table, Thead, Tbody, Tr, Th, Td,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
  useDisclosure, useToast, IconButton, Text
} from '@chakra-ui/react';
import { FiPlus, FiTrash2, FiEdit } from 'react-icons/fi';

const API = import.meta.env.VITE_API_URL;

export default function SiteManagement() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [form, setForm] = useState({ id: null, title: '', version: '', date: '', changesText: '' });

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

  return (
    <Box p={6}>
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