import { Box, Heading, SimpleGrid, Card, CardHeader, CardBody, Button, HStack, Text } from "@chakra-ui/react";
import { QRCodeCanvas } from "qrcode.react";
import { useEffect, useRef, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";
/** En dev, on pointe vers la page mobile du front. En prod, mets ton domaine d’Universal Link. */
// Landing target for QR codes: uses a small landing route that redirects by device
const UNIVERSAL_LINK_BASE = import.meta.env.VITE_UNIVERSAL_LINK_BASE || `${window.location.origin}/#/myrbe/landing/`;
// Exemple prod plus tard : https://app.retrobus-essonne.fr/v/

export default function QRManager() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let stop = false;
    (async () => {
      try {
        const r = await fetch(`${API}/vehicles`);
        const json = await r.json();
        if (!stop) setItems(json);
      } catch {
        if (!stop) setItems([]);
      }
    })();
    return () => { stop = true; };
  }, []);

  return (
    <Box p={6}>
      <Heading size="lg">QR Codes véhicules</Heading>
      <Text mt={2} opacity={0.85}>
        Le QR ouvre l’interface MyRBE (dev) et plus tard l’app iOS via Universal Link.
      </Text>

      <SimpleGrid columns={{ base: 1, md: 3 }} gap={4} mt={6}>
        {items.map(v => {
          const id = v.parc; // identifiant de route
          const target = `${UNIVERSAL_LINK_BASE}${encodeURIComponent(id)}`;
          const nameBase = v.immat?.trim() ? v.immat.trim() : v.parc;
          return <QRCard key={id} url={target} nameBase={nameBase} extra={v.modele} />;
        })}
      </SimpleGrid>

      <Box mt={8}>
        <Button onClick={() => window.print()}>Imprimer (planche A4)</Button>
      </Box>

      <style>{`
        @media print {
          @page { margin: 10mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </Box>
  );
}

function QRCard({ url, nameBase, extra }) {
  const ref = useRef(null);

  const downloadPNG = () => {
    const canvas = ref.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `QR_${sanitize(nameBase)}.png`; // <-- nom = immat ou parc
    link.click();
  };

  return (
    <Card>
      <CardHeader pb={2}>
        <Heading size="md">{nameBase}</Heading>
        {extra && <Text mt={1} opacity={0.8}>{extra}</Text>}
      </CardHeader>
      <CardBody pt={0}>
        <Box display="flex" alignItems="center" justifyContent="center" py={3}>
          {/* Grande taille pour sticker lisible */}
          <QRCodeCanvas value={url} size={220} includeMargin={true} ref={ref} />
        </Box>
        <HStack justify="space-between">
          <Button onClick={downloadPNG}>Télécharger PNG</Button>
          <Button as="a" href={url} target="_blank" rel="noreferrer">Tester</Button>
        </HStack>
      </CardBody>
    </Card>
  );
}

function sanitize(s) {
  return String(s).replace(/[^A-Za-z0-9_-]+/g, "_");
}
