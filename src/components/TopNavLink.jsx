import { Link as RouterLink, useLocation } from 'react-router-dom';
import { Link, Flex } from '@chakra-ui/react';
import React from 'react';

/**
 * Lien de navigation top bar
 * - Ajoute un style actif si l'URL commence par la cible
 * - Accessible (aria-current)
 */
export default function TopNavLink({ to, exact = false, children }) {
  const { pathname } = useLocation();

  const isActive = exact
    ? pathname === to
    : pathname === to || pathname.startsWith(to + '/');

  return (
    <Link
      as={RouterLink}
      to={to}
      fontWeight="600"
      px={3}
      py={1.5}
      borderRadius="md"
      position="relative"
      _hover={{ textDecoration: 'none', bg: 'blackAlpha.50' }}
      bg={isActive ? 'blackAlpha.100' : 'transparent'}
      aria-current={isActive ? 'page' : undefined}
      _after={{
        content: '""',
        position: 'absolute',
        left: '12%',
        right: '12%',
        bottom: '2px',
        height: '2px',
        borderRadius: '2px',
        bg: isActive ? 'blue.500' : 'transparent',
        transition: 'background .25s'
      }}
    >
      {children}
    </Link>
  );
}

export function Navigation() {
  return (
    <Flex bg="white" gap={{ base: 4, md: 8 }} justify="center" align="center" py={3}>
      <TopNavLink to="/dashboard">Accueil</TopNavLink>
      <TopNavLink to="/dashboard/vehicules">Véhicules</TopNavLink>
      <TopNavLink to="/dashboard/myrbe">MyRBE</TopNavLink>
      <TopNavLink to="/dashboard/retromerch">RétroMerch</TopNavLink>
      <TopNavLink to="/dashboard/events">Events</TopNavLink>
    </Flex>
  );
}
