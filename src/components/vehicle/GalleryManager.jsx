import React, { useState } from 'react';
import { Box, SimpleGrid, Image, HStack, IconButton, Input, useToast, Text } from '@chakra-ui/react';
import { FiTrash2, FiChevronUp, FiChevronDown } from 'react-icons/fi';

export default function GalleryManager({
  value = [],
  onChange,
  uploadEndpoint,
  deleteEndpoint,
  authHeader
}) {
  const toast = useToast();
  const [uploading, setUploading] = useState(false);

  const move = (i, dir) => {
    const copy = [...value];
    const target = i + dir;
    if (target < 0 || target >= copy.length) return;
    [copy[i], copy[target]] = [copy[target], copy[i]];
    onChange(copy);
  };

  const remove = async (img) => {
    if (!deleteEndpoint) {
      onChange(value.filter(v => v !== img));
      return;
    }
    try {
      const res = await fetch(deleteEndpoint, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify({ image: img })
      });
      if (!res.ok) throw new Error();
      const j = await res.json();
      onChange(j.gallery || []);
    } catch {
      onChange(value.filter(v => v !== img));
    }
  };

  const upload = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    const fd = new FormData();
    [...files].forEach(f => fd.append('images', f));
    
    console.log('🔍 Upload debug:', {
      endpoint: uploadEndpoint,
      filesCount: files.length,
      hasAuth: !!authHeader
    });
    
    try {
      const res = await fetch(uploadEndpoint, { 
        method:'POST', 
        headers:{ 'Authorization': authHeader }, 
        body: fd 
      });
      
      console.log('📡 Upload response:', {
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries(res.headers)
      });
      
      if (!res.ok) {
        const txt = await res.text().catch(()=> '');
        console.error('❌ Upload failed:', res.status, txt);
        toast({ 
          status: 'error', 
          title: 'Échec upload',
          description: `Erreur ${res.status}: ${txt || res.statusText}`
        });
        throw new Error(`HTTP ${res.status}: ${txt}`);
      }
      const j = await res.json();
      onChange(j.gallery || []);
      toast({ status: 'success', title: 'Images ajoutées' });
    } catch (err) {
      console.error('Upload error', err);
      toast({ 
        status: 'error', 
        title: 'Échec upload',
        description: err.message || 'Erreur réseau'
      });
    } finally {
      setUploading(false);
    }
  };

  const toSrc = (g) => {
    if (!g) return g;
    if (g.startsWith('http://') || g.startsWith('https://')) return g;
    // g commence par /media -> on préfixe base
    return (import.meta.env.VITE_API_URL || '') + g;
  };

  // Variante robuste pour rterner la source d'image
  const toSrc2 = (g) => {
    if (!g) return g;
    if (g.startsWith('http://') || g.startsWith('https://') || g.startsWith('data:') || g.startsWith('blob:')) return g;
    return (import.meta.env.VITE_API_URL || '') + g;
  };

  return (
    <Box>
      <Input
        type="file"
        multiple
        accept="image/*"
        onChange={e => upload(e.target.files)}
        isDisabled={uploading}
        mb={3}
      />
      {value.length === 0 && (
        <Text fontSize="sm" color="gray.500" mb={2}>Aucune image dans la galerie.</Text>
      )}
      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3}>
        {value.map((g, i) => (
          <Box key={g + i} border="1px solid" borderColor="gray.200" borderRadius="md" p={1}>
            <Image src={toSrc2(g)} w="100%" h="110px" objectFit="cover" borderRadius="sm" />
            <HStack mt={1} justify="space-between">
              <HStack>
                <IconButton
                  aria-label="Monter"
                  icon={<FiChevronUp />}
                  size="xs"
                  onClick={() => move(i, -1)}
                  isDisabled={i === 0}
                />
                <IconButton
                  aria-label="Descendre"
                  icon={<FiChevronDown />}
                  size="xs"
                  onClick={() => move(i, +1)}
                  isDisabled={i === (value.length - 1)}
                />
              </HStack>
              <IconButton
                aria-label="Supprimer"
                icon={<FiTrash2 />}
                size="xs"
                colorScheme="red"
                onClick={() => remove(g)}
              />
            </HStack>
          </Box>
        ))}
      </SimpleGrid>
    </Box>
  );
}
