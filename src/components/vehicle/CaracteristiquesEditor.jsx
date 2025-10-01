import React from 'react';
import { VStack, HStack, Input, IconButton, Button, FormLabel } from '@chakra-ui/react';
import { FiTrash, FiPlus } from 'react-icons/fi';

export default function CaracteristiquesEditor({ value = [], onChange }) {
  const update = (i, key, val) => {
    const copy = [...value];
    copy[i] = { ...copy[i], [key]: val };
    onChange(copy);
  };
  const add = () => onChange([...(value || []), { label: '', value: '' }]);
  const remove = (i) => {
    const copy = [...value];
    copy.splice(i, 1);
    onChange(copy);
  };
  return (
    <VStack align="stretch" spacing={3}>
      <HStack justify="space-between">
        <FormLabel mb={0}>Caractéristiques</FormLabel>
        <Button size="xs" leftIcon={<FiPlus />} onClick={add}>Ajouter</Button>
      </HStack>
      {(value || []).map((c, i) => (
        <HStack key={i} align="flex-start">
          <Input
            placeholder="Label"
            value={c.label}
            onChange={e => update(i, 'label', e.target.value)}
          />
          <Input
            placeholder="Valeur"
            value={c.value}
            onChange={e => update(i, 'value', e.target.value)}
          />
          <IconButton
            aria-label="Supprimer"
            icon={<FiTrash />}
            size="sm"
            onClick={() => remove(i)}
          />
        </HStack>
      ))}
    </VStack>
  );
}
