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
      color={isActive ? "var(--rbe-red)" : "gray.600"}
      fontWeight={isActive ? "bold" : "normal"}
      textDecoration="none"
      position="relative"
      _hover={{
        color: "var(--rbe-red)",
        textDecoration: "none"
      }}
      _after={isActive ? {
        content: '""',
        position: "absolute",
        bottom: "-8px",
        left: 0,
        right: 0,
        height: "2px",
        bg: "var(--rbe-red)",
        borderRadius: "1px"
      } : {}}
      aria-current={isActive ? "page" : undefined}
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
      <TopNavLink to="/dashboard/evenements">Événements</TopNavLink>
      <TopNavLink to="/dashboard/myrbe">MyRBE</TopNavLink>
      <TopNavLink to="/dashboard/retromerch">RétroMerch</TopNavLink>
    </Flex>
  );
}
