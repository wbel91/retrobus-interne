import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Box, Heading, Text, Button, Center, Spinner } from "@chakra-ui/react";

/**
 * Landing page targetée par les QR :
 * - URL du QR : window.location.origin + '/#/myrbe/landing/:parc'
 * - Cette page détecte device et redirige :
 *    - mobile -> /#/mobile/v/:parc  (conserve usage mobile)
 *    - desktop -> /dashboard/myrbe/:parc
 */
export default function MyRBERedirect() {
  const { parc } = useParams();
  const nav = useNavigate();

  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || window.opera || "";
    const isMobile = /Android|iPhone|iPad|iPod|IEMobile|Windows Phone|Mobile/i.test(ua);

    // small delay so user sees a spinner; or you can redirect immediately
    const t = setTimeout(() => {
      if (isMobile) {
        // keep existing mobile URL format (uses hash route)
        window.location.href = `${window.location.origin}/#/mobile/v/${encodeURIComponent(parc)}`;
      } else {
        // navigate within app (desktop) to the MyRBE actions page
        nav(`/dashboard/myrbe/${encodeURIComponent(parc)}`);
      }
    }, 250);

    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parc]);

  return (
    <Center p={8}>
      <Box textAlign="center" maxW="560px">
        <Heading size="md" mb={3}>Ouverture de MyRBE…</Heading>
        <Text mb={3}>On prépare la page pour le véhicule <b>{parc}</b>. Redirection automatique en cours.</Text>
        <Spinner size="lg" />
        <Box mt={4}>
          <Text fontSize="sm" opacity={0.8}>Si la redirection ne se fait pas, utilisez les liens ci‑dessous :</Text>
          <Box mt={3} display="flex" gap="8px" justifyContent="center">
            <Button as="a" href={`${window.location.origin}/#/mobile/v/${encodeURIComponent(parc)}`} size="sm">Ouvrir (mobile)</Button>
            <Button onClick={() => nav(`/dashboard/myrbe/${encodeURIComponent(parc)}`)} size="sm">Ouvrir (desktop)</Button>
          </Box>
        </Box>
      </Box>
    </Center>
  );
}