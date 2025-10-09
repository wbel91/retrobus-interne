import React, { useState, useEffect } from 'react';
import {
  Box, Button, VStack, HStack, Heading, Text, Table, Thead, Tbody, Tr, Th, Td,
  Badge, IconButton, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody,
  ModalFooter, ModalCloseButton, FormControl, FormLabel, Input, Textarea,
  useDisclosure, useToast, Spinner, Center, Alert, AlertIcon, Tabs, TabList,
  Tab, TabPanels, TabPanel, Progress, Stat, StatLabel, StatNumber, StatGroup,
  Accordion, AccordionItem, AccordionButton, AccordionPanel, AccordionIcon,
  Code, Divider
} from '@chakra-ui/react';
import { 
  FiPlus, FiEye, FiSend, FiEdit, FiTrash2, FiMail, FiBarChart3, 
  FiClock, FiCheck, FiX, FiRefreshCw 
} from 'react-icons/fi';
import { useUser } from '../context/UserContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function NewsletterCampaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    content: '',
    scheduledAt: ''
  });
  const [testEmail, setTestEmail] = useState('');
  const [previewContent, setPreviewContent] = useState(null);
  const [sendingCampaign, setSendingCampaign] = useState(null);
  const [campaignStats, setCampaignStats] = useState({});

  const { token } = useUser();
  const toast = useToast();
  const { isOpen: isCreateOpen, onOpen: onCreateOpen, onClose: onCreateClose } = useDisclosure();
  const { isOpen: isPreviewOpen, onOpen: onPreviewOpen, onClose: onPreviewClose } = useDisclosure();
  const { isOpen: isStatsOpen, onOpen: onStatsOpen, onClose: onStatsClose } = useDisclosure();

  // Charger les campagnes
  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/newsletter/campaigns`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erreur chargement');
      const data = await res.json();
      setCampaigns(data);
    } catch (e) {
      toast({ status: 'error', title: 'Erreur', description: 'Impossible de charger les campagnes' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchCampaigns();
  }, [token]);

  // Créer une nouvelle campagne
  const handleCreateCampaign = async () => {
    if (!formData.title || !formData.subject || !formData.content) {
      toast({ status: 'error', title: 'Erreur', description: 'Tous les champs sont requis' });
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/newsletter/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!res.ok) throw new Error('Erreur création');
      
      toast({ status: 'success', title: 'Succès', description: 'Campagne créée avec succès' });
      setFormData({ title: '', subject: '', content: '', scheduledAt: '' });
      onCreateClose();
      fetchCampaigns();
    } catch (e) {
      toast({ status: 'error', title: 'Erreur', description: 'Impossible de créer la campagne' });
    }
  };

  // Prévisualiser une campagne
  const handlePreview = async (campaignId) => {
    try {
      const res = await fetch(`${API_BASE}/newsletter/campaigns/${campaignId}/preview`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erreur prévisualisation');
      const data = await res.json();
      setPreviewContent(data);
      onPreviewOpen();
    } catch (e) {
      toast({ status: 'error', title: 'Erreur', description: 'Impossible de prévisualiser' });
    }
  };

  // Envoyer un email de test
  const handleSendTest = async (campaignId) => {
    if (!testEmail) {
      toast({ status: 'error', title: 'Erreur', description: 'Email de test requis' });
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/newsletter/campaigns/${campaignId}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email: testEmail })
      });

      if (!res.ok) throw new Error('Erreur envoi test');
      
      toast({ status: 'success', title: 'Test envoyé', description: `Email de test envoyé à ${testEmail}` });
      setTestEmail('');
    } catch (e) {
      toast({ status: 'error', title: 'Erreur', description: 'Impossible d\'envoyer le test' });
    }
  };

  // Envoyer une campagne
  const handleSendCampaign = async (campaignId) => {
    if (!confirm('Êtes-vous sûr de vouloir envoyer cette campagne ? Cette action est irréversible.')) {
      return;
    }

    setSendingCampaign(campaignId);
    
    try {
      // D'abord préparer l'envoi
      const prepareRes = await fetch(`${API_BASE}/newsletter/campaigns/${campaignId}/prepare`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!prepareRes.ok) throw new Error('Erreur préparation');
      const prepareData = await prepareRes.json();
      
      toast({ 
        status: 'info', 
        title: 'Préparation terminée', 
        description: `${prepareData.preparedSends} emails préparés. Envoi en cours...` 
      });

      // Puis envoyer
      const sendRes = await fetch(`${API_BASE}/newsletter/campaigns/${campaignId}/send`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!sendRes.ok) throw new Error('Erreur envoi');
      const sendData = await sendRes.json();

      toast({ 
        status: 'success', 
        title: 'Envoi terminé', 
        description: `${sendData.success} emails envoyés avec succès, ${sendData.errors} erreurs`
      });

      fetchCampaigns();
    } catch (e) {
      toast({ status: 'error', title: 'Erreur', description: 'Impossible d\'envoyer la campagne' });
    } finally {
      setSendingCampaign(null);
    }
  };

  // Récupérer les statistiques d'une campagne
  const handleShowStats = async (campaign) => {
    setSelectedCampaign(campaign);
    
    try {
      const res = await fetch(`${API_BASE}/newsletter/campaigns/${campaign.id}/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erreur stats');
      const stats = await res.json();
      setCampaignStats(stats);
      onStatsOpen();
    } catch (e) {
      toast({ status: 'error', title: 'Erreur', description: 'Impossible de charger les statistiques' });
    }
  };

  // Supprimer une campagne
  const handleDeleteCampaign = async (campaignId, title) => {
    if (!confirm(`Supprimer définitivement la campagne "${title}" ?`)) return;

    try {
      const res = await fetch(`${API_BASE}/newsletter/campaigns/${campaignId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Erreur suppression');
      
      toast({ status: 'success', title: 'Supprimé', description: 'Campagne supprimée avec succès' });
      fetchCampaigns();
    } catch (e) {
      toast({ status: 'error', title: 'Erreur', description: 'Impossible de supprimer la campagne' });
    }
  };

  const getStatusBadge = (status) => {
    const configs = {
      DRAFT: { color: 'gray', text: 'Brouillon' },
      SENDING: { color: 'blue', text: 'En cours' },
      SENT: { color: 'green', text: 'Envoyé' },
      CANCELLED: { color: 'red', text: 'Annulé' }
    };
    const config = configs[status] || configs.DRAFT;
    return <Badge colorScheme={config.color}>{config.text}</Badge>;
  };

  // Templates d'emails prédéfinis
  const emailTemplates = {
    event: {
      title: 'Nouvel événement',
      subject: '🚌 Nouveau événement RétroBus Essonne !',
      content: `
        <h2>🎉 Nouvel événement à ne pas manquer !</h2>
        <p>Chers passionnés de véhicules d'époque,</p>
        <p>Nous avons le plaisir de vous annoncer un nouvel événement organisé par l'association RétroBus Essonne :</p>
        
        <h3>📅 [Nom de l'événement]</h3>
        <p><strong>Date :</strong> [Date]<br>
        <strong>Lieu :</strong> [Lieu]<br>
        <strong>Heure :</strong> [Heure]</p>
        
        <p>[Description de l'événement]</p>
        
        <a href="#" class="button">S'inscrire à l'événement</a>
        
        <p>Au plaisir de vous retrouver nombreux !</p>
        <p><strong>L'équipe RétroBus Essonne</strong></p>
      `
    },
    news: {
      title: 'Actualités du parc',
      subject: '📰 Actualités RétroBus Essonne',
      content: `
        <h2>📰 Les dernières nouvelles de notre parc</h2>
        <p>Bonjour à tous,</p>
        <p>Voici les dernières actualités de l'association RétroBus Essonne :</p>
        
        <h3>🚌 Nouveau véhicule au parc</h3>
        <p>[Informations sur le nouveau véhicule]</p>
        
        <h3>🔧 Travaux de restauration</h3>
        <p>[Avancement des travaux]</p>
        
        <h3>📸 Retour en images</h3>
        <p>[Galerie photos récente]</p>
        
        <a href="#" class="button">Voir toutes les actualités</a>
        
        <p>Merci pour votre soutien !</p>
        <p><strong>L'équipe RétroBus Essonne</strong></p>
      `
    }
  };

  return (
    <Box p={6}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <HStack justify="space-between">
          <VStack align="start" spacing={1}>
            <Heading size="lg">📧 Campagnes Newsletter</Heading>
            <Text fontSize="sm" color="gray.600">
              Créez et gérez vos campagnes d'emailing
            </Text>
          </VStack>
          <HStack>
            <Button
              leftIcon={<FiRefreshCw />}
              onClick={fetchCampaigns}
              isLoading={loading}
              variant="outline"
              size="sm"
            >
              Actualiser
            </Button>
            <Button
              leftIcon={<FiPlus />}
              colorScheme="blue"
              onClick={onCreateOpen}
            >
              Nouvelle campagne
            </Button>
          </HStack>
        </HStack>

        {/* Liste des campagnes */}
        <Box borderWidth="1px" borderRadius="lg" overflow="hidden">
          {loading ? (
            <Center py={10}>
              <Spinner size="lg" />
            </Center>
          ) : campaigns.length === 0 ? (
            <Center py={10}>
              <VStack>
                <Text fontSize="lg">📭</Text>
                <Text color="gray.500">Aucune campagne créée</Text>
                <Button leftIcon={<FiPlus />} colorScheme="blue" size="sm" onClick={onCreateOpen}>
                  Créer votre première campagne
                </Button>
              </VStack>
            </Center>
          ) : (
            <Table>
              <Thead bg="gray.50">
                <Tr>
                  <Th>Campagne</Th>
                  <Th>Statut</Th>
                  <Th>Créée le</Th>
                  <Th>Abonnés</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {campaigns.map(campaign => (
                  <Tr key={campaign.id}>
                    <Td>
                      <VStack align="start" spacing={1}>
                        <Text fontWeight="semibold">{campaign.title}</Text>
                        <Text fontSize="sm" color="gray.600" isTruncated maxW="300px">
                          {campaign.subject}
                        </Text>
                      </VStack>
                    </Td>
                    <Td>{getStatusBadge(campaign.status)}</Td>
                    <Td>
                      <Text fontSize="sm">
                        {new Date(campaign.createdAt).toLocaleDateString('fr-FR')}
                      </Text>
                    </Td>
                    <Td>
                      <Text fontSize="sm">
                        {campaign.totalSent || campaign._count?.sends || 0}
                      </Text>
                    </Td>
                    <Td>
                      <HStack spacing={1}>
                        <IconButton
                          aria-label="Prévisualiser"
                          icon={<FiEye />}
                          size="sm"
                          variant="ghost"
                          onClick={() => handlePreview(campaign.id)}
                        />
                        
                        {campaign.status === 'DRAFT' && (
                          <>
                            <IconButton
                              aria-label="Envoyer"
                              icon={<FiSend />}
                              size="sm"
                              colorScheme="green"
                              variant="ghost"
                              onClick={() => handleSendCampaign(campaign.id)}
                              isLoading={sendingCampaign === campaign.id}
                            />
                            <IconButton
                              aria-label="Supprimer"
                              icon={<FiTrash2 />}
                              size="sm"
                              colorScheme="red"
                              variant="ghost"
                              onClick={() => handleDeleteCampaign(campaign.id, campaign.title)}
                            />
                          </>
                        )}
                        
                        {campaign.status === 'SENT' && (
                          <IconButton
                            aria-label="Statistiques"
                            icon={<FiBarChart3 />}
                            size="sm"
                            colorScheme="purple"
                            variant="ghost"
                            onClick={() => handleShowStats(campaign)}
                          />
                        )}
                      </HStack>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Box>
      </VStack>

      {/* Modal création campagne */}
      <Modal isOpen={isCreateOpen} onClose={onCreateClose} size="xl">
        <ModalOverlay />
        <ModalContent maxH="90vh" overflowY="auto">
          <ModalHeader>📝 Nouvelle campagne newsletter</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Titre de la campagne</FormLabel>
                <Input
                  placeholder="ex: Newsletter mensuelle octobre 2025"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Sujet de l'email</FormLabel>
                <Input
                  placeholder="ex: 🚌 Actualités RétroBus Essonne - Octobre 2025"
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                />
              </FormControl>

              {/* Templates prédéfinis */}
              <Accordion allowToggle w="100%">
                <AccordionItem>
                  <AccordionButton>
                    <Box flex="1" textAlign="left">
                      🎨 Utiliser un template prédéfini
                    </Box>
                    <AccordionIcon />
                  </AccordionButton>
                  <AccordionPanel>
                    <VStack spacing={2}>
                      {Object.entries(emailTemplates).map(([key, template]) => (
                        <Button
                          key={key}
                          size="sm"
                          variant="outline"
                          w="100%"
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            title: template.title,
                            subject: template.subject,
                            content: template.content
                          }))}
                        >
                          {template.title}
                        </Button>
                      ))}
                    </VStack>
                  </AccordionPanel>
                </AccordionItem>
              </Accordion>

              <FormControl>
                <FormLabel>Contenu HTML</FormLabel>
                <Textarea
                  placeholder="Contenu de votre newsletter en HTML..."
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  rows={15}
                  fontFamily="monospace"
                  fontSize="sm"
                />
                <Text fontSize="xs" color="gray.500" mt={1}>
                  Vous pouvez utiliser du HTML pour formater votre contenu
                </Text>
              </FormControl>

              <Alert status="info" fontSize="sm">
                <AlertIcon />
                <VStack align="start" spacing={1}>
                  <Text fontWeight="semibold">💡 Conseils</Text>
                  <Text>• Utilisez des titres avec &lt;h2&gt; et &lt;h3&gt;</Text>
                  <Text>• Ajoutez des liens avec &lt;a href="#" class="button"&gt;Texte&lt;/a&gt;</Text>
                  <Text>• Séparez les sections avec des paragraphes &lt;p&gt;</Text>
                </VStack>
              </Alert>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onCreateClose}>
              Annuler
            </Button>
            <Button colorScheme="blue" onClick={handleCreateCampaign}>
              Créer la campagne
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal prévisualisation */}
      <Modal isOpen={isPreviewOpen} onClose={onPreviewClose} size="xl">
        <ModalOverlay />
        <ModalContent maxH="90vh">
          <ModalHeader>👁️ Prévisualisation de la campagne</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {previewContent && (
              <VStack spacing={4} align="stretch">
                <FormControl>
                  <FormLabel>Sujet</FormLabel>
                  <Code p={2} w="100%">{previewContent.subject}</Code>
                </FormControl>

                <Divider />

                <VStack spacing={2}>
                  <Text fontWeight="semibold">Aperçu de l'email :</Text>
                  <Box
                    border="1px solid"
                    borderColor="gray.200"
                    borderRadius="md"
                    h="400px"
                    w="100%"
                    overflow="auto"
                  >
                    <iframe
                      srcDoc={previewContent.html}
                      style={{ width: '100%', height: '100%', border: 'none' }}
                      title="Prévisualisation email"
                    />
                  </Box>
                </VStack>

                <Divider />

                <FormControl>
                  <FormLabel>Envoyer un test à :</FormLabel>
                  <HStack>
                    <Input
                      placeholder="votre-email@test.com"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                    />
                    <Button
                      leftIcon={<FiMail />}
                      colorScheme="orange"
                      onClick={() => handleSendTest(selectedCampaign?.id)}
                      isDisabled={!testEmail}
                    >
                      Envoyer le test
                    </Button>
                  </HStack>
                </FormControl>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button onClick={onPreviewClose}>Fermer</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal statistiques */}
      <Modal isOpen={isStatsOpen} onClose={onStatsClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>📊 Statistiques de la campagne</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedCampaign && (
              <VStack spacing={6}>
                <VStack align="start" w="100%">
                  <Text fontWeight="semibold">{selectedCampaign.title}</Text>
                  <Text fontSize="sm" color="gray.600">{selectedCampaign.subject}</Text>
                  <Text fontSize="sm" color="gray.500">
                    Envoyée le {new Date(selectedCampaign.sentAt).toLocaleDateString('fr-FR')}
                  </Text>
                </VStack>

                <StatGroup w="100%">
                  <Stat>
                    <StatLabel>Envoyés</StatLabel>
                    <StatNumber color="blue.500">{campaignStats.sent || 0}</StatNumber>
                  </Stat>
                  <Stat>
                    <StatLabel>Échecs</StatLabel>
                    <StatNumber color="red.500">{campaignStats.failed || 0}</StatNumber>
                  </Stat>
                  <Stat>
                    <StatLabel>Ouvertures</StatLabel>
                    <StatNumber color="green.500">{campaignStats.opened || 0}</StatNumber>
                  </Stat>
                </StatGroup>

                {(campaignStats.sent > 0) && (
                  <Box w="100%">
                    <Text fontSize="sm" mb={2}>Taux de réussite</Text>
                    <Progress
                      value={(campaignStats.sent / (campaignStats.sent + campaignStats.failed)) * 100}
                      colorScheme="green"
                      size="lg"
                    />
                    <Text fontSize="xs" color="gray.500" mt={1}>
                      {Math.round((campaignStats.sent / (campaignStats.sent + campaignStats.failed)) * 100)}% des emails ont été envoyés avec succès
                    </Text>
                  </Box>
                )}
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button onClick={onStatsClose}>Fermer</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}