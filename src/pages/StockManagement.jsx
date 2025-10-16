import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  HStack,
  VStack,
  Button,
  Input,
  Select,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  IconButton,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  FormControl,
  FormLabel,
  NumberInput,
  NumberInputField,
  Textarea,
  Card,
  CardBody,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Flex,
  Spacer,
  Text,
  useDisclosure,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
} from '@chakra-ui/react';
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiPackage,
  FiAlertTriangle,
  FiBarChart,
  FiArrowUp,
  FiArrowDown,
  FiRefreshCw,
} from 'react-icons/fi';
import { api } from '../api';

const STOCK_CATEGORIES = {
  PIECES_DETACHEES: 'Pièces détachées',
  CONSOMMABLES: 'Consommables',
  OUTILLAGE: 'Outillage',
  EQUIPEMENT: 'Équipement',
  DOCUMENTATION: 'Documentation',
  MERCHANDISING: 'Merchandising',
  FOURNITURES: 'Fournitures',
  SECURITE: 'Sécurité',
  GENERAL: 'Général',
};

const STOCK_UNITS = {
  PIECE: 'Pièce',
  KG: 'Kg',
  LITRE: 'Litre',
  METRE: 'Mètre',
  PAQUET: 'Paquet',
  BOITE: 'Boîte',
  ROULEAU: 'Rouleau',
  SET: 'Set',
  AUTRE: 'Autre',
};

const STOCK_STATUS = {
  AVAILABLE: 'Disponible',
  LOW_STOCK: 'Stock bas',
  OUT_OF_STOCK: 'Rupture',
  DISCONTINUED: 'Discontinué',
  RESERVED: 'Réservé',
};

const STATUS_COLORS = {
  AVAILABLE: 'green',
  LOW_STOCK: 'orange',
  OUT_OF_STOCK: 'red',
  DISCONTINUED: 'gray',
  RESERVED: 'blue',
};

export default function StockManagement() {
  const [stocks, setStocks] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    category: 'ALL',
    status: 'ALL',
    lowStock: false,
  });
  const [editingStock, setEditingStock] = useState(null);
  const [stockForm, setStockForm] = useState({
    reference: '',
    name: '',
    description: '',
    category: 'GENERAL',
    subcategory: '',
    quantity: 0,
    minQuantity: 0,
    unit: 'PIECE',
    location: '',
    supplier: '',
    purchasePrice: '',
    salePrice: '',
    notes: '',
  });
  const [movementForm, setMovementForm] = useState({
    type: 'IN',
    quantity: 1,
    reason: '',
    notes: '',
  });
  const [selectedStock, setSelectedStock] = useState(null);

  const toast = useToast();
  const { isOpen: isStockModalOpen, onOpen: onStockModalOpen, onClose: onStockModalClose } = useDisclosure();
  const { isOpen: isMovementModalOpen, onOpen: onMovementModalOpen, onClose: onMovementModalClose } = useDisclosure();
  const { isOpen: isDeleteAlertOpen, onOpen: onDeleteAlertOpen, onClose: onDeleteAlertClose } = useDisclosure();

  // Charger les données
  useEffect(() => {
    fetchStocks();
    fetchStats();
  }, [filters]);

  const fetchStocks = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.category !== 'ALL') params.append('category', filters.category);
      if (filters.status !== 'ALL') params.append('status', filters.status);
      if (filters.lowStock) params.append('lowStock', 'true');

      const response = await api.get(`/api/stocks?${params.toString()}`);
      setStocks(response.data.stocks || []);
    } catch (error) {
      console.error('Erreur lors du chargement des stocks:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les stocks',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/api/stocks/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    }
  };

  const handleCreateStock = () => {
    setEditingStock(null);
    setStockForm({
      reference: '',
      name: '',
      description: '',
      category: 'GENERAL',
      subcategory: '',
      quantity: 0,
      minQuantity: 0,
      unit: 'PIECE',
      location: '',
      supplier: '',
      purchasePrice: '',
      salePrice: '',
      notes: '',
    });
    onStockModalOpen();
  };

  const handleEditStock = (stock) => {
    setEditingStock(stock);
    setStockForm({
      reference: stock.reference || '',
      name: stock.name || '',
      description: stock.description || '',
      category: stock.category || 'GENERAL',
      subcategory: stock.subcategory || '',
      quantity: stock.quantity || 0,
      minQuantity: stock.minQuantity || 0,
      unit: stock.unit || 'PIECE',
      location: stock.location || '',
      supplier: stock.supplier || '',
      purchasePrice: stock.purchasePrice || '',
      salePrice: stock.salePrice || '',
      notes: stock.notes || '',
    });
    onStockModalOpen();
  };

  const handleSaveStock = async () => {
    try {
      const method = editingStock ? 'put' : 'post';
      const url = editingStock ? `/api/stocks/${editingStock.id}` : '/api/stocks';
      
      await api[method](url, stockForm);
      
      toast({
        title: 'Succès',
        description: `Article ${editingStock ? 'modifié' : 'créé'} avec succès`,
        status: 'success',
        duration: 3000,
      });
      
      onStockModalClose();
      fetchStocks();
      fetchStats();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder l\'article',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleDeleteStock = async () => {
    if (!selectedStock) return;
    
    try {
      await api.delete(`/api/stocks/${selectedStock.id}`);
      toast({
        title: 'Succès',
        description: 'Article supprimé avec succès',
        status: 'success',
        duration: 3000,
      });
      onDeleteAlertClose();
      setSelectedStock(null);
      fetchStocks();
      fetchStats();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer l\'article',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleMovement = async () => {
    if (!selectedStock) return;
    
    try {
      await api.post(`/api/stocks/${selectedStock.id}/movement`, movementForm);
      toast({
        title: 'Succès',
        description: 'Mouvement enregistré avec succès',
        status: 'success',
        duration: 3000,
      });
      onMovementModalClose();
      setMovementForm({
        type: 'IN',
        quantity: 1,
        reason: '',
        notes: '',
      });
      fetchStocks();
      fetchStats();
    } catch (error) {
      console.error('Erreur lors du mouvement:', error);
      toast({
        title: 'Erreur',
        description: error.response?.data?.error || 'Impossible d\'enregistrer le mouvement',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const openMovementModal = (stock) => {
    setSelectedStock(stock);
    setMovementForm({
      type: 'IN',
      quantity: 1,
      reason: '',
      notes: '',
    });
    onMovementModalOpen();
  };

  const confirmDelete = (stock) => {
    setSelectedStock(stock);
    onDeleteAlertOpen();
  };

  const filteredStats = {
    totalItems: stats.totalItems || 0,
    totalQuantity: stats.totalQuantity || 0,
    lowStockCount: stats.lowStockCount || 0,
    outOfStockCount: stats.outOfStockCount || 0,
  };

  return (
    <Box p={6}>
      <Flex align="center" mb={6}>
        <Heading size="lg" color="teal.600">
          Gestion des Stocks
        </Heading>
        <Spacer />
        <Button leftIcon={<FiPlus />} colorScheme="teal" onClick={handleCreateStock}>
          Nouvel article
        </Button>
      </Flex>

      {/* Statistiques */}
      <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4} mb={6}>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Articles totaux</StatLabel>
              <StatNumber>{filteredStats.totalItems}</StatNumber>
              <StatHelpText>
                <FiPackage style={{ display: 'inline', marginRight: '4px' }} />
                Articles référencés
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>
        
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Quantité totale</StatLabel>
              <StatNumber>{filteredStats.totalQuantity}</StatNumber>
              <StatHelpText>
                <FiBarChart style={{ display: 'inline', marginRight: '4px' }} />
                Unités en stock
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>
        
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Stock bas</StatLabel>
              <StatNumber color="orange.500">{filteredStats.lowStockCount}</StatNumber>
              <StatHelpText>
                <FiAlertTriangle style={{ display: 'inline', marginRight: '4px' }} />
                À réapprovisionner
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>
        
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Ruptures</StatLabel>
              <StatNumber color="red.500">{filteredStats.outOfStockCount}</StatNumber>
              <StatHelpText>
                <FiRefreshCw style={{ display: 'inline', marginRight: '4px' }} />
                Stock épuisé
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Filtres */}
      <Card mb={6}>
        <CardBody>
          <HStack spacing={4} wrap="wrap">
            <Input
              placeholder="Rechercher..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              maxW="300px"
            />
            
            <Select
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              maxW="200px"
            >
              <option value="ALL">Toutes catégories</option>
              {Object.entries(STOCK_CATEGORIES).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </Select>
            
            <Select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              maxW="200px"
            >
              <option value="ALL">Tous statuts</option>
              {Object.entries(STOCK_STATUS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </Select>
            
            <Button
              variant={filters.lowStock ? 'solid' : 'outline'}
              colorScheme="orange"
              onClick={() => setFilters(prev => ({ ...prev, lowStock: !prev.lowStock }))}
            >
              Stock bas uniquement
            </Button>
          </HStack>
        </CardBody>
      </Card>

      {/* Tableau des stocks */}
      <Card>
        <CardBody>
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Référence</Th>
                <Th>Nom</Th>
                <Th>Catégorie</Th>
                <Th>Quantité</Th>
                <Th>Unité</Th>
                <Th>Statut</Th>
                <Th>Emplacement</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {loading ? (
                <Tr>
                  <Td colSpan={8} textAlign="center">Chargement...</Td>
                </Tr>
              ) : stocks.length === 0 ? (
                <Tr>
                  <Td colSpan={8} textAlign="center">Aucun article trouvé</Td>
                </Tr>
              ) : (
                stocks.map((stock) => (
                  <Tr key={stock.id}>
                    <Td>{stock.reference || '-'}</Td>
                    <Td>
                      <VStack align="start" spacing={1}>
                        <Text fontWeight="medium">{stock.name}</Text>
                        {stock.description && (
                          <Text fontSize="sm" color="gray.600" noOfLines={1}>
                            {stock.description}
                          </Text>
                        )}
                      </VStack>
                    </Td>
                    <Td>{STOCK_CATEGORIES[stock.category]}</Td>
                    <Td>
                      <VStack align="start" spacing={1}>
                        <Text
                          color={stock.quantity <= stock.minQuantity ? 'red.500' : 'inherit'}
                          fontWeight={stock.quantity <= stock.minQuantity ? 'bold' : 'normal'}
                        >
                          {stock.quantity}
                        </Text>
                        {stock.minQuantity > 0 && (
                          <Text fontSize="xs" color="gray.500">
                            Min: {stock.minQuantity}
                          </Text>
                        )}
                      </VStack>
                    </Td>
                    <Td>{STOCK_UNITS[stock.unit]}</Td>
                    <Td>
                      <Badge colorScheme={STATUS_COLORS[stock.status]}>
                        {STOCK_STATUS[stock.status]}
                      </Badge>
                    </Td>
                    <Td>{stock.location || '-'}</Td>
                    <Td>
                      <HStack spacing={2}>
                        <IconButton
                          icon={<FiEdit2 />}
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditStock(stock)}
                          aria-label="Modifier"
                        />
                        <IconButton
                          icon={<FiArrowUp />}
                          size="sm"
                          colorScheme="green"
                          variant="outline"
                          onClick={() => openMovementModal(stock)}
                          aria-label="Mouvement de stock"
                        />
                        <IconButton
                          icon={<FiTrash2 />}
                          size="sm"
                          colorScheme="red"
                          variant="outline"
                          onClick={() => confirmDelete(stock)}
                          aria-label="Supprimer"
                        />
                      </HStack>
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </CardBody>
      </Card>

      {/* Modal Création/Édition Stock */}
      <Modal isOpen={isStockModalOpen} onClose={onStockModalClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {editingStock ? 'Modifier l\'article' : 'Nouvel article'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <HStack spacing={4} w="full">
                <FormControl>
                  <FormLabel>Référence</FormLabel>
                  <Input
                    value={stockForm.reference}
                    onChange={(e) => setStockForm(prev => ({ ...prev, reference: e.target.value }))}
                    placeholder="REF-001"
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Nom</FormLabel>
                  <Input
                    value={stockForm.name}
                    onChange={(e) => setStockForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nom de l'article"
                  />
                </FormControl>
              </HStack>

              <FormControl>
                <FormLabel>Description</FormLabel>
                <Textarea
                  value={stockForm.description}
                  onChange={(e) => setStockForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Description détaillée"
                />
              </FormControl>

              <HStack spacing={4} w="full">
                <FormControl>
                  <FormLabel>Catégorie</FormLabel>
                  <Select
                    value={stockForm.category}
                    onChange={(e) => setStockForm(prev => ({ ...prev, category: e.target.value }))}
                  >
                    {Object.entries(STOCK_CATEGORIES).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>Sous-catégorie</FormLabel>
                  <Input
                    value={stockForm.subcategory}
                    onChange={(e) => setStockForm(prev => ({ ...prev, subcategory: e.target.value }))}
                    placeholder="Sous-catégorie"
                  />
                </FormControl>
              </HStack>

              <HStack spacing={4} w="full">
                <FormControl>
                  <FormLabel>Quantité</FormLabel>
                  <NumberInput
                    value={stockForm.quantity}
                    onChange={(value) => setStockForm(prev => ({ ...prev, quantity: parseInt(value) || 0 }))}
                  >
                    <NumberInputField />
                  </NumberInput>
                </FormControl>
                <FormControl>
                  <FormLabel>Quantité minimale</FormLabel>
                  <NumberInput
                    value={stockForm.minQuantity}
                    onChange={(value) => setStockForm(prev => ({ ...prev, minQuantity: parseInt(value) || 0 }))}
                  >
                    <NumberInputField />
                  </NumberInput>
                </FormControl>
                <FormControl>
                  <FormLabel>Unité</FormLabel>
                  <Select
                    value={stockForm.unit}
                    onChange={(e) => setStockForm(prev => ({ ...prev, unit: e.target.value }))}
                  >
                    {Object.entries(STOCK_UNITS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </Select>
                </FormControl>
              </HStack>

              <HStack spacing={4} w="full">
                <FormControl>
                  <FormLabel>Emplacement</FormLabel>
                  <Input
                    value={stockForm.location}
                    onChange={(e) => setStockForm(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Étagère A1, Atelier..."
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Fournisseur</FormLabel>
                  <Input
                    value={stockForm.supplier}
                    onChange={(e) => setStockForm(prev => ({ ...prev, supplier: e.target.value }))}
                    placeholder="Nom du fournisseur"
                  />
                </FormControl>
              </HStack>

              <HStack spacing={4} w="full">
                <FormControl>
                  <FormLabel>Prix d'achat (€)</FormLabel>
                  <NumberInput
                    value={stockForm.purchasePrice}
                    onChange={(value) => setStockForm(prev => ({ ...prev, purchasePrice: value }))}
                    precision={2}
                  >
                    <NumberInputField />
                  </NumberInput>
                </FormControl>
                <FormControl>
                  <FormLabel>Prix de vente (€)</FormLabel>
                  <NumberInput
                    value={stockForm.salePrice}
                    onChange={(value) => setStockForm(prev => ({ ...prev, salePrice: value }))}
                    precision={2}
                  >
                    <NumberInputField />
                  </NumberInput>
                </FormControl>
              </HStack>

              <FormControl>
                <FormLabel>Notes</FormLabel>
                <Textarea
                  value={stockForm.notes}
                  onChange={(e) => setStockForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Notes diverses"
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onStockModalClose}>
              Annuler
            </Button>
            <Button colorScheme="teal" onClick={handleSaveStock}>
              {editingStock ? 'Modifier' : 'Créer'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal Mouvement de Stock */}
      <Modal isOpen={isMovementModalOpen} onClose={onMovementModalClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            Mouvement de stock - {selectedStock?.name}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Type de mouvement</FormLabel>
                <Select
                  value={movementForm.type}
                  onChange={(e) => setMovementForm(prev => ({ ...prev, type: e.target.value }))}
                >
                  <option value="IN">Entrée (IN)</option>
                  <option value="OUT">Sortie (OUT)</option>
                  <option value="ADJUSTMENT">Correction (ADJUSTMENT)</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Quantité</FormLabel>
                <NumberInput
                  value={movementForm.quantity}
                  onChange={(value) => setMovementForm(prev => ({ ...prev, quantity: parseInt(value) || 1 }))}
                >
                  <NumberInputField />
                </NumberInput>
                {selectedStock && (
                  <Text fontSize="sm" color="gray.600">
                    Stock actuel: {selectedStock.quantity} {STOCK_UNITS[selectedStock.unit]}
                  </Text>
                )}
              </FormControl>

              <FormControl>
                <FormLabel>Raison</FormLabel>
                <Input
                  value={movementForm.reason}
                  onChange={(e) => setMovementForm(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Achat, utilisation, correction..."
                />
              </FormControl>

              <FormControl>
                <FormLabel>Notes</FormLabel>
                <Textarea
                  value={movementForm.notes}
                  onChange={(e) => setMovementForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Notes sur ce mouvement"
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onMovementModalClose}>
              Annuler
            </Button>
            <Button colorScheme="teal" onClick={handleMovement}>
              Enregistrer
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* AlertDialog Suppression */}
      <AlertDialog
        isOpen={isDeleteAlertOpen}
        onClose={onDeleteAlertClose}
        leastDestructiveRef={React.useRef()}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader>Confirmer la suppression</AlertDialogHeader>
            <AlertDialogBody>
              Êtes-vous sûr de vouloir supprimer l'article "{selectedStock?.name}" ?
              Cette action est irréversible.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button onClick={onDeleteAlertClose}>
                Annuler
              </Button>
              <Button colorScheme="red" onClick={handleDeleteStock} ml={3}>
                Supprimer
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
}